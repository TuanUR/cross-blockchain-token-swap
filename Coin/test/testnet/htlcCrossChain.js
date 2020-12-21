const fs = require('fs')

let secrets

if(fs.existsSync('secret.json')) {
  secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8'))
}

const Web3 = require("web3")
const providerGoerli = new Web3.providers.HttpProvider('https://goerli.infura.io/v3/' + secrets.infuraApiKey)
const providerRinkeby = new Web3.providers.HttpProvider('https://rinkeby.infura.io/v3/' + secrets.infuraApiKey)

const AnnaERC20Token = artifacts.require("AnnaERC20")
const BenERC20Token = artifacts.require("BenERC20")
const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20")

const Tx = require('ethereumjs-tx').Transaction

const privateKeyBen = Buffer.from(secrets.privateKeyBen, 'hex')
const privateKeyAnna = Buffer.from(secrets.privateKeyAnna, 'hex')

const annaAbi = JSON.parse(fs.readFileSync('./build/contracts/AnnaERC20.json', 'utf8'))
const benAbi = JSON.parse(fs.readFileSync('./build/contracts/BenERC20.json', 'utf8'))
const htlcAbi = JSON.parse(fs.readFileSync('./build/contracts/HashedTimelockERC20.json', 'utf8'))

const promisify = require('util').promisify
const sleep = promisify(require('timers').setTimeout)

contract("Test for Cross Chain Swap", () => {
    let Anna
    let Ben

    let htlcGoerli
    let htlcRinkeby
    let AnnaERC20
    let BenERC20

    let annaBalanceGoerli
    let annaBalanceRinkeby
    let benBalanceGoerli
    let benBalanceRinkeby
    let htlcBalanceGoerli
    let htlcBalanceRinkeby

    const tokenAmount = 5
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee"
    const secretKey = "Cross-Blockchain Token Swap mit Ethereum"
    let publicSecret

    let annaContractId
    let benContractId

    let annaERC20Contract
    let benERC20Contract
    let goerliContract
    let rinkebyContract

    before(async () => {
        const acc = await web3.eth.getAccounts()
        Anna = acc[0]
        Ben = acc[1]

        await AnnaERC20Token.setProvider(providerGoerli)
        AnnaERC20 = await AnnaERC20Token.deployed()

        await HashedTimelockERC20.setProvider(providerGoerli) 
        htlcGoerli = await HashedTimelockERC20.at("0x07e6aA84d916D08073c87357B76acF141296cD17")

        await BenERC20Token.setProvider(providerRinkeby)
        BenERC20 = await BenERC20Token.deployed()

        await HashedTimelockERC20.setProvider(providerRinkeby)
        htlcRinkeby = await HashedTimelockERC20.at("0x335E601Bdd7bb5b13794B7edB1F509D1B6fE2c1d")
    })

    it("initialization of web3 for Goerli", async () => {
        const web3 = new Web3(providerGoerli)
        annaERC20Contract = new web3.eth.Contract(annaAbi.abi, AnnaERC20.address)
        goerliContract = new web3.eth.Contract(htlcAbi.abi, htlcGoerli.address)
    })

    it("initialization of web3 for Rinkeby", async () => {
        const web3 = new Web3(providerRinkeby)
        benERC20Contract = new web3.eth.Contract(benAbi.abi, BenERC20.address)
        rinkebyContract = new web3.eth.Contract(htlcAbi.abi, htlcRinkeby.address)
    })

    it("show balances of Anna and Ben on Goerli and Rinkeby", async () => {
        annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
        console.log("Anna goerli: " + annaBalanceGoerli)
        benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
        console.log("Ben goerli: " + benBalanceGoerli)
        htlcBalanceGoerli =  await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()
        console.log("HTLC goerli: " + htlcBalanceGoerli)

        benBalanceRinkeby = await benERC20Contract.methods.balanceOf(Ben).call()
        console.log("Ben rinkeby: " + benBalanceRinkeby)
        annaBalanceRinkeby = await benERC20Contract.methods.balanceOf(Anna).call()
        console.log("Anna rinkeby: " + annaBalanceRinkeby)
        htlcBalanceRinkeby = await benERC20Contract.methods.balanceOf(htlcRinkeby.address).call()
        console.log("HTLC rinkeby: " + htlcBalanceRinkeby)
    })

    describe("Anna and Ben do a successful token swap on Goerli and Rinkeby", function () {

        it("approve and setSwap() from Anna works on Goerli", async function () {
            //this.timeout(0)
            const web3 = new Web3(providerGoerli)

            const txCountApprove = await web3.eth.getTransactionCount(Anna, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: AnnaERC20.address,
                from: Anna,
                data: annaERC20Contract.methods.approve(htlcGoerli.address, tokenAmount).encodeABI()
            }

            var txApprove = new Tx(txDataApprove, {'chain':'goerli'})
            txApprove.sign(privateKeyAnna)
            var serializedTxApprove = txApprove.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // send setSwap()

            const txCountSetSwap = await web3.eth.getTransactionCount(Anna, "pending")

            const timelock = (Math.floor(Date.now() / 1000)) + 300

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'goerli'})
            txSetSwap.sign(privateKeyAnna)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined) {
                await sleep(1000)
                showEvent = await goerliContract.getPastEvents("newSwap", { 
                    filter: {sender: Anna, receiver: Ben}
                })
            }
            console.log(showEvent[0].returnValues.contractId)
            annaContractId = showEvent[0].returnValues.contractId

            const annaBalanceNow = await annaERC20Contract.methods.balanceOf(Anna).call()
            const benBalanceNow = await annaERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()

            assert.equal(annaBalanceNow, annaBalanceGoerli - tokenAmount)
            assert.equal(benBalanceNow, benBalanceGoerli)
            assert.equal(htlcBalance, htlcBalanceGoerli - (-tokenAmount))
        })

        it("approve and setSwap() from Ben works on Rinkeby", async function () {
            //this.timeout(0)
            const web3 = new Web3(providerRinkeby)

            const txCountApprove = await web3.eth.getTransactionCount(Ben, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: BenERC20.address,
                from: Ben,
                data: benERC20Contract.methods.approve(htlcRinkeby.address, tokenAmount).encodeABI()
            }

            var txApprove = new Tx(txDataApprove, {'chain':'rinkeby'})
            txApprove.sign(privateKeyBen)
            var serializedTxApprove = txApprove.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // send setSwap()

            const txCountSetSwap = await web3.eth.getTransactionCount(Ben, "pending")

            const timelock = (Math.floor(Date.now() / 1000)) + 180

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcRinkeby.address,
                from: Ben,
                data: rinkebyContract.methods.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'rinkeby'})
            txSetSwap.sign(privateKeyBen)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined){
                await sleep(1000)
                showEvent = await rinkebyContract.getPastEvents("newSwap", {
                    filter: {sender: Ben, receiver: Anna}
                })
            }
            console.log(showEvent[0].returnValues.contractId)
            benContractId = showEvent[0].returnValues.contractId

            const annaBalanceNow = await benERC20Contract.methods.balanceOf(Anna).call()
            const benBalanceNow = await benERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await benERC20Contract.methods.balanceOf(htlcRinkeby.address).call()

            assert.equal(annaBalanceNow, annaBalanceRinkeby)
            assert.equal(benBalanceNow, benBalanceRinkeby - tokenAmount)
            assert.equal(htlcBalance, htlcBalanceRinkeby - (-tokenAmount))
        })

        it("claim() Ben Tokens on Rinkeby from Anna works with secret", async () => {
            const web3 = new Web3(providerRinkeby)

            const txCount = await web3.eth.getTransactionCount(Anna, "pending")

            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcRinkeby.address,
                from: Anna,
                data: rinkebyContract.methods.claim(benContractId, secretKey).encodeABI()
            }

            var tx = new Tx(txData, {'chain':'rinkeby'})
            tx.sign(privateKeyAnna)
            var serializedTx = tx.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const contractInstance = await rinkebyContract.methods.getContract(benContractId).call({from: Anna})

            assert.equal(contractInstance.secretKey, secretKey)
            assert.isTrue(contractInstance.claimed)
            assert.isFalse(contractInstance.refunded)

            publicSecret = contractInstance.secretKey

            const annaBalanceNow = await benERC20Contract.methods.balanceOf(Anna).call()
            const htlcBalance = await benERC20Contract.methods.balanceOf(htlcRinkeby.address).call()

            assert.equal(annaBalanceNow, annaBalanceRinkeby - (-tokenAmount))
            assert.equal(htlcBalance, htlcBalanceRinkeby)
        })

        it("claim() Anna Tokens on Goerli from Ben works with published secret ", async () => {
            const web3 = new Web3(providerGoerli)

            const txCount = await web3.eth.getTransactionCount(Ben, "pending")

            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Ben,
                data: goerliContract.methods.claim(annaContractId, publicSecret).encodeABI()
            }

            var tx = new Tx(txData, {'chain':'goerli'})
            tx.sign(privateKeyBen)
            var serializedTx = tx.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const contractInstance = await goerliContract.methods.getContract(annaContractId).call({from: Ben})

            assert.equal(contractInstance.secretKey, publicSecret)
            assert.isTrue(contractInstance.claimed)
            assert.isFalse(contractInstance.refunded)

            const benBalanceNow = await annaERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()

            assert.equal(benBalanceNow, benBalanceGoerli - (-tokenAmount)) 
            assert.equal(htlcBalance, htlcBalanceGoerli)
        })

        it("final balances of Anna and Ben on Goerli and Rinkeby", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
            htlcBalanceGoerli =  await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()
            console.log("HTLC goerli: " + htlcBalanceGoerli)

            benBalanceRinkeby = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben rinkeby: " + benBalanceRinkeby)
            annaBalanceRinkeby = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna rinkeby: " + annaBalanceRinkeby)
            htlcBalanceRinkeby = await benERC20Contract.methods.balanceOf(htlcRinkeby.address).call()
            console.log("HTLC rinkeby: " + htlcBalanceRinkeby)
        })
    })

/*    describe("Test if Anna and Ben get refunded", function () {

        it("show balances of Anna and Ben on Goerli and Rinkeby", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
    
            benBalanceRinkeby = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben rinkeby: " + benBalanceRinkeby)
            annaBalanceRinkeby = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna rinkeby: " + annaBalanceRinkeby)
        })

        it("approve and setSwap() from Anna works on Goerli", async function () {
            this.timeout(0)
            const web3 = new Web3(providerGoerli)

            const txCountApprove = await web3.eth.getTransactionCount(Anna, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: AnnaERC20.address,
                from: Anna,
                data: annaERC20Contract.methods.approve(htlcGoerli.address, tokenAmount).encodeABI()
            }

            var txApprove = new Tx(txDataApprove, {'chain':'goerli'})
            txApprove.sign(privateKeyAnna)
            var serializedTxApprove = txApprove.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // send setSwap()

            const txCountSetSwap = await web3.eth.getTransactionCount(Anna, "pending")

            const timelock = (Math.floor(Date.now() / 1000)) + 20

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'goerli'})
            txSetSwap.sign(privateKeyAnna)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined) {
                await sleep(1000)
                showEvent = await goerliContract.getPastEvents("newSwap", { 
                    filter: {sender: Anna, receiver: Ben}
                })
            }
            console.log(showEvent[0].returnValues.contractId)
            annaContractId = showEvent[0].returnValues.contractId
        })

        it("approve and setSwap() from Ben works on Rinkeby", async function () {
            this.timeout(0)

            const web3 = new Web3(providerRinkeby)

            const txCountApprove = await web3.eth.getTransactionCount(Ben, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: BenERC20.address,
                from: Ben,
                data: benERC20Contract.methods.approve(htlcRinkeby.address, tokenAmount).encodeABI()
            }

            var txApprove = new Tx(txDataApprove, {'chain':'rinkeby'})
            txApprove.sign(privateKeyBen)
            var serializedTxApprove = txApprove.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // send setSwap()

            const txCountSetSwap = await web3.eth.getTransactionCount(Ben, "pending")

            const timelock = (Math.floor(Date.now() / 1000)) + 20

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcRinkeby.address,
                from: Ben,
                data: rinkebyContract.methods.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'rinkeby'})
            txSetSwap.sign(privateKeyBen)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined){
                await sleep(1000)
                showEvent = await rinkebyContract.getPastEvents("newSwap", {
                    filter: {sender: Ben, receiver: Anna}
                })
            }
            console.log(showEvent[0].returnValues.contractId)
            benContractId = showEvent[0].returnValues.contractId
        })

        it("show balances of Anna and Ben on Goerli and Rinkeby", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
    
            benBalanceRinkeby = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben rinkeby: " + benBalanceRinkeby)
            annaBalanceRinkeby = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna rinkeby: " + annaBalanceRinkeby)
        })

        it("Anna does not claim, so Ben refunds", async function () {
            this.timeout(0)
            await sleep(20000)
            const web3 = new Web3(providerRinkeby)

            const txCount = await web3.eth.getTransactionCount(Ben, "pending")

            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcRinkeby.address,
                from: Ben,
                data: rinkebyContract.methods.refund(benContractId).encodeABI()
            }

            var tx = new Tx(txData, {'chain':'rinkeby'})
            tx.sign(privateKeyBen)
            var serializedTx = tx.serialize()
            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const contractInstance = await rinkebyContract.methods.getContract(benContractId).call({from: Ben})

            assert.isFalse(contractInstance.claimed)
            assert.isTrue(contractInstance.refunded)
        })

        it("Anna didnt't claim and refunds", async function () {
            this.timeout(0)
            await sleep(20000)
            const web3 = new Web3(providerGoerli)

            const txCount = await web3.eth.getTransactionCount(Anna, "pending")

            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.refund(annaContractId).encodeABI()
            }

            var tx = new Tx(txData, {'chain':'goerli'})
            tx.sign(privateKeyAnna)
            var serializedTx = tx.serialize()
            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const contractInstance = await goerliContract.methods.getContract(annaContractId).call({from: Anna})
            //console.log(contractInstance)

            assert.isFalse(contractInstance.claimed)
            assert.isTrue(contractInstance.refunded)
        })

        it("final balances of Anna and Ben on Goerli and Rinkeby", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
    
            benBalanceRinkeby = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben rinkeby: " + benBalanceRinkeby)
            annaBalanceRinkeby = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna rinkeby: " + annaBalanceRinkeby)
        })
    })*/
})