const fs = require('fs')

let secrets

if(fs.existsSync('secret.json')) {
  secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8'))
}

const Web3 = require("web3")
const providerGoerli = new Web3.providers.HttpProvider('https://goerli.infura.io/v3/' + secrets.infuraApiKey)
const providerRopsten = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/' + secrets.infuraApiKey)

const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20")
const AnnaERC20Token = artifacts.require("AnnaERC20")
const BenERC20Token = artifacts.require("BenERC20")

const tokenAmount = 5
const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee"
const secretKey = "Cross-Blockchain Token Swap mit Ethereum"
let publicSecret

let htlcGoerli
let htlcRopsten
let AnnaERC20
let BenERC20

let walletAnna
let walletBen

let annaContractId
let benContractId

let privateKeyAnna
let privateKeyBen

var Tx = require('ethereumjs-tx')

//const abiAnnaERC20 = JSON.parse(fs.readFileSync('./build/contracts/AnnaERC20.json', 'utf8'))
//const abiBenERC20 = JSON.parse(fs.readFileSync('./build/contracts/BenERCC20.json', 'utf8'))
const abiHTLC = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "contractId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "secretKey",
          "type": "string"
        }
      ],
      "name": "claimedSwap",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "contractId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "tokenContract",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bytes32",
          "name": "hashlock",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timelock",
          "type": "uint256"
        }
      ],
      "name": "newSwap",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "contractId",
          "type": "bytes32"
        }
      ],
      "name": "refundedSwap",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_tokenContract",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "_hashlock",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_timelock",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_tokenAmount",
          "type": "uint256"
        }
      ],
      "name": "setSwap",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "contractId",
          "type": "bytes32"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_contractId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "_secretKey",
          "type": "string"
        }
      ],
      "name": "claim",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_contractId",
          "type": "bytes32"
        }
      ],
      "name": "refund",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_contractId",
          "type": "bytes32"
        }
      ],
      "name": "getContract",
      "outputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "tokenContract",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "tokenAmount",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "hashlock",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "secretKey",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timelock",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "claimed",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "refunded",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function",
      "constant": true
    }
  ]

contract("Hashed Timelock Contract Cross Chain Swap with ERC20 Tokens", async () => {

    before(async () => {
        //walletAnna = await web3.eth.accounts.privateKeyToAccount("0x" + secrets.privateKeyAnna)
        //walletBen = await web3.eth.accounts.privateKeyToAccount("0x" + secrets.privateKeyBen)
        const accounts = await web3.eth.getAccounts()
        walletAnna = accounts[0]
        walletBen = accounts[1]

        htlcGoerli = await HashedTimelockERC20.at("0x07e6aA84d916D08073c87357B76acF141296cD17")
        assert.equal(htlcGoerli.address, "0x07e6aA84d916D08073c87357B76acF141296cD17")

        //AnnaERC20 = await AnnaERC20Token.at("0xD9877983E1BbC6911578AB92eCeC3E5d37F3abb8")
        //assert.equal(AnnaERC20.address, "0xD9877983E1BbC6911578AB92eCeC3E5d37F3abb8")
        AnnaERC20 = await AnnaERC20Token.deployed()

        await HashedTimelockERC20.setProvider(providerRopsten)
        htlcRopsten = await HashedTimelockERC20.at("0x4a73008E1354bc91EdE5E5348750F567F4A1Be06")
        assert.equal(htlcRopsten.address, "0x4a73008E1354bc91EdE5E5348750F567F4A1Be06")

        await BenERC20Token.setProvider(providerRopsten)
        BenERC20 = await BenERC20Token.deployed()
        //BenERC20 = await BenERC20Token.at("0x45a99781Cb665dC8559Ae95Fc343C0994AD999fa") 
        //assert.equal(BenERC20.address, "0x45a99781Cb665dC8559Ae95Fc343C0994AD999fa")

        privateKeyAnna = Buffer.from(
            secrets.privateKeyAnna,
            'hex',
          )
        privateKeyBen = Buffer.from(
            secrets.privateKeyBen,
            'hex',
          )
    })
/*
    it("Show acount address", async () => {
        console.log("HTLC Goerli: " + htlcGoerli.address)
        console.log("Anna ERC20: " + AnnaERC20.address)

        console.log("Anna: " + walletAnna.address)
        console.log("Ben: " + walletBen.address)

        console.log("HTLC Ropsten: " + htlcRopsten.address)
        console.log("Ben ERC20: " + htlcGoerli.address)
    })*/

    it("Anna initiates a swap with Ben", async () => {
        const web3 = new Web3(providerGoerli)
        //await HashedTimelockERC20.setProvider(providerGoerli)
        const timelock = (Math.floor(Date.now() / 1000)) + 3
        await AnnaERC20.approve(htlcGoerli.address, tokenAmount, {from: walletAnna})


        const myContract = new web3.eth.Contract(abiHTLC, htlcGoerli.address);

        const myData = myContract.methods.setSwap(
            walletBen, 
            AnnaERC20.address, 
            hashlock, 
            timelock, 
            tokenAmount
        ).send({from: walletAnna})
/*
        const txObject = {
            from: walletAnna,
            to: htlcGoerli.address,
            gasLimit: web3.utils.toHex(2100000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('6', 'gwei')),
            data: myData
        }

        const raw = web3.eth.accounts.signTransaction(txObject, secrets.privateKeyAnna)
        web3.eth.sendSignedTransaction(raw).on("receipt", console.log)

        /*
        web3.eth.getTransactionCount(walletAnna, (err, txCount) => {
            // Build the transaction
            const txObject = {
                nonce:    web3.utils.toHex(txCount),
                to:       htlcGoerli.address,
                value:    web3.utils.toHex(web3.utils.toWei('0', 'ether')),
                gasLimit: web3.utils.toHex(2100000),
                gasPrice: web3.utils.toHex(web3.utils.toWei('6', 'gwei')),
                data: myData  
            }
            // Sign the transaction
            const tx = new Tx(txObject);
            tx.sign(privateKeyAnna);

            const serializedTx = tx.serialize();
            const raw = '0x' + serializedTx.toString('hex');

            // Send the transaction
            web3.eth.sendSignedTransaction(raw).on("receipt", console.log)
        });
*/

        //const firstSwap = await htlcGoerli.setSwap(walletBen, AnnaERC20.address, hashlock, timelock, tokenAmount, {from: walletAnna})

        //annaContractId = (firstSwap.logs[0].args).contractId

        //assert.equal(await AnnaERC20.balanceOf(walletAnna), 65) //initialBalance - tokenAmount)
        assert.equal(await AnnaERC20.balanceOf(htlcGoerli.address), 5) // tokenAmount)
    })
/*
    it("Ben responds and set ups a swap with Anna", async () => {
        await HashedTimelockERC20.setProvider(providerRopsten)
        const timelock = (Math.floor(Date.now() / 1000)) + 3
        await BenERC20.approve(htlcRopsten.address, tokenAmount, {from: walletBen})
        const secondSwap = await htlcRopsten.setSwap(walletAnna, BenERC20.address, hashlock, timelock, tokenAmount, {from: walletBen})

        benContractId = (secondSwap.logs[0].args).contractId

        //assert.equal(await BenERC20.balanceOf(walletBen), 60) //initialBalance - tokenAmount)
        //assert.equal(await BenERC20.balanceOf(htlcRopsten.address), 40) //tokenAmount)
    })
/*
    it("Anna claims the Ben tokens with the secret", async () => {
        await HashedTimelockERC20.setProvider(providerRopsten)
        await htlcRopsten.claim(benContractId, secretKey, {from: walletAnna})

        //assert.equal(await BenERC20.balanceOf(walletAnna), 10)
        //assert.equal(await BenERC20.balanceOf(htlcRopsten.address), 5)

        const contractInstance = await htlcRopsten.getContract.call(benContractId);
        assert.equal(contractInstance[5], secretKey)
        assert.isTrue(contractInstance[7])
        assert.isFalse(contractInstance[8])

        publicSecret = contractInstance[5]
    })

    it("Ben claims the Anna tokens after seeing the publicly avaible secret", async () => {
        await HashedTimelockERC20.setProvider(providerGoerli)
        await htlcGoerli.claim(annaContractId, publicSecret, {from: walletBen})

        //assert.equal(await AnnaERC20.balanceOf(walletBen), 10)
        //assert.equal(await AnnaERC20.balanceOf(htlcGoerli.address), 5)

        const contractInstance = await htlcGoerli.getContract.call(annaContractId)
        assert.equal(contractInstance[5], publicSecret)
        assert.isTrue(contractInstance[7])
        assert.isFalse(contractInstance[8])
    })
*/
})

/*
  1) Contract: Hashed Timelock Contract Cross Chain Swap with ERC20 Tokens
       Anna initiates a swap with Ben:
     TypeError: e.toLowerCase is not a function
      at Context.<anonymous> (test/testnet/htlcCrossChain.js:70:25)         approve
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:97:5)

  2) Contract: Hashed Timelock Contract Cross Chain Swap with ERC20 Tokens
       Ben responds and set ups a swap with Anna:
     Error: Returned error: The method eth_sendTransaction does not exist/is not available
      at Context.<anonymous> (test/testnet/htlcCrossChain.js:82:24)         approve
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:97:5)

  3) Contract: Hashed Timelock Contract Cross Chain Swap with ERC20 Tokens
       Anna claims the Ben tokens with the secret:
     TypeError: Cannot read property 'substring' of undefined
      at Context.<anonymous> (test/testnet/htlcCrossChain.js:93:27)         claim
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:97:5)

  4) Contract: Hashed Timelock Contract Cross Chain Swap with ERC20 Tokens
       Ben claims the Anna tokens after seeing the publicly avaible secret:
     TypeError: Cannot read property 'substring' of undefined
      at Context.<anonymous> (test/testnet/htlcCrossChain.js:108:26)        claim
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (internal/process/task_queues.js:97:5)
 */ 