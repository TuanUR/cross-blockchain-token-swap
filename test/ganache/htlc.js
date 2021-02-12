const truffleAssert = require('truffle-assertions')

const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")

// Testing the functionalities and the behavior of the Hashed Timelock Contract in different scenarios

contract("HashedTimelockERC20", accounts => {
    const sender = accounts[0]
    const receiver = accounts[1]
    const initialBalance = 100 // balance of the sender
    const tokenAmount = 10 // token amount to be put in the swaps
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee" // used by the sender and the receiver
    const secret = "Cross-Blockchain Token Swap mit Ethereum" // initially only known by the sender
    const timelock1Hour = now() + 3600

    const Failed_MSG = "Returned error: VM Exception while processing transaction: revert"

    let htlc
    let token

    let swap1Result
    let swap2Result
    let swap3Result

    before(async () => {
        htlc = await HashedTimelockERC20.new()
        token = await AnnaERC20Token.new()
    })

    describe("setSwap() test different scenarios: ", () => {

        it("setSwap() creates new swap, stores and emits event correctly", async () => {
            swap1Result = await newSwap(timelock1Hour) // create new swap with 1 hour timelock
            const swapId = getSwapId(swap1Result) // get the swap id from event logs

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
            assertBalances(sender, initialBalance - tokenAmount)
            assertBalances(htlc.address, tokenAmount)

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
            await truffleAssert.reverts(
                failSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to no approvement"
            )
        })
        
        it("setSwap() should fail when zero tokens are approved", async () => {
            await token.approve(htlc.address, 0, {from: sender})
            await truffleAssert.reverts(
                failSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to zero tokens"
            )
        })

        it("setSwap() should fail when approver has no tokens", async () => {
            const notOwnerOfTokens = accounts[5]
            await token.approve(htlc.address, 0, {from: notOwnerOfTokens})
            await truffleAssert.reverts(
                failSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to no tokens"
            )
        })

        it("setSwap() should fail with a duplicate swap request", async () => {
            await truffleAssert.reverts(
                newSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to duplicate"
            )
        })
        
        it("setSwap() should fail when timelock is in the past", async () => {
            timelock = now() - 5
            await truffleAssert.reverts(
                newSwap(timelock),
                Failed_MSG,
                "expected failure due to past timelock"
            )
        })

    })

    describe("claim() test different scenarions", () => {

        it("claim() should send tokens when given the correct secret and emits event correctly", async () => {
            const swapId = getSwapId(swap1Result) // get swap id from created swap
            const claim = await htlc.claim(swapId, secret, {from: receiver}) // receiver calls claim with the secret to receive the tokens

            truffleAssert.eventEmitted(claim, "claimedSwap", (ev) => { // check if claimedSwap event is emitted correctly
                return ev.swapId === swapId && ev.secret === secret
            }, "Successful claim")

            // check token balances
            assertBalances(sender, initialBalance - tokenAmount)
            assertBalances(receiver, tokenAmount)
            assertBalances(htlc.address, 0)

            const swapArray = await htlc.getSwap.call(swapId)
            const swap = arrayToObject(swapArray)

            assert.equal(swap.secret, secret)
            assert.isTrue(swap.claimed) // claimed is set true
            assert.isFalse(swap.refunded) // refunded remains false
        })

        it("claim() should fail after claimed swap", async () => {
            const swapId = getSwapId(swap1Result)

            await truffleAssert.reverts(
                htlc.claim(swapId, secret, {from: receiver}),
                Failed_MSG,
                "expected failure due to already claimed swap"
            )
        })

        it("claim() should fail when given the false secret", async () => {
            swap2Result = await newSwap(now() + 3) // this new swap is used for the next 4 tests

            const swapId = getSwapId(swap2Result)
            const wrongSecret = "wrong secret"

            await truffleAssert.reverts(
                htlc.claim(swapId, wrongSecret, {from: receiver}),
                Failed_MSG,
                "expected failure due to wrong secret"
            )
        })

        it("claim() should fail if caller is not receiver", async () => {
            const notReceiver = accounts[2];
            const swapId = getSwapId(swap2Result)

            await truffleAssert.reverts(
                htlc.claim(swapId, secret, {from: notReceiver}),
                Failed_MSG,
                "expected failure due to wrong receiver"
            )
        })

        it("claim() should fail after timelock expiry", async () => {
            const swapId = getSwapId(swap2Result)

            return new Promise((resolve, reject) => setTimeout(async () => { // pause for 5 seconds
                try{
                    await htlc.claim(swapId, secret, {from: receiver})
                    reject(new Error("expected failure due to claim after timelock expired"))
                } catch(error) {
                    assert.isTrue(error.message.startsWith(Failed_MSG))
                    resolve({message: "success"})
                }
            }, 5 * 1000))
        })

    })

    describe("refund() test different secanrios", () => {

        it("refund() should work after timelock expiry and emits event correctly", async () => {
            const newSenderBalance = await token.balanceOf.call(sender) // sender has less tokens after receiver claimed and new swap 

            const swapId = getSwapId(swap2Result) // get new swap id

            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    const refund = await htlc.refund(swapId, {from: sender}) // sender calls refund to retrieve his tokens

                    truffleAssert.eventEmitted(refund, "refundedSwap", (ev) => { // check if refundedSwap event is emitted correctly
                        return ev.swapId === swapId
                    }, "Successful refund")

                    assertBalances(sender, newSenderBalance - (-tokenAmount)) // sender should get his tokens back

                    const swapArray = await htlc.getSwap.call(swapId)
                    const swap = arrayToObject(swapArray)

                    assert.isFalse(swap.claimed) // claimed remains false
                    assert.isTrue(swap.refunded) // refunded is set to true
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 5 * 1000));
        })

        it("refund() should fail after refunded swap", async () => {
            const swapId = getSwapId(swap2Result)

            await truffleAssert.reverts(
                htlc.refund(swapId, {from: sender}),
                Failed_MSG,
                "expected failure due to already refunded swap"
            )
        })

        it("refund() should fail before timelock expiry", async () => {
            swap3Result = await newSwap(now() + 500) // this new swap is used for the next test
            const swapId = getSwapId(swap3Result)

            await truffleAssert.reverts(
                htlc.refund(swapId, {from: sender}),
                Failed_MSG,
                "expected failure due to active timelock"
            )
        })

        it("refund() should fail if caller is not sender", async() => {
            const swapId = getSwapId(swap3Result)

            await truffleAssert.reverts(
                htlc.refund(swapId, {from: receiver}),
                Failed_MSG,
                "expected failure due to wrong sender"
            )
        })

    })

    it("getSwap() fails when swap doesn't exist", async () => {
        await truffleAssert.reverts(
            htlc.getSwap.call("0x0"),
            Failed_MSG,
            "expected failure due non existing swap"
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
        swapObj = {
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
        return swapObj
    }

    // Return the current unix epoch time in seconds 
    function now() {
        return Math.floor(Date.now() / 1000)
    }

    // Return the swap id of the given swap
    function getSwapId(swap) {
        return (swap.logs[0].args).swapId
    }

})