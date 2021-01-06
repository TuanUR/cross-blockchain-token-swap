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

#### ganache 

To test the cross chain swap, make sure to launch two ganache blockchains and set one network ID to 8545 and the other to 7545

To run the truffle test on ganache, run the command for a specific test (at this point truffle does not support running tests in one of the repositories)
```
$ truffle test ./test/ganache/file.js
```

#### goerli, rinkeby and ropsten
To run the tests, make sure that two of your accounts own two different ERC20 tokens and Ether on each of these test networks. You also need to have an Infura Account and specify in a file named secret.json:
```
{
    "mnemonic": your mnemonic,  
    "infuraApiKey": your infura project id, 
    "privateKeyAnna" : your firsrt account private key, 
    "privateKeyBen": your second account private key
}
```
Run the command for a specific test
```
$ truffle test ./test/goerli/file.js
```

## Usage 
TODO

## Sources 
The code of the HTLC contract was inspired by hashed-timelock-contract-ethereum project on GitHub:
https://github.com/chatch/hashed-timelock-contract-ethereum
