/*const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20.sol")
const AnnaERC20Token = artifacts.require("tokens/AnnaERC20.sol")
const BenERC20Token = artifacts.require("tokens/BenERC20.sol")

const Web3 = require("web3")
const provider1 = new Web3.providers.HttpProvider("HTTP://127.0.0.1:7545")
const provider2 = new Web3.providers.HttpProvider("HTTP://127.0.0.1:8545")

contract("HashedTimelockERC20 Cross Chain Swap", () => {

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

  let annaContractId
  let benContractId

  before(async () => {
      const accounts1 = await web3.eth.getAccounts()
      wallet1Anna = accounts1[0]
      wallet1Ben = accounts1[1]

      htlcAnna = await HashedTimelockERC20.deployed()

      await AnnaERC20Token.setProvider(provider1)
      AnnaERC20 = await AnnaERC20Token.new({from: wallet1Anna})

      assert.equal(await AnnaERC20.balanceOf(wallet1Anna), initialBalance)
      assert.equal(await AnnaERC20.balanceOf(wallet1Ben), 0)

      web3 = new Web3(provider2)

      const accounts2 = await web3.eth.getAccounts()
      wallet2Ben = accounts2[0]
      wallet2Anna = accounts2[1]

      await HashedTimelockERC20.setProvider(provider2)
      htlcBen = await HashedTimelockERC20.at("0xd12Ae8269993a9C6e17a574002960434991f3dAe")
      // deployed() -> TypeError: Cannot read property 'args' of undefined
      // clone(7777) -> TypeError: htlcBen.setSwap is not a function
      
      await BenERC20Token.setProvider(provider2)
      BenERC20 = await BenERC20Token.new({from: wallet2Ben})

      assert.equal(await BenERC20.balanceOf.call(wallet2Anna), 0)
      assert.equal(await BenERC20.balanceOf.call(wallet2Ben), initialBalance)
  })

  it("has the right balances", async () => {
      assert.equal(await AnnaERC20.balanceOf.call(wallet1Anna), initialBalance)
      assert.equal(await AnnaERC20.balanceOf.call(wallet1Ben), 0)

      assert.equal(await BenERC20.balanceOf.call(wallet2Anna), 0)
      assert.equal(await BenERC20.balanceOf.call(wallet2Ben), initialBalance)
  })

  
  it("1) Anna initiates a swap with Ben", async () => {
      await HashedTimelockERC20.setProvider(provider1)
      const timelock = (Math.floor(Date.now() / 1000)) + 3
      await AnnaERC20.approve(htlcAnna.address, tokenAmount, {from: wallet1Anna})
      const firstSwap = await htlcAnna.setSwap(wallet1Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: wallet1Anna})

      annaContractId = (firstSwap.logs[0].args).contractId

      assert.equal(await AnnaERC20.balanceOf(wallet1Anna), initialBalance - tokenAmount)
      assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), tokenAmount)
  })

  it("2) Ben responds and set ups a swap with Anna", async () => {
      await HashedTimelockERC20.setProvider(provider2)
      const timelock = (Math.floor(Date.now() / 1000)) + 3
      await BenERC20.approve(htlcBen.address, tokenAmount, {from: wallet2Ben})
      const secondSwap = await htlcBen.setSwap(wallet2Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: wallet2Ben})

      benContractId = (secondSwap.logs[0].args).contractId

      assert.equal(await BenERC20.balanceOf(wallet2Ben), initialBalance - tokenAmount)
      assert.equal(await BenERC20.balanceOf(htlcBen.address), tokenAmount)
  })

  it("3) Anna claims the Ben tokens with the secret", async () => {
      await HashedTimelockERC20.setProvider(provider2)
      await htlcBen.claim(benContractId, secretKey, {from: wallet2Anna})

      assert.equal(await BenERC20.balanceOf(wallet2Anna), tokenAmount)
      assert.equal(await BenERC20.balanceOf(htlcBen.address), 0)

      const contractInstance = await htlcBen.getContract.call(benContractId);
      assert.equal(contractInstance[5], secretKey)
      assert.isTrue(contractInstance[7])
      assert.isFalse(contractInstance[8])

      publicSecret = contractInstance[5]
  })

  it("4) Ben claims the Anna tokens after seeing the publicly avaible secret", async () => {
      await HashedTimelockERC20.setProvider(provider1)
      await htlcAnna.claim(annaContractId, publicSecret, {from: wallet1Ben})

      assert.equal(await AnnaERC20.balanceOf(wallet1Ben), tokenAmount)
      assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), 0)

      const contractInstance = await htlcAnna.getContract.call(annaContractId)
      assert.equal(contractInstance[5], publicSecret)
      assert.isTrue(contractInstance[7])
      assert.isFalse(contractInstance[8])
  })

  it("Wallet balances after swaps", async () => {
    // await balance of returns int, not a BN
    console.log("Balance of AnnaERC20 of Anna: " + await AnnaERC20.balanceOf(wallet1Anna))
    console.log("Balance of AnnaERC20 of Ben: " + await AnnaERC20.balanceOf(wallet1Ben))

    console.log("Balance of BenERC20 of Anna: " + await BenERC20.balanceOf(wallet2Anna))
    console.log("Balance of BenERC20 of Ben: " + await BenERC20.balanceOf(wallet2Ben))

    console.log("Balance of AnnaERC20 of HTLC: " + await AnnaERC20.balanceOf(htlcAnna.address))
    console.log("Balance of BenERC20 of HTLC: " + await BenERC20.balanceOf(htlcBen.address))
  })

  it("the swap is set up with 5sec timeout on both sides", async () => {
    const currentBalance = initialBalance - tokenAmount

    await AnnaERC20.approve(htlcAnna.address, tokenAmount, {from: wallet1Anna})
    await BenERC20.approve(htlcBen.address, tokenAmount, {from: wallet2Ben})

    const timelock = (Math.floor(Date.now() / 1000)) + 3

    await HashedTimelockERC20.setProvider(provider1)
    const firstSwap = await htlcAnna.setSwap(wallet1Ben, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: wallet1Anna})
    annaContractId = (firstSwap.logs[0].args).contractId

    assert.equal(await AnnaERC20.balanceOf(htlcAnna.address), tokenAmount)

    await HashedTimelockERC20.setProvider(provider2)
    const secondSwap = await htlcBen.setSwap(wallet2Anna, BenERC20.address, hashlock, timelock, tokenAmount, {from: wallet2Ben})
    benContractId = (secondSwap.logs[0].args).contractId

    assert.equal(await BenERC20.balanceOf(htlcBen.address), tokenAmount)

    return new Promise((resolve, reject) => setTimeout(async () => {
        try{
            await HashedTimelockERC20.setProvider(provider1)
            await htlcAnna.refund(annaContractId, {from: wallet1Anna})
            assert.equal(await AnnaERC20.balanceOf(wallet1Anna), currentBalance)

            await HashedTimelockERC20.setProvider(provider2)
            await htlcBen.refund(benContractId, {from: wallet2Ben})
            assert.equal(await BenERC20.balanceOf(wallet2Ben), currentBalance)
            resolve()
        } catch(error) {
            reject(error)
        }
    }, 5 * 1000))
})

it("Wallet balances after swaps", async () => {
    // await balance of returns int, not a BN
    console.log("Balance of AnnaERC20 of Anna: " + await AnnaERC20.balanceOf.call(wallet1Anna))
    console.log("Balance of AnnaERC20 of Ben: " + await AnnaERC20.balanceOf.call(wallet1Ben))

    console.log("Balance of BenERC20 of Anna: " + await BenERC20.balanceOf.call(wallet2Anna))
    console.log("Balance of BenERC20 of Ben: " + await BenERC20.balanceOf.call(wallet2Ben))

    console.log("Balance of AnnaERC20 of HTLC: " + await AnnaERC20.balanceOf(htlcAnna.address))
    console.log("Balance of BenERC20 of HTLC: " + await BenERC20.balanceOf(htlcBen.address))
  })

})*/