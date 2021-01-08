# Cross-Blockchain Token-Swap with Ethereum
This is a comprehensible swap protocol that enables exchanging assets on and between different blockchains on the Ethereum network with the help of Hashed Timelock Contracts (HTLC).

This project was conducted during the course of our bachelor studies at the University of Regensburg, Germany.

## Table of contents
* [Technologies](#technologies)
* [Setup](#setup)
* [Installing](#installing)
* [Running the tests](#running-the-tests)
* [Usage](#usage)
* [Sources](#sources)

## Technologies 
-	Solidity v0.6.0 
-	Bootstrap v3.3.7
-	jQuery v1.12.4
-	HTML 5
-	CSS
-	JavaScript

## Setup
Fork this repository and cd into it:
```
git clone https://github.com/TuanUR/Projektseminar

cd Projektseminar
```
To run this project, install the following dependencies locally:
1.	npm (v6.14.6 or above)
2.	truffle (v5.1.53 or above)
3.	openzeppelin contracts
4.	hd-wallet-provider

## Installing
1.	npm 
```
npm install
```
2. truffle 
```
npm install truffle / npm -i truffle 
```
3.  @openzeppelin/contracts, containing the necessary token standards for the usage of ERC-20 tokens
```
npm install @openzeppelin/contracts
```
4. truffle-hdwallet-provider
```
npm install truffle-hdwallet-provider
```

## Running the tests
To run the truffle test, you need to install the following dependencies locally

Install ganache https://www.trufflesuite.com/ganache
```
npm install ethereumjs 
npm install truffle-assertions
```

#### Ganache (Local Ethereum blockchain)

To test the cross chain swap, make sure to launch two ganache blockchains and set one port number to 7545 and the other to 8545:

RPC SERVER of the first ganache chain
HTTP://127.0.0.1:7545

RPC SERVER of the second ganache chain
HTTP://127.0.0.1:8545

To run the truffle test on ganache, run the command for a specific test (at this point truffle does not support running all of the tests in one of the repositories)
```
$ truffle test ./test/ganache/htlc.js --network development

 Contract: HashedTimelockERC20
    ✓ getSwap() fails when contract doesn't exist (129ms)
    setSwap() test different scenarios:
      ✓ setSwap() creates new swap, stores and emits event correctly (992ms)
      ✓ setSwap() should fail with no approvement (233ms)
      ✓ setSwap() should fail when zero tokens are approved (1062ms)
      ✓ setSwap() should fail when approver has no tokens (529ms)
      ✓ setSwap() should fail with a duplicate contract request (449ms)
      ✓ setSwap() should fail when timelock is in the past (618ms)
    claim() test different scenarions:
      ✓ claim() should send tokens when given the correct secret and emits event correctly (899ms)
      ✓ claim() should fail after claimed swap (145ms)
      ✓ claim() should fail when given the false secret (521ms)
      ✓ claim() should fail if caller is not receiver (129ms)
      ✓ claim() should fail after timelock expiry (5115ms)
    refund() test different secanrios:
      ✓ refund() should work after timelock expiry and emits event correctly (5341ms)
      ✓ refund() should fail after refunded swap (127ms)
      ✓ refund() should fail before timelock expiry (548ms)
      ✓ refund() should fail if caller is not sender (133ms)


  16 passing (19s)
  
  $ truffle test ./test/ganache/htlcChain.js --network development
  
    Contract: HashedTimelock On Chain Swap between two ERC20 Tokens
    Test the swap scencario:
      ✓ 1) Anna initiates a swap with Ben (1005ms)
      ✓ 2) Ben responds and set ups a swap with Anna (2047ms)
      ✓ 3) Anna claims the Ben tokens with the secret (1571ms)
      ✓ 4) Ben claims the Anna tokens after seeing the publicly avaible secret (1276ms)
    Test the refund scenario:
      ✓ 1) Anna initiates a swap with Ben (475ms)
      ✓ 2) Ben responds and set ups a swap with Anna (568ms)
      ✓ 3) Anna does not claim, so Ben refunds (5sec timeout) (5513ms)
      ✓ 4) Anna refunds after Ben refunded (339ms)


  8 passing (18s)
  
  $ truffle test ./test/ganache/htlcChrossChain.js --network development
  
    Contract: HashedTimelock Cross Chain Swap between two ERC20 Tokens
    ✓ Anna and Ben have the right balances on their chain (387ms)
    Test the swap scencario:
      ✓ 1) Anna initiates a swap with Ben (560ms)
      ✓ 2) Ben responds and set ups a swap with Anna (1165ms)
      ✓ 3) Anna claims the Ben tokens with the secret (712ms)
      ✓ 4) Ben claims the Anna tokens after seeing the publicly avaible secret (372ms)
    Test the refund scenario:
      ✓ Cross chain swap is set up with 5sec timeout on both sides (6855ms)


  6 passing (14s)
  
```

#### Goerli and Rinkeby (Public Ethereum test blockchains) 

Before running the specify these neccessary variables in a file named secret.json:
```
{
    "mnemonic": your mnemonic,  
    "infuraApiKey": your infura project id, 
    "privateKeyAnna" : your first account private key, 
    "privateKeyBen": your second account private key
}
```

Also make sure that you own two accounts and enough Ether to deploy and execute the token swap. One account deploys AnnaERC20 on Goerli and BenERC20 on Rinkeby and then moves all of the BenERC20 to the other account:
```
$ truffle migrate --network goerli
$ truffle migrate --network rinkeby

$ truffle console --network rinkeby
truffle(rinkeby)> benerc20 = await BenERC20.deployed()
truffle(rinkeby)> accounts = await web3.eth.getAccounts()
truffle(rinkeby)> benerc20.transfer(accounts[1], 100)
```

##### Goerli

1. Acc: 100 AnnaERC20 tokens
2. Acc: 0 AnnaERC20 tokens

##### Rinkeby

1. Acc: 0 BenERC20 tokens
2. Acc: 100 BenERC20 tokens


Run the command for a specific test
```
$ truffle test ./test/goerli/htlcCrossChainRinkeby.js --network goerli

  Contract: Test for Cross Chain Swap
    ✓ initialization of web3 for Goerli
    ✓ initialization of web3 for Rinkeby
Anna goerli: 100
Ben goerli: 0
HTLC goerli: 0
Ben rinkeby: 100
Anna rinkeby: 0
HTLC rinkeby: 0
    ✓ show balances of Anna and Ben on Goerli and Rinkeby (1501ms)
    Anna and Ben do a successful token swap on Goerli and Rinkeby
0xdba552436da1c542358a19c684be04117a9db55c4a0d25f5f6e9b52779d81cdc (swap id)
      ✓ approve and setSwap() from Anna works on Goerli (39073ms)
0x8bf02abf60cd239445f161759ceab5e7e2dcfdbf00636b3df7110bb7fed19c61 (swap id)
      ✓ approve and setSwap() from Ben works on Rinkeby (27132ms)
      ✓ claim() Ben Tokens on Rinkeby from Anna works with secret (12215ms)
      ✓ claim() Anna Tokens on Goerli from Ben works with published secret (17306ms)
Anna goerli: 95
Ben goerli: 5
HTLC goerli: 0
Ben rinkeby: 95
Anna rinkeby: 5
HTLC rinkeby: 0
      ✓ final balances of Anna and Ben on Goerli and Rinkeby (980ms)
    Test if Anna and Ben get refunded
Anna goerli: 95
Ben goerli: 5
Ben rinkeby: 95
Anna rinkeby: 5
      ✓ show balances of Anna and Ben on Goerli and Rinkeby (1054ms)
0xdc868ba5345f3cc9b5ce378c983041bb70f86804a4dd647170c51e65939c744e (swap id)
      ✓ approve and setSwap() from Anna works on Goerli (26767ms)
0x8a429f400ea7ee4fbcf5e3da6a9da701a0f6ccee040fc70fc8391a83578dc5b9 (swap id)
      ✓ approve and setSwap() from Ben works on Rinkeby (28346ms)
Anna goerli: 90
Ben goerli: 5
Ben rinkeby: 90
Anna rinkeby: 5
      ✓ show balances of Anna and Ben on Goerli and Rinkeby (657ms)
      ✓ Anna does not claim, so Ben refunds (27194ms)
      ✓ Anna didnt't claim and refunds (45494ms)
Anna goerli: 95
Ben goerli: 5
Ben rinkeby: 95
Anna rinkeby: 5
      ✓ final balances of Anna and Ben on Goerli and Rinkeby (537ms)


  15 passing (4m)
```

## Usage 
TODO

## Sources 
The code of the HTLC contract was inspired by hashed-timelock-contract-ethereum project on GitHub:
https://github.com/chatch/hashed-timelock-contract-ethereum
