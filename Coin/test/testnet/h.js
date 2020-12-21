/*const fs = require('fs')

let secrets

if(fs.existsSync('secret.json')) {
  secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8'))
}

const Web3 = require("web3")
const providerGoerli = new Web3.providers.HttpProvider('https://goerli.infura.io/v3/' + secrets.infuraApiKey)
const providerRopsten = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/' + secrets.infuraApiKey)

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
    let htlcRopsten
    let AnnaERC20
    let BenERC20

    let annaBalanceGoerli
    let annaBalanceRopsten
    let benBalanceGoerli
    let benBalanceRopsten
    let htlcBalanceGoerli
    let htlcBalanceRopsten

    const tokenAmount = 5
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee"
    const secretKey = "Cross-Blockchain Token Swap mit Ethereum"
    let publicSecret

    let annaContractId
    let benContractId

    let annaERC20Contract
    let benERC20Contract
    let goerliContract
    let ropstenContract

    // truffle test --network goerli works fine <---> truffle test --network ropsten works fine
    before(async () => {
        const acc = await web3.eth.getAccounts()
        Anna = acc[0]
        Ben = acc[1]

        await AnnaERC20Token.setProvider(providerGoerli)
        AnnaERC20 = await AnnaERC20Token.deployed()

        await HashedTimelockERC20.setProvider(providerGoerli) 
        htlcGoerli = await HashedTimelockERC20.at("0x07e6aA84d916D08073c87357B76acF141296cD17")

        await BenERC20Token.setProvider(providerRopsten)
        BenERC20 = await BenERC20Token.deployed()

        await HashedTimelockERC20.setProvider(providerRopsten)
        htlcRopsten = await HashedTimelockERC20.at("0x4a73008E1354bc91EdE5E5348750F567F4A1Be06")
    })


    it("initialization of web3 for Goerli", async () => {
        const web3 = new Web3(providerGoerli)
        annaERC20Contract = new web3.eth.Contract(annaAbi.abi, AnnaERC20.address)
        goerliContract = new web3.eth.Contract(htlcAbi.abi, htlcGoerli.address)
    })

    it("initialization of web3 for Ropsten", async () => {
        const web3 = new Web3(providerRopsten)
        benERC20Contract = new web3.eth.Contract(benAbi.abi, BenERC20.address)
        ropstenContract = new web3.eth.Contract(htlcAbi.abi, htlcRopsten.address)
    })

    it("show balances of Anna and Ben on Goerli and Ropsten", async () => {
        annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
        console.log("Anna goerli: " + annaBalanceGoerli)
        benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
        console.log("Ben goerli: " + benBalanceGoerli)
        htlcBalanceGoerli =  await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()
        console.log("HTLC goerli: " + htlcBalanceGoerli)

        benBalanceRopsten = await benERC20Contract.methods.balanceOf(Ben).call()
        console.log("Ben ropsten: " + benBalanceRopsten)
        annaBalanceRopsten = await benERC20Contract.methods.balanceOf(Anna).call()
        console.log("Anna ropsten: " + annaBalanceRopsten)
        htlcBalanceRopsten = await benERC20Contract.methods.balanceOf(htlcRopsten.address).call()
        console.log("HTLC ropsten: " + htlcBalanceRopsten)
    })

    describe("Anna and Ben do a successful token swap on Goerli and Ropsten", function () {

        it("approve and setSwap() from Anna works on Goerli", async function () {
            this.timeout(0)
            const web3 = new Web3(providerGoerli)
            //await HashedTimelockERC20.setProvider(providerGoerli)

            const txCountApprove = await web3.eth.getTransactionCount(Anna, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                to: AnnaERC20.address,
                from: Anna,
                data: annaERC20Contract.methods.approve(htlcGoerli.address, tokenAmount).encodeABI(),
                chainId: 5
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
                gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount).encodeABI(), 
                chainId: 5
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
                // get contract id
                let showEvent
                do {
                    showEvent = await goerliContract.getPastEvents("newSwap", { 
                        filter: {sender: Anna, receiver: Ben}
                    })
                    await sleep(500)
                } while (showEvent[0].event != "newSwap")

                //console.log(showEvent)
                console.log(showEvent[0].returnValues.contractId)
                annaContractId = showEvent[0].returnValues.contractId
            })
        })

        it("approve and setSwap() from Ben works on Ropsten", async function () {
            this.timeout(0)
            const web3 = new Web3(providerRopsten)

            const txCountApprove = await web3.eth.getTransactionCount(Ben, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(50e9), // 50 Gwei
                to: BenERC20.address,
                from: Ben,
                data: benERC20Contract.methods.approve(htlcRopsten.address, tokenAmount).encodeABI(),
                chainId: 3
            }

            var txApprove = new Tx(txDataApprove, {'chain':'ropsten'})
            txApprove.sign(privateKeyBen)
            var serializedTxApprove = txApprove.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // send setSwap()

            const txCountSetSwap = await web3.eth.getTransactionCount(Ben, "pending")

            const timelock = (Math.floor(Date.now() / 1000)) + 180

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(50e9), // 50 Gwei
                to: htlcRopsten.address,
                from: Ben,
                data: ropstenContract.methods.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount).encodeABI(),
                chainId: 3
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'ropsten'})
            txSetSwap.sign(privateKeyBen)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // Waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }

                let showEvent
                // get contract id
                do{
                    showEvent = await ropstenContract.getPastEvents("newSwap", {
                        filter: {sender: Ben, receiver: Anna}
                    })
                    await sleep(500)
                } while (showEvent[0].event != "newSwap")

                //console.log(showEvent)
                console.log(showEvent[0].returnValues.contractId)
                benContractId = showEvent[0].returnValues.contractId
            })
        })

        it("check balances of Anna, Ben and HTLC on Goerli", async () => {
            const initialAnnaBalance = annaBalanceGoerli
            const initialBenBalance = benBalanceGoerli
            const initialHTLCBalance = htlcBalanceGoerli

            const annaBalanceNow = await annaERC20Contract.methods.balanceOf(Anna).call()
            const benBalanceNow = await annaERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()

            assert.equal(annaBalanceNow, initialAnnaBalance - tokenAmount)
            assert.equal(benBalanceNow, initialBenBalance)
            assert.equal(htlcBalance, initialHTLCBalance - (-tokenAmount))
        })

        it("check balances of Anna, Ben and HTLC on Ropsten", async () => {
            const initialAnnaBalance = annaBalanceRopsten
            const initialBenBalance = benBalanceRopsten
            const initialHTLCBalance = htlcBalanceRopsten

            const annaBalanceNow = await benERC20Contract.methods.balanceOf(Anna).call()
            const benBalanceNow = await benERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await benERC20Contract.methods.balanceOf(htlcRopsten.address).call()

            assert.equal(annaBalanceNow, initialAnnaBalance)
            assert.equal(benBalanceNow, initialBenBalance - tokenAmount)
            assert.equal(htlcBalance, initialHTLCBalance - (-tokenAmount))
        })

        it("claim() Ben Tokens on Ropsten from Anna works with secret", async () => {
            const web3 = new Web3(providerRopsten)
            //await HashedTimelockERC20.setProvider(providerRopsten)

            const txCount = await web3.eth.getTransactionCount(Anna, "pending")

            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                to: htlcRopsten.address,
                from: Anna,
                data: ropstenContract.methods.claim(benContractId, secretKey).encodeABI(),
                chainId: 3
            }

            var tx = new Tx(txData, {'chain':'ropsten'})
            tx.sign(privateKeyAnna)
            var serializedTx = tx.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))

            const contractInstance = await ropstenContract.methods.getContract(benContractId).call({from: Anna})
            console.log(contractInstance)
            //console.log(contractInstance.secretKey)

            assert.equal(contractInstance.secretKey, secretKey)
            assert.isTrue(contractInstance.claimed)
            assert.isFalse(contractInstance.refunded)

            publicSecret = contractInstance.secretKey
        })

        it("claim() Anna Tokens on Goerli from Ben works with published secret ", async () => {
            const web3 = new Web3(providerGoerli)
            //await HashedTimelockERC20.setProvider(providerGoerli)

            const txCount = await web3.eth.getTransactionCount(Ben, "pending")

            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Ben,
                data: goerliContract.methods.claim(annaContractId, publicSecret).encodeABI(),
                chainId: 5
            }

            var tx = new Tx(txData, {'chain':'goerli'})
            tx.sign(privateKeyBen)
            var serializedTx = tx.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))

            const contractInstance = await goerliContract.methods.getContract(annaContractId).call({from: Ben})
            console.log(contractInstance)
            console.log(contractInstance.secretKey)

            assert.equal(contractInstance.secretKey, publicSecret)
            assert.isTrue(contractInstance.claimed)
            assert.isFalse(contractInstance.refunded)
        })

        it("Anna's balance increases and htlc decreases", async () => {
            const annaBalanceNow = await benERC20Contract.methods.balanceOf(Anna).call()
            const htlcBalance = await benERC20Contract.methods.balanceOf(htlcRopsten.address).call()

            const initialAnnaBalance = annaBalanceRopsten
            const initialHTLCBalance = htlcBalanceRopsten

            assert.equal(annaBalanceNow, initialAnnaBalance - (-tokenAmount))
            assert.equal(htlcBalance, initialHTLCBalance)
        })

        it("Ben's balance increases and htlc decreases", async () => {
            const benBalanceNow = await annaERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()

            const initialBenBalance = benBalanceGoerli
            const initialHTLCBalance = htlcBalanceGoerli

            assert.equal(benBalanceNow, initialBenBalance - (-tokenAmount)) 
            assert.equal(htlcBalance, initialHTLCBalance)
        })
    })

// h = await HashedTimelockERC20.at("0x4a73008E1354bc91EdE5E5348750F567F4A1Be06")
// h = await HashedTimelockERC20.deployed()
// await h.getPastEvents("newSwap", { fromBlock: 9258984, toBlock: 'latest' }) (ropsten)
// await h.getPastEvents("newSwap", { fromBlock: 3926508, toBlock: 'latest' }) (goerli)
// h.refund('0xa426003c175ac687b431321004add2cf608908fe9c959ae45b0552066fee5c51', {from:accounts[1]}) last on ropsten
// h.refund('0xc8d0a1e27df653afe40a31211d53e720792d29f721f4c26d4ce9a33458a01d34') last on goerli

    /*describe("Test if Anna and Ben get refunded", function () {

        it("show balances of Anna and Ben on Goerli and Ropsten", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
    
            benBalanceRopsten = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben ropsten: " + benBalanceRopsten)
            annaBalanceRopsten = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna ropsten: " + annaBalanceRopsten)
        })

        it("approve and setSwap() from Anna works on Goerli", async function () {
            this.timeout(0)
            const web3 = new Web3(providerGoerli)
            //await HashedTimelockERC20.setProvider(providerGoerli)

            const txCountApprove = await web3.eth.getTransactionCount(Anna, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                to: AnnaERC20.address,
                from: Anna,
                data: annaERC20Contract.methods.approve(htlcGoerli.address, tokenAmount).encodeABI(),
                chainId: 5
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
                gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount).encodeABI(), 
                chainId: 5
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'goerli'})
            txSetSwap.sign(privateKeyAnna)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))


            /*return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    // get contract id 
                    const showEvent = await goerliContract.getPastEvents("newSwap", { 
                        filter: {sender: Anna, receiver: Ben}
                    })

                    //console.log(showEvent)
                    console.log(showEvent[0].returnValues.contractId)
                    annaContractId = showEvent[0].returnValues.contractId
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 1 * 1000))*/
/*
            await sleep(2000)
            // get contract id 
            const showEvent = await goerliContract.getPastEvents("newSwap", { 
                filter: {sender: Anna, receiver: Ben}
            })

            //console.log(showEvent)
            console.log(showEvent[0].returnValues.contractId)
            annaContractId = showEvent[0].returnValues.contractId
        })

        it("approve and setSwap() from Ben works on Ropsten", async function () {
            this.timeout(0)

            const web3 = new Web3(providerRopsten)

            const txCountApprove = await web3.eth.getTransactionCount(Ben, "pending")

            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(50e9), // 50 Gwei
                to: BenERC20.address,
                from: Ben,
                data: benERC20Contract.methods.approve(htlcRopsten.address, tokenAmount).encodeABI(),
                chainId: 3
            }

            var txApprove = new Tx(txDataApprove, {'chain':'ropsten'})
            txApprove.sign(privateKeyBen)
            var serializedTxApprove = txApprove.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // send setSwap()

            const txCountSetSwap = await web3.eth.getTransactionCount(Ben, "pending")

            const timelock = (Math.floor(Date.now() / 1000)) + 20

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(50e9), // 50 Gwei
                to: htlcRopsten.address,
                from: Ben,
                data: ropstenContract.methods.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount).encodeABI(),
                chainId: 3
            }

            var txSetSwap = new Tx(txDataSetSwap, {'chain':'ropsten'})
            txSetSwap.sign(privateKeyBen)
            var serializedTxSetSwap = txSetSwap.serialize()

            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))

            /*return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    // get contract id
                    const showEvent = await ropstenContract.getPastEvents("newSwap", {
                        filter: {sender: Ben, receiver: Anna}
                    })

                    //console.log(showEvent)
                    console.log(showEvent[0].returnValues.contractId)
                    benContractId = showEvent[0].returnValues.contractId
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 1 * 1000))*/
/*
            await sleep(2000)
            // get contract id
            const showEvent = await ropstenContract.getPastEvents("newSwap", {
                filter: {sender: Ben, receiver: Anna}
            })

            //console.log(showEvent)
            console.log(showEvent[0].returnValues.contractId)
            benContractId = showEvent[0].returnValues.contractId
        })

        it("show balances of Anna and Ben on Goerli and Ropsten", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
    
            benBalanceRopsten = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben ropsten: " + benBalanceRopsten)
            annaBalanceRopsten = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna ropsten: " + annaBalanceRopsten)
        })

        it("Anna does not claim, so Ben refunds", async function () {
            this.timeout(0)

            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    const web3 = new Web3(providerRopsten)
                    //await HashedTimelockERC20.setProvider(providerRopsten)
        
                    const txCount = await web3.eth.getTransactionCount(Ben, "pending")
        
                    const txData = {
                        nonce: web3.utils.toHex(txCount),
                        gasLimit: web3.utils.toHex(2100000),
                        gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                        to: htlcRopsten.address,
                        from: Ben,
                        data: ropstenContract.methods.refund(benContractId).encodeABI(),
                        chainId: 3
                    }
        
                    var tx = new Tx(txData, {'chain':'ropsten'})
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

                    const contractInstance = await ropstenContract.methods.getContract(benContractId).call({from: Ben})
                    //console.log(contractInstance)
                    //console.log(contractInstance.secretKey)

                    assert.isFalse(contractInstance.claimed)
                    assert.isTrue(contractInstance.refunded)
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 20 * 1000))
        })

        it("Anna didnt't claim and refunds", async function () {
            this.timeout(0)

            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    const web3 = new Web3(providerGoerli)
                    //await HashedTimelockERC20.setProvider(providerGoerli)
        
                    const txCount = await web3.eth.getTransactionCount(Anna, "pending")
        
                    const txData = {
                        nonce: web3.utils.toHex(txCount),
                        gasLimit: web3.utils.toHex(2100000),
                        gasPrice: web3.utils.toHex(75e9), // 50 Gwei
                        to: htlcGoerli.address,
                        from: Anna,
                        data: goerliContract.methods.refund(annaContractId).encodeABI(),
                        chainId: 5
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
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 20 * 1000))
        })

        it("show balances of Anna and Ben on Goerli and Ropsten", async () => {
            annaBalanceGoerli = await annaERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna goerli: " + annaBalanceGoerli)
            benBalanceGoerli = await annaERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben goerli: " + benBalanceGoerli)
    
            benBalanceRopsten = await benERC20Contract.methods.balanceOf(Ben).call()
            console.log("Ben ropsten: " + benBalanceRopsten)
            annaBalanceRopsten = await benERC20Contract.methods.balanceOf(Anna).call()
            console.log("Anna ropsten: " + annaBalanceRopsten)
        })
    })*/


//}) to uncomment