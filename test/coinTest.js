/*const Coin = artifacts.require('Coin');

contract('Coin', accounts => {
    let token;
    const owner = accounts[0];
    const recipient = accounts[1];
    const initialSupply = 100;

    beforeEach(async () => {
        token = await Coin.new();
    });

    describe("Token parameters", function () {
        it('has initial supply', async () => {
            const supply = await token.initialSupply();
            assert.equal(supply, initialSupply, 'wrong supply');
        });

        it("is given name", async () => {
            const tokenName = await token.name();
            assert.equal(tokenName, "myCoin", "name is incorrect");
        });

        it("is given symbol", async () => {
            const tokenSymbol = await token.symbol();
            assert.equal(tokenSymbol, "MCN", "symbol is incorrect")
        });

        it("has given decimals", async () => {
            const tokenDecimals = await token.decimals();
            assert.equal(tokenDecimals, 0, "decimals are incorrect");
        });
    });

    describe("_mint", function () { 
        it("should return initial balances", async () => {
            const owner_balance = (await token.balanceOf.call(owner)); // nicht nötig => .toNumber();
            const recipient_balance = (await token.balanceOf.call(recipient)); // .toNumber();

            assert.equal(owner_balance, initialSupply, "owner's balance is incorrect");
            assert.equal(recipient_balance, 0, "recipient's balance is incorrect");
        });
    });

    describe("transfer", function () {
        it("transfer returns true", async () => {
            assert.isTrue((await token.transfer.call(accounts[2], 0, {from: owner})));
        })

        it("transfer from token", async () => {
            const result = await token.transfer(recipient, 20, {from: owner});
            assert.equal(result.receipt.status, true);
            const newBalance = await token.balanceOf(recipient);
            const oldBalance = await token.balanceOf(owner);
            assert.equal(oldBalance, 80, "old balance does not match");
            assert.equal(newBalance, 20, "new balance does not match");
            //console.log(oldBalance);
            //console.log(newBalance);
        })

        it("transfer right amount to right account", async () => {
            const token2 = await Coin.new();
            const amount = 3; // overflow if amount exceeds 10 ** 18
            const initial_owner_balance = (await token2.balanceOf.call(owner));// .toString();
            
            await token2.transfer(recipient, amount, {from: owner});
            
            const owner_balance = (await token2.balanceOf.call(owner));// .toString();
            const recipient_balance = (await token2.balanceOf.call(recipient));// .toString();

            assert.equal(owner_balance, (initial_owner_balance - amount), "owner's balance does not match");
            assert.equal(recipient_balance, amount, "recipient's balance does not match");

        });

        /*
        it("should show each balance", async () => {
            const owner_balance = (await token.balanceOf(owner));
            const recipient_balance = (await token.balanceOf(recipient));

            console.log(owner_balance);
            console.log(recipient_balance);
        });
        */
/*
        const amount = 30;
        const sender = accounts[2];

            it("approve returns true", async () => {
                assert.isTrue(await token.approve.call(sender, amount)); //.toString()));
            });

            it("allowance works fine", async () => {
                await token.approve(sender, amount); //.toString());
                const allowance = await token.allowance(owner, sender);
                assert.equal(allowance, amount, "allowance and amount don't equal");
            });
            
            it("transferFrom works fine", async () => {
                await token.approve(sender, amount); //.toString());
                await token.transferFrom(owner, recipient, amount, {from: sender});
                const owner_balance = (await token.balanceOf.call(owner));//.toString();
                const recipient_balance = (await token.balanceOf.call(recipient));//.toString();
                assert.equal(owner_balance, initialSupply - amount, "owner balance is incorrect");
                assert.equal(recipient_balance, amount, "recipient is incorecct");
            });
            
    });
})*/
