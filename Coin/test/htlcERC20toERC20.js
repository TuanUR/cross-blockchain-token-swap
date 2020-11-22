const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20.sol")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")
const BenERC20Token = artifacts.require("tokens/BenERC20.sol")

contract("HashedTimelock swap between two ERC20 tokens", accounts => {
    const Anna = accounts[1]
    const Ben = accounts[2]

    const initialSupply = 1000
    const initialBalance = 100
    const tokenAmount = 10

    const hashlock = "0xe9342406ce7b5fbb57f1b6f72c4b0dd2cb6e3989c120caaa8078ceb1230daa24"
    const secretKey = "Sunshine Galaxay Odyssey"
    let publicSecret

    let htlc
    let AnnaERC20
    let BenERC20

    let annaContractId
    let benContractId

    before(async () => {
        htlc = await HashedTimelockERC20.new()
        AnnaERC20 = await AnnaERC20Token.new(initialSupply)
        BenERC20 = await BenERC20Token.new(initialSupply)

        await AnnaERC20.transfer(Anna, initialBalance)
        await BenERC20.transfer(Ben, initialBalance)

        assert.equal(await AnnaERC20.balanceOf(Anna), initialBalance)
        assert.equal(await BenERC20.balanceOf(Anna), 0)
        assert.equal(await BenERC20.balanceOf(Ben), initialBalance)
        assert.equal(await AnnaERC20.balanceOf(Ben), 0)
    })

    describe("Test the swap scencario: ", () => {

        it("1) Anna initiates a swap with Ben", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 3
            await AnnaERC20.approve(htlc.address, tokenAmount, {from: Anna})
            const firstSwap = await htlc.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: Anna})

            annaContractId = (firstSwap.logs[0].args).contractId

            assert.equal(await AnnaERC20.balanceOf(Anna), initialBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("2) Ben responds and set ups a swap with Anna", async () => {
            const timelock = (Math.floor(Date.now() / 1000)) + 3
            await BenERC20.approve(htlc.address, tokenAmount, {from: Ben})
            const secondSwap = await htlc.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: Ben})

            benContractId = (secondSwap.logs[0].args).contractId

            assert.equal(await BenERC20.balanceOf(Ben), initialBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), tokenAmount)
        })

        it("3) Anna claims the Ben tokens with the secret", async () => {
            await htlc.claim(benContractId, secretKey, {from: Anna})

            assert.equal(await BenERC20.balanceOf(Anna), tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), 0)

            const contractInstance = await htlc.getContract.call(benContractId);
            assert.equal(contractInstance[5], secretKey)
            assert.isTrue(contractInstance[7])
            assert.isFalse(contractInstance[8])

            publicSecret = contractInstance[5]
        })

        it("4) Ben claims the Anna tokens after seeing the publicly avaible secret", async () => {
            await htlc.claim(annaContractId, publicSecret, {from: Ben})

            assert.equal(await AnnaERC20.balanceOf(Ben), tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlc.address), 0)

            const contractInstance = await htlc.getContract.call(annaContractId)
            assert.equal(contractInstance[5], publicSecret)
            assert.isTrue(contractInstance[7])
            assert.isFalse(contractInstance[8])
        })

    })

    describe("Test the refund scenario: ", () => {
        it("the swap is set up with 5sec timeout on both sides", async () => {
            const currentBalance = initialBalance - tokenAmount

            await AnnaERC20.approve(htlc.address, tokenAmount, {from: Anna})
            await BenERC20.approve(htlc.address, tokenAmount, {from: Ben})

            const timelock = (Math.floor(Date.now() / 1000)) + 3

            const firstSwap = await htlc.setSwap(Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: Anna})
            const secondSwap = await htlc.setSwap(Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: Ben})

            annaContractId = (firstSwap.logs[0].args).contractId
            benContractId = (secondSwap.logs[0].args).contractId

            assert.equal(await AnnaERC20.balanceOf(htlc.address), tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlc.address), tokenAmount)

            setTimeout(async () => {
                await htlc.refund(annaContractId, {from: Anna})
                assert.equal(await htlc.balanceOf(Anna), currentBalance)

                await htlc.refund(benContractId, {from: Ben})
                assert.equal(await htlc.balanceOf(Ben), currentBalance)
            }, 5 * 1000)
        })
    })
})