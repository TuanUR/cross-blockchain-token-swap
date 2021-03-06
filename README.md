# Cross-Blockchain Token-Swap with Ethereum
This project proposes an atomic swap protocol that can be summarized as follows:

it enables a
- safe exchange of two ERC-20 tokens
- with another (unfamiliar) party
- that is on another blockchain
- following a traceable and comprehensible procedure 
- without the need for a trusted third party

Atomic swaps incorporate two principles:

1. All swaps happen, when all parties comply to the rules and the specified conditions are met
2. Everyone is refunded in case of anyone misbehaving

We realize this atomic swap with a Hashed Timelock Contract (HTLC). At its core, our HTLC is an agreement that stores ERC-20 tokens for an arbitrary amount of time while being cryptographically secured. This can be accomplished by hash- and timelocks:

- Hashlock: The hash *H(s)* locks the tokens and the recipient must provide the secret preimage *s* of *H(s)* to receive the tokens
- Timelock: During this predetermined amount of time the recipient can claim the tokens and after the timeout elapses the original sender of the tokens can refund 

This project was conducted during the course of our bachelor studies at the University of Regensburg, Germany.


<!-- Table of Contents -->
## Table of Contents
* [Technologies](#technologies)
* [Project Setup](#project-setup)
* [HTLC Interface](#htlc-interface)
* [Run the Tests](#run-the-tests)
* [Using the DApp](#using-the-dapp)
* [Sources](#sources)



<!-- Technologies -->
## Technologies 
-	Solidity v0.6.0 
-	Bootstrap v3.3.7
-	jQuery v1.12.4
-	HTML 5
-	CSS
-	JavaScript


<!-- Projecr Setup-->
## Project Setup


Fork this repository and cd into it:
```
git clone https://github.com/TuanUR/cross-blockchain-token-swap

cd cross-blockchain-token-swap
```


### Installation
1.	npm (v6.14.6 or above)
```
npm install
```
2. truffle (v5.1.53 or above)
```
npm install truffle
```
3.  @openzeppelin/contracts (v3.4.0 or above)
```
npm install @openzeppelin/contracts
```
4. truffle-hdwallet-provider (v1.0.17 or above)
```
npm install truffle-hdwallet-provider
```
5. web3 (v1.3.4 or above)
```
npm install web3
```

<!-- Interface -->
## HTLC Interface

**HashedTimelockERC20**

1. ```newSwap(receiver, tokenContract, hashlock, timelock, tokenAmount)``` create a new swap with receiver address, ERC20 token contract address, hashlock, expiry, and number of tokens <br />
2. ```claim(swapId, secret)``` receiver can claim tokens by revealing the secret prior to the expiry of the time limit <br />
3. ```refund(swapId)``` sender can refund tokens by calling this method after the expiry of the time limit <br />

The HTLCs are already deployed on the public testnetworks Goerli, Rinkeby and Ropsten with the following contract addresses:

- **Goerli network: 0x728A89dEF6C372c10b6E111A4A1B6A947fC7B7d6** <br />
- **Rinkeby network: 0x5015529D5674E8Ea79902236bC234c0BFD92dF11** <br />
- **Ropsten network: 0xe29135e6C6869c296287d6afd381c9ae5E76730F**



<!-- Run the Tests -->
## Run the Tests

Install ganache (for local testing) https://www.trufflesuite.com/ganache

Install the following dependencies
```
npm install ethereumjs 
npm install truffle-assertions
```


#### Ganache (Local Ethereum Blockchain)

To test the cross chain swap, make sure to launch **two ganache blockchains** (double-click on the icon in Windows 10) and set one port number to **7545** and the other to **8545**:

RPC SERVER of the **first** ganache chain: HTTP://127.0.0.1:7545 <br />
RPC SERVER of the **second** ganache chain: HTTP://127.0.0.1:8545

To run the truffle test on ganache, run the following commands for a specific test (at this point truffle does not support running all of the tests in the folder).

Command for HTLC test:
```
$ truffle test ./test/ganache/htlc.js --network development
```
End result:
```
 Contract: HashedTimelockERC20
    ✓ getSwap() fails when swap doesn't exist (129ms)
    setSwap() test different scenarios:
      ✓ setSwap() creates new swap, stores and emits event correctly (992ms)
      ✓ setSwap() should fail with no approvement (233ms)
      ✓ setSwap() should fail when zero tokens are approved (1062ms)
      ✓ setSwap() should fail when approver has no tokens (529ms)
      ✓ setSwap() should fail with a duplicate swap request (449ms)
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
```
Command for on-chain token swap test:
```
  $ truffle test ./test/ganache/htlcChain.js --network development
```
End result:
```
    Contract: HashedTimelock On-Chain Swap between two ERC20 Tokens
    Test the swap scencario:
      ✓ 1) Anna initiates a swap with Ben (1005ms)
      ✓ 2) Ben responds and set ups a swap with Anna (2047ms)
      ✓ 3) Anna claims the Ben tokens with the secret (1571ms)
      ✓ 4) Ben claims the Anna tokens after seeing the publicly available secret (1276ms)
    Test the refund scenario:
      ✓ 1) Anna initiates a swap with Ben (475ms)
      ✓ 2) Ben responds and set ups a swap with Anna (568ms)
      ✓ 3) Anna does not claim, so Ben refunds (5sec timeout) (5513ms)
      ✓ 4) Anna refunds after Ben refunded (339ms)


  8 passing (18s)
```
Command for cross-chain token swap test:
```
  $ truffle test ./test/ganache/htlcChrossChain.js --network development
```
End result:
```
    Contract: HashedTimelock Cross-Chain Swap between two ERC20 Tokens
    ✓ Anna and Ben have the right balances on their chain (387ms)
    Test the swap scencario:
      ✓ 1) Anna initiates a swap with Ben (560ms)
      ✓ 2) Ben responds and set ups a swap with Anna (1165ms)
      ✓ 3) Anna claims the Ben tokens with the secret (712ms)
      ✓ 4) Ben claims the Anna tokens after seeing the publicly available secret (372ms)
    Test the refund scenario:
      ✓ Cross-chain swap is set up with 5sec timeout on both sides (6855ms)


  6 passing (14s)
  
```


#### Goerli and Rinkeby (Public Ethereum Test Blockchains) 


##### Configuration

Add ```secret.json``` with the corresponding values for the hd-wallet-provider and the tests:
```
{
    "mnemonic": "your mnemonic",  
    "infuraApiKey": "your infura project id", 
    "privateKeyAnna" : "your first account's private key", 
    "privateKeyBen": "your second account's private key"
}
```


##### Prerequisites

Deploy the ERC-20 token contracts ```Coin.sol``` together with ```AnnaERC20.sol``` on **Goerli** and ```BenERC20.sol``` on **Rinkeby** in the contracts folder. Note that you should comment the specific ```deployer.deploy(contract.sol)``` out before launching these contracts on the network. Additionally, after deploying the ```BenERC20.sol``` move all of the tokens assigned to the deployer account to the **other** account: 

```
$ truffle migrate --network goerli
$ truffle migrate --network rinkeby

truffle(rinkeby)> benerc20 = await BenERC20.deployed()
truffle(rinkeby)> accounts = await web3.eth.getAccounts()
truffle(rinkeby)> benerc20.transfer(accounts[1], 100)
```

The outcome should look like this:

**Goerli**

1. Account: 100 AnnaERC20 tokens
2. Account: 0 AnnaERC20 tokens

**Rinkeby**

1. Account: 0 BenERC20 tokens
2. Account: 100 BenERC20 tokens


#### HTLC Test

To check different scenarios and the resulting behavior of all the core functions, run this command:
```
$ truffle test ./test/goerli/htlc.js --network goerli
```

Final result:
```
  Contract: HashedTimelockERC20 on Test Network Goerli
    ✓ getSwap() fails when swap doesn't exist (827ms)
    setSwap() test different scenarios:
      ✓ setSwap() creates new swap, stores and emits event correctly (37031ms)
      ✓ setSwap() should fail with no approvement (28976ms)
      ✓ setSwap() should fail when zero tokens are approved (29698ms)
      ✓ setSwap() should fail when approver has no tokens (44919ms)
      ✓ setSwap() should fail with a duplicate swap request (44567ms)
      ✓ setSwap() should fail when timelock is in the past (44952ms)
    claim() test different scenarios:
      ✓ claim() should send tokens when given the correct secret and emits event correctly (14670ms)
      ✓ claim() should fail after claimed swap (13210ms)
      ✓ claim() should fail when given the false secret (60515ms)
      ✓ claim() should fail if caller is not receiver (15362ms)
      ✓ claim() should fail after timelock expiry (88244ms)
    refund() test different scenarios:
      ✓ refund() should work after timelock expiry and emits event correctly (30420ms)
      ✓ refund() should fail after refunded swap (29063ms)
      ✓ refund() should fail before timelock expiry (59448ms)
      ✓ refund() should fail if caller is not sender (14480ms)
      ✓ refund() should work after timelock expiry (needed due to a newSwap) (89610ms)


  17 passing (11m)
```


#### Cross-Chain Testing

Run the command for a specific test:
```
$ truffle test ./test/goerli/htlcCrossChainRinkeby.js --network goerli
```

Final result:
```
  Contract: Cross-Chain Token Swap on Test Networks Goerli and Rinkeby
    ✓ initialization of web3 for Goerli
    ✓ initialization of web3 for Rinkeby
Anna goerli: 100
Ben goerli: 0
HTLC goerli: 0
Ben rinkeby: 100
Anna rinkeby: 0
HTLC rinkeby: 0
    ✓ show balances of Anna and Ben on Goerli and Rinkeby (847ms)
    Anna and Ben do a successful token swap on Goerli and Rinkeby
swapId goerli: 0x9a05f1567e0399301590024b0ac68bcef7be9f8a03898962ba634b929a9e9592
      ✓ approve() and setSwap() from Anna works on Goerli (34422ms)
swapId rinkeby: 0xc295cb34dece6cb645fa5d4f2a67862d52b4dc0211d4c3234809e424fc21a0ba
      ✓ approve() and setSwap() from Ben works on Rinkeby (19240ms)
      ✓ claim() BenERC20 on Rinkeby from Anna works with secret (14975ms)
      ✓ claim() AnnaERC20 on Goerli from Ben works with published secret (8038ms)
Anna goerli: 95
Ben goerli: 5
HTLC goerli: 0
Ben rinkeby: 95
Anna rinkeby: 5
HTLC rinkeby: 0
      ✓ final balances of Anna and Ben on Goerli and Rinkeby (855ms)
    Anna and Ben get refunded if they don't claim
Anna goerli: 95
Ben goerli: 5
Ben rinkeby: 95
Anna rinkeby: 5
      ✓ show balances of Anna and Ben on Goerli and Rinkeby (531ms)
swapId goerli: 0x6c0ab3f71ed8e2f5fad32b19ab90387636cf5b7c2f640952baac9c5f9b68b66b
      ✓ approve() and setSwap() from Anna works on Goerli (27314ms)
swapId rinkeby: 0xe3321dc1f34f2011e0b3343304f6c8188227994a87304c1631bf45f3d7ea4a6a
      ✓ approve() and setSwap() from Ben works on Rinkeby (21368ms)
Anna goerli: 90
Ben goerli: 5
Ben rinkeby: 90
Anna rinkeby: 5
      ✓ show balances of Anna and Ben on Goerli and Rinkeby (548ms)
      ✓ Anna does not claim, so Ben refunds his BenERC20 (26759ms)
      ✓ Anna didnt't claim and refunds her AnnaERC20 (24715ms)
Anna goerli: 95
Ben goerli: 5
Ben rinkeby: 95
Anna rinkeby: 5
      ✓ final balances of Anna and Ben on Goerli and Rinkeby (688ms)


  15 passing (7m)
```



<!-- Refund Guide -->
## Refund Guide

If one of the tests (in the goerli folder) exited with an error having set up a swap in the process, then you want to get the tokens locked in the HTLC back, which otherwise would be stuck there. 

In order to refund keep in mind that the time limit on the swap in the HTLC has to have passed and that the swap receiver is specified as the caller of the refund function with the corresponding swapId. The swapId is obtained by searching and filtering the past events of **newSwap** via the indexed variables **sender.address** and **receiver.address**.

An exemplary refund on the Goerli network:
```
$ truffle console --network goerli

truffle(goerli)> htlc = await HashedTimelockERC20.at("0x728A89dEF6C372c10b6E111A4A1B6A947fC7B7d6")
truffle(goerli)> await htlc.getPastEvents("newSwap", { filter: {sender: "sender.address", receiver: 'receiver.address'}, fromBlock: 0, toBlock: 'latest' }) 
truffle(goerli)> htlc.refund("yourSwapId", {from: "receiver.address"})
```



<!-- Usage -->
## Using the DApp
The decentralized application enables users to interact with their existing swaps. It therefore requires an already set up swap as well as its swapId (either by searching the corresponding newSwap event or by being transmitted to the user). 
Users have the ability to inspect swap details as well as to easily execute the core functions claim() and refund() of the protocol without the need of using the command-line.

### 1. Startpage

The startpage of the interface displays relevant information, which includes the user's account address, the network he is currently on and the address of the HTLC the DApp is executing. 
Please note that if you're using a private network, you should add the contract address of your own HTLC in the source code. The same applies if you want to abstain from using the provided HTLCs at the previously mentioned addresses.

![Bildschirmfoto 2021-02-05 um 16 40 02](https://user-images.githubusercontent.com/64489139/107055186-4f3aa000-67d1-11eb-85c5-2b66e3f4b8e2.png)

The user can enter the swapId of the swap he wants to interact with in the dedicated input field to move on to the main page of the interface.
After hitting the check button, the app will check if the user is either the sender or receiver of the swap (as specified in the swap struct) during the forwarding process. An according main page of the interface will be then shown:

### 2. Main page
The main page displays the general information from the previous page as well as 
- the swapId entered by the user
- the timelock progress (= remaining time of timelock in seconds)
- either the possibility to claim or to refund

#### i.) if user is receiver (ability to claim)
The user can now enter the plaintext secret for the swap. By doing so and hitting "Claim", a pop-up window will appear with all the transaction details. By confirming the pop-up, the transaction gets executed and the user gets the funds that have been locked in the swap.

![Bildschirmfoto 2021-02-05 um 16 40 41](https://user-images.githubusercontent.com/64489139/107055978-2666da80-67d2-11eb-8b88-2140a5625a19.png)

#### ii.) if user is sender (ability to refund)
The user can hit "Refund" to refund his deposited funds. Similarly to case i.), a pop-up window will appear with all the transaction details. By confirming the pop-up, the transaction gets executed and the user gets back his funds that have been locked in the swap.

![Bildschirmfoto 2021-02-05 um 16 57 07](https://user-images.githubusercontent.com/64489139/107057021-434fdd80-67d3-11eb-96c5-e33f2b908dc3.png)




<!-- Sources -->
## Sources 
The code of the HTLC contract was inspired by hashed-timelock-contract-ethereum project on GitHub:
https://github.com/chatch/hashed-timelock-contract-ethereum
