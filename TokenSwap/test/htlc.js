const HashedTimelockERC20 = artifacts.require("HashedTimelockERC20");
const Coin = artifacts.require("Coin");

contract("HashedTimelockERC20", accounts => {
    const sender = accounts[0];
    const receiver = accounts[1];
    const initialSupply = 100;
    const tokenAmount = 10;
    const hashlock = "0x29d47406ac390709745e2da337abc011314b11d53e0a012d9d94590d722c4dee";
    const secretKey = "Cross-Blockchain Token Swap mit Ethereum";

    const FAILED_MSG = 'Returned error: VM Exception while processing transaction: ';

    let htlc;
    let coin;

    beforeEach(async () => {
        htlc = await HashedTimelockERC20.new();
        coin = await Coin.new();
    })

    it("setSwap() creates new swap and stores correct", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const result = await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});
        
        // Is the basically the same, outputs are tx, txhash, logs etc.
        //console.log(result);
        //console.log(result.receipt);

        // return contract id by getting the event
        // console.log((result.logs[0].args).contractId); // show contract id in console

        assert.equal((await coin.balanceOf(sender)), initialSupply - tokenAmount, "sender balance is false");
        assert.equal((await coin.balanceOf(htlc.address)), tokenAmount, "htlc balance is false");

        const swap = (result.logs[0].args);
        //console.log(swap); // return swap event
        const contractId = (result.logs[0].args).contractId;
        //console.log(contractId); // return contract id

        assert.equal(swap.sender, sender, "no sender match");
        assert.equal(swap.receiver, receiver);
        assert.equal(swap.tokenContract, coin.address);
        assert.equal(swap.tokenAmount, tokenAmount);
        assert.equal(swap.hashlock, hashlock);
        assert.equal(swap.timelock, timelock);

        const swapArray = await htlc.getContract.call(contractId);
        // console.log(swapArray); // show result
        
        assert.equal(swapArray[0], sender);
        assert.equal(swapArray[1], receiver);
        assert.equal(swapArray[2], coin.address);
        assert.equal(swapArray[3], tokenAmount);
        assert.equal(swapArray[4], hashlock);
        assert.equal(swapArray[5], "");
        assert.equal(swapArray[6], timelock);
        assert.isFalse(swapArray[7]); // claimed 
        assert.isFalse(swapArray[8]); // refunded
    })

    // const PREFIX = "VM Exception while processing transaction: ";

    it("setSwap() should fail when not approved or no token approved", async () => {        
       const timelock = (Math.floor(Date.now() / 1000)) + 3;
       try {
            await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});
            assert.fail("expected failure due to no approvement");
       } catch (error)  {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
           //console.log(error);
       }
    })

    it("setSwap() should fail when approved account has zero tokens", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        try{
            await coin.approve(htlc.address, tokenAmount, {from: accounts[5]});
            await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: accounts[5]});
            assert.fail("expected failure due to no tokens");
        } catch (error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

    // 
    it("setSwap() should fail when timelock is in the past", async () => {
        const pastTimelock = ((Math.floor(Date.now() / 1000)) - 1);
        await coin.approve(htlc.address, tokenAmount, {from: sender}); 
        
        try {
            await htlc.setSwap(receiver, coin.address, hashlock, pastTimelock, tokenAmount, {from: sender});
            assert.fail("expected failure due to expired timelock");
        } catch (error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

    it("setSwap() should reject a duplicate contract request", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});
        try {
            await coin.approve(htlc.address, tokenAmount, {from: sender});            
            await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});
            assert.fail("expected failure due to duplicate contract request");
        } catch(error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

    it("claim() should send tokens when given the correct secretKey", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const swapContract = await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});
        
        assert.equal(await coin.balanceOf(htlc.address), tokenAmount, "htlc has no tokens");
        
        const contractId = (swapContract.logs[0].args).contractId;
        await htlc.claim(contractId, secretKey, {from: receiver});

        assert.equal(await coin.balanceOf(sender), initialSupply - tokenAmount, "sender balance is wrong");
        assert.equal(await coin.balanceOf(receiver), tokenAmount, "receiver balance is wrong");
        assert.equal(await coin.balanceOf(htlc.address), 0, "htlc balance is wrong");

        const instance = await htlc.getContract.call(contractId);

        assert.equal(instance[5], secretKey);
        assert.isTrue(instance[7]);
        assert.isFalse(instance[8]);
    })

    it("claim() should fail when given the false secretKey", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const swapContract = await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});

        const contractId = (swapContract.logs[0].args).contractId;
        const wrongSecret = "wrong";

        try {
            await htlc.claim(contractId, wrongSecret, {from: receiver});
            assert.fail("expected failure due to wrong secret");
        } catch (error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

    it("claim() should fail if caller is not receiver", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const swapContract = await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});

        const notReceiver = accounts[2];
        const contractId = (swapContract.logs[0].args).contractId;

        try {
            await htlc.claim(contractId, secretKey, {from: notReceiver});
            assert.fail("expected failure due to wrong receiver");
        } catch (error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

    it("claim() should fail after timelock expiry", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const swapContract = await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});

        const contractId = (swapContract.logs[0].args).contractId;

        return new Promise((resolve, reject) => setTimeout(async () => {
            try{
                await htlc.claim(contractId, secretKey, {from: receiver});
                reject(new Error("expected failure due to claim after timelock expired"));
            } catch(error) {
                assert.isTrue(error.message.startsWith(FAILED_MSG));
                resolve({message: "success"});
            }
        }, 5 * 1000)); // miliseconds 
    })

    it("refund() should work after timelock expiry", async () => {
        const timelock = (Math.floor(Date.now() / 1000)) + 3;
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const swapContract = await htlc.setSwap(receiver, coin.address, hashlock, timelock, tokenAmount, {from: sender});
        const contractId = (swapContract.logs[0].args).contractId;

        return new Promise((resolve, reject) => setTimeout(async () => {
            try{
                await htlc.refund(contractId, {from: sender});

                assert.equal(await coin.balanceOf(sender), initialSupply);

                const swapContract = await htlc.getContract.call(contractId);
                assert.isFalse(swapContract[7]);
                assert.isTrue(swapContract[8]);
                resolve();
            } catch(error) {
                reject(error);
            }
        }, 5 * 1000));
    })

    it("refund() should fail before timelock expiry", async () => {
        await coin.approve(htlc.address, tokenAmount, {from: sender});
        const longTimelock = (Math.floor(Date.now() / 1000) + 1800);
        const swapContract = await htlc.setSwap(receiver, coin.address, hashlock, longTimelock, tokenAmount, {from: sender});
        const contractId = (swapContract.logs[0].args).contractId;

        try {
            await htlc.refund(contractId, {from: sender});
            assert.fail("expected failure due to active timelock");
        } catch(error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

    it("getContract() fails when contract doesn't exist", async () => {
        try {
            await htlc.getContract.call("0x0");
            assert.fail("expected failure because contract doesn't exist");
        } catch (error) {
            assert.isTrue(error.message.startsWith(FAILED_MSG));
        }
    })

})