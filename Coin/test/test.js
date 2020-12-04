const providerRinkeby = new Web3.providers.HttpProvider('https://rinkeby.infura.io/v3/' + secrets.infuraApiKey)
const providerRopsten = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/' + secrets.infuraApiKey)

const Coin = artifacts.require("Coin") 
const Anna = artifacts.require("AnnaERC20")

let token1
let token2

let walletAnna
let walletBen

before(async () => {
    walletAnna = await web3.eth.accounts.privateKeyToAccount("0x" + secrets.privateKeyAnna)
    walletBen = await web3.eth.accounts.privateKeyToAccount("0x" + secrets.privateKeyBen)

    let token1 = await Coin.at("0x38afb1f5dD5683356514c6a3CA9718FF9a0B92eF")
    let token2 = await Anna.at("") // fill
})

it("approve on and cross chain", async () => {
    await token1.approve(walletBen, 10, {from: walletAnna})

    await Anna.setProvider(providerRinkeby)
    await token2.approve(walletAnna, 10, {from: walletBen})
})

it("transferFrom on and cross chain", async () => {
    await token1.transferFrom(walletAnna, walletBen, 10, {from: walletBen})

    await Anna.setProvider(providerRopsten)
    await token2.transferFrom(walletBen, walletAnna, 10, {from: walletAnna})
})