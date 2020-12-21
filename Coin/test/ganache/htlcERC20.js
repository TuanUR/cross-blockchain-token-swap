/*const truffleAssert = require('truffle-assertions')

const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20")
const Coin = artifacts.require("Coin")

contract("HashedTimelockERC20", accounts => {
    const sender = accounts[0]
    const receiver = accounts[1]
    const initialSupply = 100
    const tokenAmount = 10
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee"
    const secretKey = "Cross-Blockchain Token Swap mit Ethereum"

    const Failed_MSG = "Returned error: VM Exception while processing transaction: revert"
    const timelock1Hour = now() + 3600

    let htlc
    let coin

    let result

    before(async () => {
        htlc = await HashedTimelockERC20.deployed()
        console.log(htlc.address) // for every test htlc has a new address
        coin = await Coin.deployed()
        console.log(coin.address) // for every test coin has a new address
    })

    describe("setSwap() test different scenarios: ", () => {

        it("setSwap() creates new swap, stores and emits event correctly", async () => {
            result = await newSwap(timelock1Hour)
            const contractId = getContractId(result)

            truffleAssert.eventEmitted(result, "newSwap", (ev) => {
                return ev.contractId === contractId && 
                ev.sender === sender && 
                ev.receiver === receiver &&
                ev.tokenContract === coin.address &&
                (ev.tokenAmount).toNumber() === tokenAmount &&
                ev.hashlock === hashlock &&
                (ev.timelock).toNumber() === timelock1Hour
            }, "Successful newSwap with correct parameters")

            assertBalances(sender, initialSupply - tokenAmount)
            assertBalances(htlc.address, tokenAmount)

            const swapArray = await htlc.getContract.call(contractId);
            const swap = arrayToObject(swapArray)

            assert.equal(swap.sender, sender);
            assert.equal(swap.receiver, receiver);
            assert.equal(swap.tokenContract, coin.address);
            assert.equal(swap.tokenAmount, tokenAmount);
            assert.equal(swap.hashlock, hashlock);
            assert.equal(swap.secretKey, "");
            assert.equal(swap.timeLock, timelock1Hour);
            assert.isFalse(swap.claimed); // claimed 
            assert.isFalse(swap.refunded); // refunded
        })

        it("setSwap() should fail with no approvement", async () => {
            await truffleAssert.reverts(
                failSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to no approvement"
            )
        })
        
        it("setSwap() should fail when zero tokens are approved", async () => {
            await coin.approve(htlc.address, 0, {from: sender})
            await truffleAssert.reverts(
                failSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to zero tokens"
            )
        })

        it("setSwap() should fail when approver has no tokens", async () => {
            const notOwnerOfTokens = accounts[5]
            await coin.approve(htlc.address, 0, {from: notOwnerOfTokens})
            await truffleAssert.reverts(
                failSwap(timelock1Hour),
                Failed_MSG,
                "expected failure due to no tokens"
            )
        })

        it("setSwap() should fail with a duplicate contract request", async () => {
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

        it("claim() should send tokens when given the correct secretKey", async () => {
            const contractId = getContractId(result)
            const claim = await htlc.claim(contractId, secretKey, {from: receiver})

            truffleAssert.eventEmitted(claim, "claimedSwap", (ev) => {
                return ev.contractId === contractId && ev.secretKey === secretKey
            }, "Successful claim")

            assertBalances(sender, initialSupply - tokenAmount)
            assertBalances(receiver, tokenAmount)
            assertBalances(htlc.address, 0)

            const swapArray = await htlc.getContract.call(contractId)
            const swap = arrayToObject(swapArray)

            assert.equal(swap.secretKey, secretKey)
            assert.isTrue(swap.claimed)
            assert.isFalse(swap.refunded)
        })

        it("claim() should fail when given the false secretKey", async () => {
            result = await newSwap(now() + 3) // this newSwap() is used for the next 3 tests

            const contractId = getContractId(result)
            const wrongSecret = "wrong secret"

            await truffleAssert.reverts(
                htlc.claim(contractId, wrongSecret, {from: receiver}),
                Failed_MSG,
                "expected failure due to false secretKey"
            )
        })

        it("claim() should fail if caller is not receiver", async () => {
            const notReceiver = accounts[2];
            const contractId = getContractId(result)

            await truffleAssert.reverts(
                htlc.claim(contractId, secretKey, {from: notReceiver}),
                Failed_MSG,
                "expected failure due to wrong receiver"
            )
        })

        it("claim() should fail after timelock expiry", async () => {
            const contractId = getContractId(result)

            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    await htlc.claim(contractId, secretKey, {from: receiver})
                    reject(new Error("expected failure due to claim after timelock expired"))
                } catch(error) {
                    assert.isTrue(error.message.startsWith(Failed_MSG))
                    resolve({message: "success"})
                }
            }, 5 * 1000)) // miliseconds 
        })

    })

    describe("refund() test different secanrios", () => {

        it("refund() should work after timelock expiry", async () => {
            const newBalance = initialSupply - tokenAmount

            const contractId = getContractId(result)

            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    const refund = await htlc.refund(contractId, {from: sender})

                    truffleAssert.eventEmitted(refund, "refundedSwap", (ev) => {
                        return ev.contractId === contractId
                    }, "Successful refund")

                    assertBalances(sender, newBalance)

                    const swapArray = await htlc.getContract.call(contractId)
                    const swap = arrayToObject(swapArray)
                    assert.isFalse(swap.claimed)
                    assert.isTrue(swap.refunded)
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 5 * 1000));
        })

        it("refund() should fail before timelock expiry", async () => {
            result = await newSwap(now() + 500) // this newSwap() is used for the next test
            const contractId = getContractId(result)

            await truffleAssert.reverts(
                htlc.refund(contractId, {from: sender}),
                Failed_MSG,
                "expected failure due to active timelock"
            )
        })

        it("refund() should fail if caller is not sender", async() => {
            const contractId = getContractId(result)

            await truffleAssert.reverts(
                htlc.refund(contractId, {from: receiver}),
                Failed_MSG,
                "expected failure due to false sender"
            )
        })

    })

    it("getContract() fails when contract doesn't exist", async () => {
        await truffleAssert.reverts(
            htlc.getContract.call("0x0"),
            Failed_MSG,
            "expected failure due to active timelock"
        )
    })

    async function assertBalances(address, amount) {
        return assert.equal(await coin.balanceOf.call(address), amount)
    }

    async function newSwap(timelockInSeconds) {
        await coin.approve(htlc.address, tokenAmount, {from: sender})
        return htlc.setSwap(
            receiver, coin.address, hashlock, timelockInSeconds, tokenAmount, {from: sender}
          )
    }

    async function failSwap(){
        return htlc.setSwap(
            receiver, coin.address, hashlock, timelock1Hour, tokenAmount, {from: sender}
          )
    }

    function arrayToObject(arr) {
        array = {
            sender: arr[0], 
            receiver: arr[1],
            tokenContract: arr[2],
            tokenAmount: arr[3],
            hashlock: arr[4],
            secretKey: arr[5],
            timeLock: arr[6],
            claimed: arr[7],
            refunded: arr[8],
        }

        return array

    }

    function now() {
        return Math.floor(Date.now() / 1000)
    }

    function getContractId(result) {
        return (result.logs[0].args).contractId
    }
    
})*/