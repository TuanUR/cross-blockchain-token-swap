const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20.sol")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")
const BenERC20Token = artifacts.require("tokens/BenERC20.sol")

// Test the on-bockchain token swap between the two users Anna and Ben

contract("HashedTimelock On-Chain Swap between two ERC20 Tokens", accounts => {
    const Anna = accounts[1] // holds AnnaERC20 and wants to exchange them for BenERC20 
    const Ben = accounts[2] // holds BenERC20 and wants to exchange them for AnnaERC20

    const initialBalance = 100
    const tokenAmount = 10 // token amount to be exchanged

    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee" // used by Anna and Ben
    const secret = "Cross-Blockchain Token Swap mit Ethereum" // initially only known by Anna
    let publicSecret

    let htlc
    let AnnaERC20
    let BenERC20

    let annaSwapId // swap id of the swap created by Anna
    let benSwapId // swap id of the swap created by Ben

    before(async () => {
        htlc = await HashedTimelockERC20.new()
        AnnaERC20 = await AnnaERC20Token.new()
        BenERC20 = await BenERC20Token.new()

        await AnnaERC20.transfer(Anna, initialBalance) // so Alice has some tokens to trade
        await BenERC20.transfer(Ben, initialBalance) // so Anna has some tokens to trade

        // Anna should only own AnnaERC20 and Ben should only own BenERC20 at this point
        assert.equal(await AnnaERC20.balanceOf(Anna), initialBalance)
        assert.equal(await BenERC20.balanceOf(Anna), 0)
        assert.equal(await BenERC20.balanceOf(Ben), initialBalance)
        assert.equal(await AnnaERC20.balanceOf(Ben), 0)
    })

    describe("Test the swap scencario: ", () => {

        it("1) Anna initiates a swap with Ben", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 20 // timelock used by Anna
            await AnnaERC20.approve(htlc.address, tokenAmount, {from: Anna}) // Anna gives the HTLC an allowance 

            // Anna creates the first swap with Ben as the receiver
            const firstSwap = await htlc.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: Anna})

            // Get swap id from event logs
            annaSwapId = (firstSwap.logs[0].args).swapId

            // Check token balance
            assert.equal(await AnnaERC20.balanceOf(Anna), initialBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("2) Ben responds and set ups a swap with Anna", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 10 // timelock used by Ben, must be shorter
            await BenERC20.approve(htlc.address, tokenAmount, {from: Ben}) // Ben gives the HTLC an allowance 

            // Ben creates the second swap with Anna as the receiver
            const secondSwap = await htlc.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: Ben})

            // Get swap id from event logs
            benSwapId = (secondSwap.logs[0].args).swapId

            // Check token balance
            assert.equal(await BenERC20.balanceOf(Ben), initialBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("3) Anna claims the Ben tokens with the secret", async () => {
            await htlc.claim(benSwapId, secret, {from: Anna})

            // Check token balance
            assert.equal(await BenERC20.balanceOf(Anna), tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), 0)

            const swapInstance = await htlc.getSwap.call(benSwapId);
            assert.equal(swapInstance[5], secret) // secret is published
            assert.isTrue(swapInstance[7]) // claimed is set to true
            assert.isFalse(swapInstance[8]) // refunded remains false

            // Ben learns secret with it being available
            publicSecret = swapInstance[5]
        })

        it("4) Ben claims the Anna tokens after seeing the publicly available secret", async () => {
            await htlc.claim(annaSwapId, publicSecret, {from: Ben})

            // Check token balance
            assert.equal(await AnnaERC20.balanceOf(Ben), tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), 0)

            const swapInstance = await htlc.getSwap.call(annaSwapId)
            assert.equal(swapInstance[5], publicSecret)
            assert.isTrue(swapInstance[7]) // claimed is set to true
            assert.isFalse(swapInstance[8]) // refunded remains false
        })

    })

    describe("Test the refund scenario: ", () => {

        const currentBalance = initialBalance - tokenAmount // after the token swap both have less tokens in their balance

        // Anna and Ben set up a swap for each other, but Anna doesn't claim and thus the secret is never revealed, so both have to refund

        it("1) Anna initiates a swap with Ben", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 5
            await AnnaERC20.approve(htlc.address, tokenAmount, {from: Anna})
            const firstSwap = await htlc.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: Anna})

            annaSwapId = (firstSwap.logs[0].args).swapId

            assert.equal(await AnnaERC20.balanceOf(Anna), currentBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("2) Ben responds and set ups a swap with Anna", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 3
            await BenERC20.approve(htlc.address, tokenAmount, {from: Ben})
            const secondSwap = await htlc.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: Ben})

            benSwapId = (secondSwap.logs[0].args).swapId

            assert.equal(await BenERC20.balanceOf(Ben), currentBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), tokenAmount)
        })

        // Ben refunds first, as his swap has a shorter timeout
        it("3) Anna does not claim, so Ben refunds (5sec timeout)", async () => {
            return new Promise((resolve, reject) => setTimeout(async () => { // letting both swaps expire
                try{
                    await htlc.refund(benSwapId, {from: Ben})
                    assert.equal(await BenERC20.balanceOf(Ben), currentBalance)

                    const swapInstance = await htlc.getSwap.call(benSwapId);

                    assert.isFalse(swapInstance[7]) // claimed remains false
                    assert.isTrue(swapInstance[8]) // refunded is set to true
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 5 * 1000))
        })

        // Anna refunds afterward, as her swap has a longer timeout
        it("4) Anna refunds after Ben refunded", async () => {
            await htlc.refund(annaSwapId, {from: Anna})
            assert.equal(await AnnaERC20.balanceOf(Anna), currentBalance)

            const swapInstance = await htlc.getSwap.call(annaSwapId)

            assert.isFalse(swapInstance[7]) // claimed remains false
            assert.isTrue(swapInstance[8]) // refunded is set to true
        })

    })
})