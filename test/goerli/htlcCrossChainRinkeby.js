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

// For signing the transactions
const privateKeyAnna = Buffer.from(secrets.privateKeyAnna, 'hex')
const privateKeyBen = Buffer.from(secrets.privateKeyBen, 'hex')

const annaAbi = JSON.parse(fs.readFileSync('./build/contracts/AnnaERC20.json', 'utf8'))
const benAbi = JSON.parse(fs.readFileSync('./build/contracts/BenERC20.json', 'utf8'))
const htlcAbi = JSON.parse(fs.readFileSync('./build/contracts/HashedTimelockERC20.json', 'utf8'))

// Pause execution for a fixed amount of seconds 
const promisify = require('util').promisify
const sleep = promisify(require('timers').setTimeout)

/**
 * Testing the cross-blockchain token swap on the test networks Goerli and Rinkeby
 * with Anna owning AnnaERC20 on Goerli and Ben owning BenERC20 on Rinkeby
 * 
 * Both the token swap and the refund scenario are tested
 */

contract("Cross-Chain Token Swap on Test Networks Goerli and Rinkeby", () => {
    let Anna
    let Ben

    let htlcGoerli
    let htlcRinkeby
    let AnnaERC20
    let BenERC20

    // Balances of Anna, Ben and HTLCs on Goerli and Rinkeby
    let annaBalanceGoerli
    let annaBalanceRinkeby
    let benBalanceGoerli
    let benBalanceRinkeby
    let htlcBalanceGoerli
    let htlcBalanceRinkeby

    const tokenAmount = 5 // mutual token exchange rate 
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee" // used by Anna and Ben to lock their tokens
    const secret = "Cross-Blockchain Token Swap mit Ethereum" // initially known only by Anna
    let publicSecret

    let annaSwapId // swap id of the swap created by Anna
    let benSwapId // swap id of the swap created by Ben

    let annaERC20Contract
    let benERC20Contract
    let goerliContract
    let rinkebyContract

    before(async () => {
        const acc = await web3.eth.getAccounts()
        Anna = acc[0]
        Ben = acc[1]

        await AnnaERC20Token.setProvider(providerGoerli)
        AnnaERC20 = await AnnaERC20Token.deployed() // AnnaERC20 should already be deployed on Goerli

        await HashedTimelockERC20.setProvider(providerGoerli)
        htlcGoerli = await HashedTimelockERC20.at("0x728A89dEF6C372c10b6E111A4A1B6A947fC7B7d6") // HTLC on test network Goerli

        await BenERC20Token.setProvider(providerRinkeby)
        BenERC20 = await BenERC20Token.deployed() // BenERC20 should already be deployed on Rinkeby

        await HashedTimelockERC20.setProvider(providerRinkeby)
        htlcRinkeby = await HashedTimelockERC20.at("0x5015529D5674E8Ea79902236bC234c0BFD92dF11") // HTLC on test network Rinkeby
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

        it("approve() and setSwap() from Anna works on Goerli", async function () {
            this.timeout(0) // disable timeouts
            const web3 = new Web3(providerGoerli) // now on Goerli

            // Build, sign and send approve() transaction

            // Build the approve() transaction
            const txCountApprove = await web3.eth.getTransactionCount(Anna, "pending")
            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: AnnaERC20.address,
                from: Anna,
                data: annaERC20Contract.methods.approve(htlcGoerli.address, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txApprove = new Tx(txDataApprove, {'chain':'goerli'})
            txApprove.sign(privateKeyAnna)
            var serializedTxApprove = txApprove.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // Build, sign and send setSwap() transaction

            // Build the setSwap() transaction
            const txCountSetSwap = await web3.eth.getTransactionCount(Anna, "pending")
            const timelock = (Math.floor(Date.now() / 1000)) + 300 // timelock used by Anna

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txSetSwap = new Tx(txDataSetSwap, {'chain':'goerli'})
            txSetSwap.sign(privateKeyAnna)
            var serializedTxSetSwap = txSetSwap.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined){ // waiting until event is viewable
                await sleep(1000)
                showEvent = await goerliContract.getPastEvents("newSwap", { 
                    filter: {sender: Anna, receiver: Ben}
                })
            }
            // Show the swap id on the console (in case of failure, you don't have to search the swap id
            // and you can call refund after swap expiry)
            console.log("swapId goerli: " + showEvent[0].returnValues.swapId)
            annaSwapId = showEvent[0].returnValues.swapId // get swap id from event logs

            // Check token balances
            const annaBalanceNow = await annaERC20Contract.methods.balanceOf(Anna).call()
            const benBalanceNow = await annaERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await annaERC20Contract.methods.balanceOf(htlcGoerli.address).call()

            assert.equal(annaBalanceNow, annaBalanceGoerli - tokenAmount)
            assert.equal(benBalanceNow, benBalanceGoerli)
            assert.equal(htlcBalance, htlcBalanceGoerli - (-tokenAmount))
        })

        it("approve() and setSwap() from Ben works on Rinkeby", async function () {
            this.timeout(0)
            const web3 = new Web3(providerRinkeby) // change network to Rinkeby

            // Build, sign and send approve() transaction

            // Build the transaction
            const txCountApprove = await web3.eth.getTransactionCount(Ben, "pending")
            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: BenERC20.address,
                from: Ben,
                data: benERC20Contract.methods.approve(htlcRinkeby.address, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txApprove = new Tx(txDataApprove, {'chain':'rinkeby'})
            txApprove.sign(privateKeyBen)
            var serializedTxApprove = txApprove.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // Build, sign and send setSwap() transaction

            // Build the transaction
            const txCountSetSwap = await web3.eth.getTransactionCount(Ben, "pending")
            const timelock = (Math.floor(Date.now() / 1000)) + 180 // timelock used by Ben

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcRinkeby.address,
                from: Ben,
                data: rinkebyContract.methods.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txSetSwap = new Tx(txDataSetSwap, {'chain':'rinkeby'})
            txSetSwap.sign(privateKeyBen)
            var serializedTxSetSwap = txSetSwap.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined){ // waiting until event is viewable
                await sleep(1000)
                showEvent = await rinkebyContract.getPastEvents("newSwap", {
                    filter: {sender: Ben, receiver: Anna}
                })
            }
            // Show the swap id on the console (in case of failure, you don't have to search the swap id
            // and you can call refund after swap expiry)
            console.log("swapId rinkeby: " + showEvent[0].returnValues.swapId)
            benSwapId = showEvent[0].returnValues.swapId // get swap id from event logs

            // Check token balances
            const annaBalanceNow = await benERC20Contract.methods.balanceOf(Anna).call()
            const benBalanceNow = await benERC20Contract.methods.balanceOf(Ben).call()
            const htlcBalance = await benERC20Contract.methods.balanceOf(htlcRinkeby.address).call()

            assert.equal(annaBalanceNow, annaBalanceRinkeby)
            assert.equal(benBalanceNow, benBalanceRinkeby - tokenAmount)
            assert.equal(htlcBalance, htlcBalanceRinkeby - (-tokenAmount))
        })

        it("claim() BenERC20 on Rinkeby from Anna works with secret", async () => {
            const web3 = new Web3(providerRinkeby)

            // Build, sign and send claim() transaction

            // Build the transaction
            const txCount = await web3.eth.getTransactionCount(Anna, "pending")
            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcRinkeby.address,
                from: Anna,
                data: rinkebyContract.methods.claim(benSwapId, secret).encodeABI()
            }

            // Sign the transaction
            var tx = new Tx(txData, {'chain':'rinkeby'})
            tx.sign(privateKeyAnna)
            var serializedTx = tx.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const swapInstance = await rinkebyContract.methods.getSwap(benSwapId).call({from: Anna})

            assert.equal(swapInstance.secret, secret) // secret is published
            assert.isTrue(swapInstance.claimed) // claimed is set to true
            assert.isFalse(swapInstance.refunded) // refunded remains false

            publicSecret = swapInstance.secret // Ben learns the secret

            // Check token balances
            const annaBalanceNow = await benERC20Contract.methods.balanceOf(Anna).call()
            const htlcBalance = await benERC20Contract.methods.balanceOf(htlcRinkeby.address).call()

            assert.equal(annaBalanceNow, annaBalanceRinkeby - (-tokenAmount))
            assert.equal(htlcBalance, htlcBalanceRinkeby)
        })

        it("claim() AnnaERC20 on Goerli from Ben works with published secret", async () => {
            const web3 = new Web3(providerGoerli)

            // Build, sign and send claim() transaction

            // Build the transaction
            const txCount = await web3.eth.getTransactionCount(Ben, "pending")
            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcGoerli.address,
                from: Ben,
                data: goerliContract.methods.claim(annaSwapId, publicSecret).encodeABI()
            }

            // Sign the transaction
            var tx = new Tx(txData, {'chain':'goerli'})
            tx.sign(privateKeyBen)
            var serializedTx = tx.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const swapInstance = await goerliContract.methods.getSwap(annaSwapId).call({from: Ben})

            assert.equal(swapInstance.secret, publicSecret)
            assert.isTrue(swapInstance.claimed) // claimed is set to true
            assert.isFalse(swapInstance.refunded) // refunded remains false

            // Check token balances
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

    describe("Anna and Ben get refunded if they don't claim", function () {

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

        it("approve() and setSwap() from Anna works on Goerli", async function () {
            this.timeout(0)
            const web3 = new Web3(providerGoerli)

            // Build, sign and send approve() transaction

            // Build the transaction
            const txCountApprove = await web3.eth.getTransactionCount(Anna, "pending")
            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: AnnaERC20.address,
                from: Anna,
                data: annaERC20Contract.methods.approve(htlcGoerli.address, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txApprove = new Tx(txDataApprove, {'chain':'goerli'})
            txApprove.sign(privateKeyAnna)
            var serializedTxApprove = txApprove.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // Build, sign and send setSwap() transaction

            // Build the transaction
            const txCountSetSwap = await web3.eth.getTransactionCount(Anna, "pending")
            const timelock = (Math.floor(Date.now() / 1000)) + 20 // timelock used by Anna

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txSetSwap = new Tx(txDataSetSwap, {'chain':'goerli'})
            txSetSwap.sign(privateKeyAnna)
            var serializedTxSetSwap = txSetSwap.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined){ // waiting until event is viewable
                await sleep(1000)
                showEvent = await goerliContract.getPastEvents("newSwap", { 
                    filter: {sender: Anna, receiver: Ben}
                })
            }
            console.log("swapId goerli: " + showEvent[0].returnValues.swapId)
            annaSwapId = showEvent[0].returnValues.swapId // get swap id from event logs
        })

        it("approve() and setSwap() from Ben works on Rinkeby", async function () {
            this.timeout(0)
            const web3 = new Web3(providerRinkeby)

            // Build, sign and send approve() transaction

            // Build the transaction
            const txCountApprove = await web3.eth.getTransactionCount(Ben, "pending")
            const txDataApprove = {
                nonce: web3.utils.toHex(txCountApprove),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: BenERC20.address,
                from: Ben,
                data: benERC20Contract.methods.approve(htlcRinkeby.address, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txApprove = new Tx(txDataApprove, {'chain':'rinkeby'})
            txApprove.sign(privateKeyBen)
            var serializedTxApprove = txApprove.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxApprove.toString("hex"))

            // Build, sign and send setSwap() transaction

            // Build the transaction
            const txCountSetSwap = await web3.eth.getTransactionCount(Ben, "pending")
            const timelock = (Math.floor(Date.now() / 1000)) + 20 // timelock used by Ben

            const txDataSetSwap = {
                nonce: web3.utils.toHex(txCountSetSwap),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcRinkeby.address,
                from: Ben,
                data: rinkebyContract.methods.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount).encodeABI()
            }

            // Sign the transaction
            var txSetSwap = new Tx(txDataSetSwap, {'chain':'rinkeby'})
            txSetSwap.sign(privateKeyBen)
            var serializedTxSetSwap = txSetSwap.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTxSetSwap.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            let showEvent = undefined
            while (showEvent === undefined){ // waiting until event is viewable
                await sleep(1000)
                showEvent = await rinkebyContract.getPastEvents("newSwap", {
                    filter: {sender: Ben, receiver: Anna}
                })
            }
            console.log("swapId rinkeby: " + showEvent[0].returnValues.swapId)
            benSwapId = showEvent[0].returnValues.swapId // get swap id from event logs
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

        it("Anna does not claim, so Ben refunds his BenERC20", async function () {
            this.timeout(0)
            await sleep(20000)
            const web3 = new Web3(providerRinkeby)

            // Build, sign and send refund() transaction

            // Build the transaction
            const txCount = await web3.eth.getTransactionCount(Ben, "pending")
            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcRinkeby.address,
                from: Ben,
                data: rinkebyContract.methods.refund(benSwapId).encodeABI()
            }

            // Sign the transaction
            var tx = new Tx(txData, {'chain':'rinkeby'})
            tx.sign(privateKeyBen)
            var serializedTx = tx.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const swapInstance = await rinkebyContract.methods.getSwap(benSwapId).call({from: Ben})

            assert.isFalse(swapInstance.claimed) // claimed remains false
            assert.isTrue(swapInstance.refunded) // refuned is set to true
        })

        it("Anna didnt't claim and refunds her AnnaERC20", async function () {
            this.timeout(0)
            await sleep(20000) // let timeout elapse
            const web3 = new Web3(providerGoerli)

            // Build, sign and send refund() transaction

            // Build the transaction
            const txCount = await web3.eth.getTransactionCount(Anna, "pending")
            const txData = {
                nonce: web3.utils.toHex(txCount),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(100e9), // 100 Gwei
                to: htlcGoerli.address,
                from: Anna,
                data: goerliContract.methods.refund(annaSwapId).encodeABI()
            }

            // Sign the transaction
            var tx = new Tx(txData, {'chain':'goerli'})
            tx.sign(privateKeyAnna)
            var serializedTx = tx.serialize()

            // Broadcast the transaction
            await web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
            .on('transactionHash', async function(hash){
                let transactionReceipt = null
                while (transactionReceipt == null) { // waiting until the transaction is mined
                    transactionReceipt = await web3.eth.getTransactionReceipt(hash)
                    await sleep(1000)
                }
            })

            const swapInstance = await goerliContract.methods.getSwap(annaSwapId).call({from: Anna})

            assert.isFalse(swapInstance.claimed) // claimed remains false
            assert.isTrue(swapInstance.refunded) // refuned is set to true
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
    })
})