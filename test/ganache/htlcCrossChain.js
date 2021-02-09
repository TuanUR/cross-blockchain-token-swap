const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20.sol")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")
const BenERC20Token = artifacts.require("tokens/BenERC20.sol")

const Web3 = require("web3")
const provider1 = new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545")
const provider2 = new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545")

contract("HashedTimelock Cross Chain Swap between two ERC20 Tokens", () => {

    const initialBalance = 100
    const tokenAmount = 10

    const hashlock = "0xe9342406ce7b5fbb57f1b6f72c4b0dd2cb6e3989c120caaa8078ceb1230daa24"
    const secretKey = "Sunshine Galaxay Odyssey"
    let publicSecret

    let htlcAnna
    let htlcBen
    let AnnaERC20
    let BenERC20

    let wallet1Anna 
    let wallet2Anna
    let wallet1Ben
    let wallet2Ben

    let annaSwapId
    let benSwapId

    before(async () => {
        const accounts1 = await web3.eth.getAccounts()
        wallet1Anna = accounts1[0]
        wallet1Ben = accounts1[1]

        await HashedTimelockERC20.setProvider(provider1)
        htlcAnna = await HashedTimelockERC20.new({from: wallet1Anna})

        await AnnaERC20Token.setProvider(provider1)
        AnnaERC20 = await AnnaERC20Token.new({from: wallet1Anna})

        assert.equal(await AnnaERC20.balanceOf(wallet1Anna), initialBalance)
        assert.equal(await AnnaERC20.balanceOf(wallet1Ben), 0)

        web3 = new Web3(provider2)

        const accounts2 = await web3.eth.getAccounts()
        wallet2Ben = accounts2[0]
        wallet2Anna = accounts2[1]

        await HashedTimelockERC20.setProvider(provider2)
        htlcBen = await HashedTimelockERC20.new({from: wallet2Ben})
        
        await BenERC20Token.setProvider(provider2)
        BenERC20 = await BenERC20Token.new({from: wallet2Ben})

        assert.equal(await BenERC20.balanceOf.call(wallet2Anna), 0)
        assert.equal(await BenERC20.balanceOf.call(wallet2Ben), initialBalance)
    })

    it("Anna and Ben have the right balances on their chain", async () => {
        assert.equal(await AnnaERC20.balanceOf.call(wallet1Anna), initialBalance)
        assert.equal(await AnnaERC20.balanceOf.call(wallet1Ben), 0)

        assert.equal(await BenERC20.balanceOf.call(wallet2Anna), 0)
        assert.equal(await BenERC20.balanceOf.call(wallet2Ben), initialBalance)
    })

    describe("Test the swap scencario: ", () => {

        it("1) Anna initiates a swap with Ben", async () => {
            await HashedTimelockERC20.setProvider(provider1)
            const timelock = (Math.floor(Date.now() / 1000)) + 3
            await AnnaERC20.approve(htlcAnna.address, tokenAmount, {from: wallet1Anna})
            const firstSwap = await htlcAnna.setSwap(wallet1Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: wallet1Anna})

            annaSwapId = (firstSwap.logs[0].args).swapId

            assert.equal(await AnnaERC20.balanceOf(wallet1Anna), initialBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), tokenAmount)
        })

        it("2) Ben responds and set ups a swap with Anna", async () => {
            await HashedTimelockERC20.setProvider(provider2)
            const timelock = (Math.floor(Date.now() / 1000)) + 3
            await BenERC20.approve(htlcBen.address, tokenAmount, {from: wallet2Ben})
            const secondSwap = await htlcBen.setSwap(wallet2Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: wallet2Ben})

            benSwapId = (secondSwap.logs[0].args).swapId

            assert.equal(await BenERC20.balanceOf(wallet2Ben), initialBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlcBen.address), tokenAmount)
        })

        it("3) Anna claims the Ben tokens with the secret", async () => {
            await HashedTimelockERC20.setProvider(provider2)
            await htlcBen.claim(benSwapId, secretKey, {from: wallet2Anna})

            assert.equal(await BenERC20.balanceOf(wallet2Anna), tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlcBen.address), 0)

            const contractInstance = await htlcBen.getSwap.call(benSwapId);
            assert.equal(contractInstance[5], secretKey)
            assert.isTrue(contractInstance[7])
            assert.isFalse(contractInstance[8])

            publicSecret = contractInstance[5]
        })

        it("4) Ben claims the Anna tokens after seeing the publicly avaible secret", async () => {
            await HashedTimelockERC20.setProvider(provider1)
            await htlcAnna.claim(annaSwapId, publicSecret, {from: wallet1Ben})

            assert.equal(await AnnaERC20.balanceOf(wallet1Ben), tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), 0)

            const contractInstance = await htlcAnna.getSwap.call(annaSwapId)
            assert.equal(contractInstance[5], publicSecret)
            assert.isTrue(contractInstance[7])
            assert.isFalse(contractInstance[8])
        })

    })

    describe("Test the refund scenario: ", () => {

        it("Cross chain swap is set up with 5sec timeout on both sides", async () => {
            const currentBalance = initialBalance - tokenAmount

            await AnnaERC20.approve(htlcAnna.address, tokenAmount, {from: wallet1Anna})
            await BenERC20.approve(htlcBen.address, tokenAmount, {from: wallet2Ben})

            const timelock = (Math.floor(Date.now() / 1000)) + 3

            await HashedTimelockERC20.setProvider(provider1)
            const firstSwap = await htlcAnna.setSwap(wallet1Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: wallet1Anna})
            annaSwapId = (firstSwap.logs[0].args).swapId

            assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), tokenAmount)

            await HashedTimelockERC20.setProvider(provider2)
            const secondSwap = await htlcBen.setSwap(wallet2Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: wallet2Ben})
            benSwapId = (secondSwap.logs[0].args).swapId

            assert.equal(await BenERC20.balanceOf(htlcBen.address), tokenAmount)

            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    await HashedTimelockERC20.setProvider(provider1)
                    await htlcAnna.refund(annaSwapId, {from: wallet1Anna})
                    assert.equal(await AnnaERC20.balanceOf(wallet1Anna), currentBalance)

                    await HashedTimelockERC20.setProvider(provider2)
                    await htlcBen.refund(benSwapId, {from: wallet2Ben})
                    assert.equal(await BenERC20.balanceOf(wallet2Ben), currentBalance)
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 5 * 1000))
        })

    })
})