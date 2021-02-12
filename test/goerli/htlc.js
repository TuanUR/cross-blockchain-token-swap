const truffleAssert = require('truffle-assertions')

const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20")
const CoinERC20Token = artifacts.require("Coin")

const promisify = require('util').promisify
const sleep = promisify(require('timers').setTimeout)

// Testing the functionalities and the behavior of the Hashed Timelock Contract on the test network Goerli in different scenarios

contract("HashedTimelockERC20 on Test Network Goerli", accounts => {
    const sender = accounts[0]
    const receiver = accounts[1]
    const tokenAmount = 5 // token amount to be put in the swaps
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee" // used by the sender and the receiver
    const secret = "Cross-Blockchain Token Swap mit Ethereum" // initially only known by the sender
    const timelock1Hour = now() + 3600

    let htlc
    let token

    let senderBalance
    let receiverBalance
    let htlcBalance

    let swap1Result
    let swap2Result
    let swap3Result

    before(async () => {
        htlc = await HashedTimelockERC20.at("0x728A89dEF6C372c10b6E111A4A1B6A947fC7B7d6") // HTLC on test network Goerli
        token = await CoinERC20Token.deployed() // Coin token contract should already be deployed

        // Initialize the token balances of sender, receiver and HTLC 
        senderBalance = await token.balanceOf.call(sender)
        receiverBalance =  await token.balanceOf.call(receiver)
        htlcBalance = await token.balanceOf.call(htlc.address)
    })

    describe("setSwap() test different scenarios: ", () => {

        it("setSwap() creates new swap, stores and emits event correctly", async () => {
            swap1Result = await newSwap(timelock1Hour)
            const swapId = getSwapId(swap1Result)

            truffleAssert.eventEmitted(swap1Result, "newSwap", (ev) => { // check if newSwap event is emitted correctly
                return ev.swapId === swapId && 
                ev.sender === sender && 
                ev.receiver === receiver &&
                ev.tokenContract === token.address &&
                (ev.tokenAmount).toNumber() === tokenAmount &&
                ev.hashlock === hashlock &&
                (ev.timelock).toNumber() === timelock1Hour
            }, "Successful newSwap with correct parameters")

            // check token balances
            assertBalances(sender, senderBalance - tokenAmount)
            assertBalances(htlc.address, htlcBalance - (-tokenAmount))

            // check swap record
            const swapArray = await htlc.getSwap.call(swapId);
            const swap = arrayToObject(swapArray)

            assert.equal(swap.sender, sender);
            assert.equal(swap.receiver, receiver);
            assert.equal(swap.tokenContract, token.address);
            assert.equal(swap.tokenAmount, tokenAmount);
            assert.equal(swap.hashlock, hashlock);
            assert.equal(swap.secret, "");
            assert.equal(swap.timeLock, timelock1Hour);
            assert.isFalse(swap.claimed);
            assert.isFalse(swap.refunded);
        })

        it("setSwap() should fail with no approvement", async () => {
            await truffleAssert.fails(
                failSwap(timelock1Hour)
            )
        })
        
        it("setSwap() should fail when zero tokens are approved", async () => {
            await token.approve(htlc.address, 0, {from: sender})
            await truffleAssert.fails(
                failSwap(timelock1Hour)
            )
        })

        it("setSwap() should fail when approver has no tokens", async () => {
            const notOwnerOfTokens = receiver // at this point receiver doesn't own tokens
            await token.approve(htlc.address, 0, {from: notOwnerOfTokens})
            await truffleAssert.fails(
                failSwap(timelock1Hour)
            )
        })

        it("setSwap() should fail with a duplicate swap request", async () => {
            await truffleAssert.fails(
                newSwap(timelock1Hour)
            )
        })
        
        it("setSwap() should fail when timelock is in the past", async () => {
            pastTimelock = (now() - 5)
            await truffleAssert.fails(
                newSwap(pastTimelock)
            )
        })

    })

    describe("claim() test different scenarios:", () => {

        it("claim() should send tokens when given the correct secret and emits event correctly", async () => {
            const swapId = getSwapId(swap1Result) // get swap id from created swap
            const claim = await htlc.claim(swapId, secret, {from: receiver}) // receiver calls claim with the secret to receive the tokens

            truffleAssert.eventEmitted(claim, "claimedSwap", (ev) => { // check if claimedSwap event is emitted correctly
                return ev.swapId === swapId && ev.secret === secret
            }, "Successful claim")

            // Check token balances
            assertBalances(receiver, receiverBalance - (-tokenAmount))

            const swapArray = await htlc.getSwap.call(swapId)
            const swap = arrayToObject(swapArray)

            assert.equal(swap.secret, secret)
            assert.isTrue(swap.claimed) // claimed is set to true
            assert.isFalse(swap.refunded) // refunded remains false
        })

        it("claim() should fail after claimed swap", async () => {
            const swapId = getSwapId(swap1Result)

            await truffleAssert.fails(
                htlc.claim(swapId, secret, {from: receiver}),
            )
        })

        it("claim() should fail when given the false secret", async () => {
            swap2Result = await newSwap(now() + 60) // this new swap is used for the next 4 tests

            const swapId = getSwapId(swap2Result)
            const wrongSecret = "wrong secret"

            await truffleAssert.fails(
                htlc.claim(swapId, wrongSecret, {from: receiver})
            )
        })

        it("claim() should fail if caller is not receiver", async () => {
            const notReceiver = sender
            const swapId = getSwapId(swap2Result)

            await truffleAssert.fails(
                htlc.claim(swapId, secret, {from: notReceiver})
            )
        })

        it("claim() should fail after timelock expiry", async () => {
            await sleep(61000) // pause for 61 seconds to let the timelock expire
            const swapId = getSwapId(swap2Result)

            await truffleAssert.fails(
                htlc.claim(swapId, secret, {from: receiver})
            )
        })

    })

    describe("refund() test different scenarios:", () => {

        it("refund() should work after timelock expiry and emits event correctly", async () => {
            const newSenderBalance = await token.balanceOf.call(sender) // sender has less tokens after receiver claimed and new swap

            const swapId = getSwapId(swap2Result)
            await sleep(10000)

            const refund = await htlc.refund(swapId, {from: sender}) // sender calls refund

            truffleAssert.eventEmitted(refund, "refundedSwap", (ev) => { // check if refundedSwap event is emitted correctly
                return ev.swapId === swapId
            }, "Successful refund")

            assertBalances(sender, newSenderBalance - (-tokenAmount)) // sender should get his tokens back

            const swapArray = await htlc.getSwap.call(swapId)
            const swap = arrayToObject(swapArray)
            assert.isFalse(swap.claimed) // claimed remains false
            assert.isTrue(swap.refunded) // refunded is set to true
        })

        it("refund() should fail after refunded swap", async () => {
            const swapId = getSwapId(swap2Result)

            await truffleAssert.fails(
                htlc.refund(swapId, {from: sender})
            )
        })

        it("refund() should fail before timelock expiry", async () => {
            swap3Result = await newSwap(now() + 80) // this new swap is used for the next test
            const swapId = getSwapId(swap3Result)

            await truffleAssert.fails(
                htlc.refund(swapId, {from: sender})
            )
        })

        it("refund() should fail if caller is not sender", async() => {
            const swapId = getSwapId(swap3Result)

            await truffleAssert.fails(
                htlc.refund(swapId, {from: receiver})
            )
        })

        it("refund() should work after timelock expiry (needed due to a newSwap)", async() => {
            const newSenderBalance = await token.balanceOf.call(sender)

            const swapId = getSwapId(swap3Result)
            await sleep(80000) // let the timeout elapse

            await htlc.refund(swapId, {from: sender})
            assertBalances(sender, newSenderBalance - (-tokenAmount))
        })

    })

    it("getSwap() fails when swap doesn't exist", async () => {
        await truffleAssert.fails(
            htlc.getSwap.call("0x0"),
        )
    })

    // Check if token balances are equal
    async function assertBalances(address, amount) {
        return assert.equal(await token.balanceOf.call(address), amount)
    }

    // Helper for setting up a new swap
    async function newSwap(timelockInSeconds) {
        await token.approve(htlc.address, tokenAmount, {from: sender})
        return htlc.setSwap(
            receiver, token.address, hashlock, timelockInSeconds, tokenAmount, {from: sender}
          )
    }

    // Helper for an expected failure
    async function failSwap(){
        return htlc.setSwap(
            receiver, token.address, hashlock, timelock1Hour, tokenAmount, {from: sender}
          )
    }

    // Convert array into object
    function arrayToObject(arr) {
        array = {
            sender: arr[0], 
            receiver: arr[1],
            tokenContract: arr[2],
            tokenAmount: arr[3],
            hashlock: arr[4],
            secret: arr[5],
            timeLock: arr[6],
            claimed: arr[7],
            refunded: arr[8],
        }
        return array
    }

    // Return the current unix epoch time in seconds 
    function now() {
        return Math.floor(Date.now() / 1000)
    }

    // Return the swap id of the given swap
    function getSwapId(result) {
        return (result.logs[0].args).swapId
    }
    
})