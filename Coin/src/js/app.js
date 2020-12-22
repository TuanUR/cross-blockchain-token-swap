App = {

    web3Provider: null,
    contracts: {},
    account: '0x0',
    loading: false,
    tokenPrice: 0, //not needed?


    // init app
    init: async function () {
        console.log("App initialized...")
        return await App.initWeb3();
    },

    initWeb3: async function () {
        // Modern dapp browsers...
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        return App.renderStartpage();
    },

    // instantiate smart contract so web3 knows where to find it and
    // how it works => enables interacting with Ethereum via web3
    accessContracts: function () {
        $.getJSON('../build/contracts/HashedTimelockERC20.json', function (data) {
            // Get the necessary contract artifact file
            // (= information about contract, e.g. deployed address etc.)
            var HashedTimelockERC20Artifact = data;
            // instantiate truffle contract with TruffleContract()
            App.contracts.HashedTimelockERC20 = TruffleContract(HashedTimelockERC20Artifact);
            // set the web3 provider for the contract
            App.contracts.HashedTimelockERC20.setProvider(App.web3Provider);

            console.log("accessContracts was executed");
            var input_address_htlc = $('#input-address-htlc').val();
            App.contracts.HashedTimelockERC20.at(input_address_htlc).then(function (HashedTimelockERC20) {
                console.log("HashedTimelock contract address: ", HashedTimelockERC20.address);
            });
            return App.renderHomepage();
        })
            /* try with coin disabled - not needed at all?
            .done(function () {
            $.getJSON('../build/contracts/Coin.json', function (data) {
                var CoinArtifact = data;
                App.contracts.Coin = TruffleContract(CoinArtifact);
                App.contracts.Coin.setProvider(App.web3Provider);
                var input_address_token = $('#input-address-token').val();
                App.contracts.Coin.at(input_address_token).then(function (Coin) {
                    console.log("Token address: ", Coin.address);
                    return Coin.balanceOf("0x7885c1BFE70624Cf6C83a784dE298AC53CA63CF5");
                })
                //  return App.render();

            })
        });
        */
    },

    // for development only - might delete now
    testContracts: function () {
        console.log("testContracts was executed");
        var input_address_token = $('#input-address-token').val();
        //change Coin address to anna or ben token-address if you want to use them instead of testtoken(TTN)
        App.contracts.Coin.at("0xA5A38796Ec3dF359dB128D10f8385bEf6378A741").then(function (instance) {
            CoinInstance = instance;
            var user_account = $('#accountAddress').val();
            return CoinInstance.balanceOf("0x7885c1BFE70624Cf6C83a784dE298AC53CA63CF5");
        }).then(function (balance) {
            console.log(balance.toNumber());
            return CoinInstance.balanceOf("0x31281336c2e70E1D816b0be3f7b036Dbd14308d8");
        }).then(function (balance) {
            console.log(balance.toNumber());
        })
    },

    // render the startpage, where the user enters the contract addresses he deployed on the blockchain
    renderStartpage: function () {
        var startpage = $('#startpage');
        var homepage = $('#content');
        startpage.show();
        homepage.hide();

        // Load account data and display on startpage (account that is currently used e.g. on MetaMask)
        web3.eth.getCoinbase(function (err, account) {
            if (err) {
                console.log(err);
            } else {
                App.account = account;
                // quering for the account address on the DOM
                $('#accountAddress').html(account);
            }
        })
    },

    renderHomepage: function () {
        console.log("Render homepage was executed");
        var startpage = $('#startpage');
        var homepage = $('#content');
        startpage.hide();
        homepage.show();
        var contractId = $("#input-contractId").val();
        $("#contractId-info").html(contractId);
        $("#refund-contractId").html(contractId);
        return App.timelockProgress();   // for future development
        //return App.testContracts();       deprecated
    },

    claim: function () {
        console.log("Executed claim function");
        const contractId = $("#input-contractId").val();
        const secret = $("#secret-claim").val();
        console.log(secret);
        var input_address_htlc = $('#input-address-htlc').val();
        App.contracts.HashedTimelockERC20.at(input_address_htlc).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.claim(contractId, secret, {
                from: App.account,
                gas: 500000 // gas limit
            });
        }).then(function (err, result) {
            if (err) {
                console.log(err);
            } else {
                console.log("Claim was successful!");
                $("form").trigger("reset");
            }
        });
    },

    refund: function () {
        console.log("Executed refund function");
        const contractId = $("#input-contractId").val();
        const input_address_htlc = $('#input-address-htlc').val();
        console.log(contractId);
        App.contracts.HashedTimelockERC20.at(input_address_htlc).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.refund(contractId, {
                from: App.account,
                gas: 500000
            });
        }).then(function(err, result) {
            if (err) {
                console.log(err)
            } else {
                alert("refund was successful!");
                $("form").trigger("reset");
            }
        });
    },

    // shows the timelock in percent in the progress bar on the homepage
    //FIXME: fires metamask transaction, that has to be confirmed specifically

    //idea: use getContract(contractId).call() to not need a pop up window (web3 function)
    //then calculate remaining time by using date.now() somehow
    //timelock - date.now() = remaining time 
    //timelock should be result[6]

    timelockProgress: function () {
        console.log("timelockProgress was executed");
        const contractId = $("#input-contractId").val();
        const input_address_htlc = $('#input-address-htlc').val();
        App.contracts.HashedTimelockERC20.at(input_address_htlc).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.getContract(contractId);
        }).then(function(result){
            //to be tested => does this display the right remaining time?
            console.log(result[6].toNumber() - Date.now());
        })
    },

    testCall: function() {
        const input_address_htlc = $('#input-address-htlc').val();
        App.contracts.HashedTimelockERC20.at(input_address_htlc).then(function (HashedTimelockERC20) {
            console.log("success");
            //return HashedTimelockERC20.getContract("0x8c8079aa503f69367cb38778f54ac3a6c8f61a4a1d183b96f9381577353e2e79");
        }).then(function (result) {
            console.log(result);
        })
    }
}

// whenever window loads, initialize app
$(function () {
    $(window).load(function () {
        App.init();
    })
});
