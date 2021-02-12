const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20.sol")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")
const BenERC20Token = artifacts.require("tokens/BenERC20.sol")

const Web3 = require("web3")
const provider1 = new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545") // first ganache chain
const provider2 = new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545") // second ganache chain

// Test the cross-bockchain token swap between the two users Anna and Ben

contract("HashedTimelock Cross-Chain Swap between two ERC20 Tokens", () => {
    const initialBalance = 100
    const tokenAmount = 10

    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee" // used by Anna and Ben
    const secret = "Cross-Blockchain Token Swap mit Ethereum" // initially only known by Anna
    let publicSecret

    let htlcAnna // HTLC on the first gananche chain, where Anna owns AnnaERC20
    let htlcBen // HTLC on the second ganache chain, where Ben owns BenERC20
    let AnnaERC20
    let BenERC20

    let wallet1Anna // Anna owns AnnaERC20 on the first ganache chain
    let wallet1Ben // Ben wants AnnaERC20 on the first ganache chain

    let wallet2Anna // Anna wants BenERC20 on the second ganache chain
    let wallet2Ben // Ben owns BenERC20 on the second ganache chain has BenERC20

    let annaSwapId // swap id of the swap created by Anna
    let benSwapId // swap id of the swap created by Ben

    before(async () => {
        web3 = new Web3(provider1) // be on the first ganache chain

        // Assign account addresses to Anna and Ben on the first ganache chain
        const accounts1 = await web3.eth.getAccounts()
        wallet1Anna = accounts1[0]
        wallet1Ben = accounts1[1]

        await HashedTimelockERC20.setProvider(provider1)
        htlcAnna = await HashedTimelockERC20.new({from: wallet1Anna})

        await AnnaERC20Token.setProvider(provider1)
        AnnaERC20 = await AnnaERC20Token.new({from: wallet1Anna})

        // Anna is the only owner of AnnaERC20 at this point
        assert.equal(await AnnaERC20.balanceOf(wallet1Anna), initialBalance)
        assert.equal(await AnnaERC20.balanceOf(wallet1Ben), 0)

        web3 = new Web3(provider2) // change from the first ganache chain to the second chain

        // Assign account addresses to Anna and Ben on the second ganache chain
        const accounts2 = await web3.eth.getAccounts()
        wallet2Ben = accounts2[0]
        wallet2Anna = accounts2[1]

        await HashedTimelockERC20.setProvider(provider2)
        htlcBen = await HashedTimelockERC20.new({from: wallet2Ben})
        
        await BenERC20Token.setProvider(provider2)
        BenERC20 = await BenERC20Token.new({from: wallet2Ben})

        // Ben is the only owner of BenERC20 at this point
        assert.equal(await BenERC20.balanceOf.call(wallet2Anna), 0)
        assert.equal(await BenERC20.balanceOf.call(wallet2Ben), initialBalance)
    })

    describe("Test the swap scencario: ", () => {

        it("1) Anna initiates a swap with Ben", async () => {
            await HashedTimelockERC20.setProvider(provider1) // HTLC on the first ganache chain
            const timelock = (Math.floor(Date.now() / 1000)) + 3

            await AnnaERC20.approve(htlcAnna.address, tokenAmount, {from: wallet1Anna})
            const firstSwap = await htlcAnna.setSwap(wallet1Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: wallet1Anna})

            annaSwapId = (firstSwap.logs[0].args).swapId // Get swap id from event logs

            // Check token balances
            assert.equal(await AnnaERC20.balanceOf(wallet1Anna), initialBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), tokenAmount)
        })

        it("2) Ben responds and set ups a swap with Anna", async () => {
            await HashedTimelockERC20.setProvider(provider2) // HTLC on the second ganache chain
            // timelock of Ben should be shorter in the real world, but that does not affect the ideal workflow we are testing here
            const timelock = (Math.floor(Date.now() / 1000)) + 3 

            await BenERC20.approve(htlcBen.address, tokenAmount, {from: wallet2Ben})
            const secondSwap = await htlcBen.setSwap(wallet2Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: wallet2Ben})

            benSwapId = (secondSwap.logs[0].args).swapId // Get swap id from event logs

            // Check token balances
            assert.equal(await BenERC20.balanceOf(wallet2Ben), initialBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlcBen.address), tokenAmount)
        })

        it("3) Anna claims the Ben tokens with the secret", async () => {
            await HashedTimelockERC20.setProvider(provider2) // HTLc on the second ganache chain
            await htlcBen.claim(benSwapId, secret, {from: wallet2Anna})

            // Check token balances
            assert.equal(await BenERC20.balanceOf(wallet2Anna), tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlcBen.address), 0)

            const swapInstance = await htlcBen.getSwap.call(benSwapId);
            assert.equal(swapInstance[5], secret) // secret is published
            assert.isTrue(swapInstance[7]) // claimed is set to true
            assert.isFalse(swapInstance[8]) // refunded remains false

            publicSecret = swapInstance[5] // Ben obtains secret
        })

        it("4) Ben claims the Anna tokens after seeing the publicly available secret", async () => {
            await HashedTimelockERC20.setProvider(provider1) // HTLc on the first ganache chain
            await htlcAnna.claim(annaSwapId, publicSecret, {from: wallet1Ben})

            // Check token balances
            assert.equal(await AnnaERC20.balanceOf(wallet1Ben), tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), 0)

            const swapInstance = await htlcAnna.getSwap.call(annaSwapId)
            assert.equal(swapInstance[5], publicSecret)
            assert.isTrue(swapInstance[7]) // claimed is set to true
            assert.isFalse(swapInstance[8]) // refunded remains false
        })

    })

    describe("Test the refund scenario: ", () => {

        // Both set up a swap for each other, Anna doesn't claim and the secret is never revealed, so both refund

        it("Cross-chain swap is set up with 5sec timeout on both sides", async () => {
            const currentBalance = initialBalance - tokenAmount // Anna and Ben have less tokens after token swap

            await AnnaERC20.approve(htlcAnna.address, tokenAmount, {from: wallet1Anna})
            await BenERC20.approve(htlcBen.address, tokenAmount, {from: wallet2Ben})

            const timelock = (Math.floor(Date.now() / 1000)) + 6 // timelock used by both Anna and Ben

            // Anna creates first swap on the first ganache chain
            await HashedTimelockERC20.setProvider(provider1)
            const firstSwap = await htlcAnna.setSwap(wallet1Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: wallet1Anna})
            annaSwapId = (firstSwap.logs[0].args).swapId

            assert.equal(await AnnaERC20.balanceOf(wallet1Anna), currentBalance - tokenAmount)
            assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), tokenAmount)

            // Ben creates second swap on the second ganache chain
            await HashedTimelockERC20.setProvider(provider2)
            const secondSwap = await htlcBen.setSwap(wallet2Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: wallet2Ben})
            benSwapId = (secondSwap.logs[0].args).swapId

            assert.equal(await BenERC20.balanceOf(wallet2Ben), currentBalance - tokenAmount)
            assert.equal(await BenERC20.balanceOf(htlcBen.address), tokenAmount)

            // Ben refunds first, Anna afterward after letting the timeout elapse
            return new Promise((resolve, reject) => setTimeout(async () => {
                try{
                    await HashedTimelockERC20.setProvider(provider2)
                    await htlcBen.refund(benSwapId, {from: wallet2Ben})
                    assert.equal(await BenERC20.balanceOf(wallet2Ben), currentBalance)

                    const benSwapInstance = await htlcBen.getSwap.call(benSwapId)
                    assert.isFalse(benSwapInstance[7]) // claimed remains false
                    assert.isTrue(benSwapInstance[8]) // refunded is set to true

                    await HashedTimelockERC20.setProvider(provider1)
                    await htlcAnna.refund(annaSwapId, {from: wallet1Anna})
                    assert.equal(await AnnaERC20.balanceOf(wallet1Anna), currentBalance)

                    const annaSwapInstance = await htlcAnna.getSwap.call(annaSwapId)
                    assert.isFalse(annaSwapInstance[7]) // claimed remains false
                    assert.isTrue(annaSwapInstance[8]) // refunded is set to true
                    resolve()
                } catch(error) {
                    reject(error)
                }
            }, 6 * 1000))
        })

    })
})