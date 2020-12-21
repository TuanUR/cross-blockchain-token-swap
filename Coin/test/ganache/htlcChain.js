const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20.sol")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")
const BenERC20Token = artifacts.require("tokens/BenERC20.sol")

contract("HashedTimelock On Chain Swap between two ERC20 Tokens", accounts => {
    const Anna = accounts[1]
    const Ben = accounts[2]

    const initialBalance = 100
    const tokenAmount = 10

    const hashlock = "0xe9342406ce7b5fbb57f1b6f72c4b0dd2cb6e3989c120caaa8078ceb1230daa24"
    const secret = "Sunshine Galaxay Odyssey"
    let publicSecret

    let htlc
    let AnnaERC20
    let BenERC20

    let annaSwapId
    let benSwapId

    before(async () => {
        htlc = await HashedTimelockERC20.new()
        AnnaERC20 = await AnnaERC20Token.new()
        BenERC20 = await BenERC20Token.new()

        await AnnaERC20.transfer(Anna, initialBalance)
        await BenERC20.transfer(Ben, initialBalance)
        
        assert.equal(await AnnaERC20.balanceOf(Anna), initialBalance)
        assert.equal(await BenERC20.balanceOf(Anna), 0)
        assert.equal(await BenERC20.balanceOf(Ben), initialBalance)
        assert.equal(await AnnaERC20.balanceOf(Ben), 0)
    })

    describe("Test the swap scencario: ", () => {

        it("1) Anna initiates a swap with Ben", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 100
            await AnnaERC20.approve(htlc.address, tokenAmount, {from: Anna})
            const firstSwap = await htlc.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: Anna})

            annaSwapId = (firstSwap.logs[0].args).swapId

            assert.equal(await AnnaERC20.balanceOf(Anna), initialBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("2) Ben responds and set ups a swap with Anna", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 100
            await BenERC20.approve(htlc.address, tokenAmount, {from: Ben})
            const secondSwap = await htlc.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: Ben})

            benSwapId = (secondSwap.logs[0].args).swapId

            assert.equal(await BenERC20.balanceOf(Ben), initialBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("3) Anna claims the Ben tokens with the secret", async () => {
            await htlc.claim(benSwapId, secret, {from: Anna})

            assert.equal(await BenERC20.balanceOf(Anna), tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), 0)

            const contractInstance = await htlc.getSwap.call(benSwapId);
            assert.equal(contractInstance[5], secret)
            assert.isTrue(contractInstance[7])
            assert.isFalse(contractInstance[8])

            publicSecret = contractInstance[5]
        })

        it("4) Ben claims the Anna tokens after seeing the publicly avaible secret", async () => {
            await htlc.claim(annaSwapId, publicSecret, {from: Ben})

            assert.equal(await AnnaERC20.balanceOf(Ben), tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), 0)

            const contractInstance = await htlc.getSwap.call(annaSwapId)
            assert.equal(contractInstance[5], publicSecret)
            assert.isTrue(contractInstance[7])
            assert.isFalse(contractInstance[8])
        })

    })

    describe("Test the refund scenario: ", () => {

        const currentBalance = initialBalance - tokenAmount

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

        it("3) Anna does not claim, so Ben refunds (5sec timeout)", async () => {
            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    await htlc.refund(benSwapId, {from: Ben})
                    assert.equal(await BenERC20.balanceOf(Ben), currentBalance)
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 5 * 1000))
        })

        it("4) Anna refunds after Ben refunded", async () => {
            await htlc.refund(annaSwapId, {from: Anna})
            assert.equal(await AnnaERC20.balanceOf(Anna), currentBalance)
        })

    })
})