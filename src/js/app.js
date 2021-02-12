App = {

    web3Provider: null,
    network: null,
    contracts: {},
    contractAddress: "",
    account: '0x0',
    loading: false,


    // init app
    init: async function () {
        console.log("App initialized...")
        return await App.initWeb3();
    },

    initWeb3: async function () {
        // modern dapp browsers
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                // request account access
                await window.ethereum.enable();
            } catch (error) {
                // user denied account access
                console.error("User denied account access")
            }
        }
        // in case of legacy dapp browsers
        else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
        App.network = web3.version.network;
        // detect network and set account address accordingly
        switch (App.network) {
            case "1":
                var net_name = "Main"
                break
            case "3":
                net_name = "Ropsten Testnet"
                App.contractAddress = "0xe29135e6C6869c296287d6afd381c9ae5E76730F"
                break
            case "4":
                net_name = "Rinkeby Testnet"
                App.contractAddress = "0x5015529D5674E8Ea79902236bC234c0BFD92dF11"
                break
            case "5":
                net_name = "Goerli Testnet"
                App.contractAddress = "0x728A89dEF6C372c10b6E111A4A1B6A947fC7B7d6"
                break
            default:
                net_name = "Unknown / Private"
                // add your own HTLC address if you're using private network (Ganache etc.)
                App.contractAddress = "0xc01fE71374ea0C5960f6d1B8cBe2F2E5B2992De0"
        }
        // display current network and htlc details on homepage
        $('#currentNetwork').html(net_name);
        $('#contractAddress').html(App.contractAddress);
        return App.renderStartpage();
    },

    // instantiate smart contract so web3 knows where to find it and
    // enables interacting with Ethereum via web3
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
            App.contracts.HashedTimelockERC20.at(App.contractAddress).then(function (HashedTimelockERC20) {
                console.log("HashedTimelock contract address: ", HashedTimelockERC20.address);
            });
            return App.renderHomepage();
        })
    },

    // for development only - might delete now
    testContracts: function ()
    {
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

    // render the startpage
    renderStartpage: function () {
        var startpage = $('#startpage');
        var homepage = $('#content');
        var loader = $('#loader');

        loader.hide();
        startpage.show();
        homepage.hide();

        // load account data and display on startpage (e.g. account that is currently used on MetaMask)
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

    // render main page of the interface
    renderHomepage: function () {
        console.log("Render homepage was executed");
        var startpage = $('#startpage');
        var homepage = $('#content');
        var claimPage = $('#claim');
        var refundPage = $('#refund');
        var allContent = $('#all-content');
        var loader = $('#loader');

        allContent.hide();
        startpage.hide();
        homepage.show();
        loader.show();

        // get swapId from user input and also display it on the interface
        var swapId = $("#input-swapId").val();
        $("#swapId-info").html(swapId);
        $("#refund-swapId").html(swapId);

        /*
        get swap details with getSwap, then determine if user is either sender or receiver of swap
        and display an according interface
         */
        App.contracts.HashedTimelockERC20.at(App.contractAddress).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.getSwap(swapId);
        }).then(function (result) {
            if (App.account === result[0]) {
                claimPage.hide();
            } else if (App.account === result[1]) {
                refundPage.hide();
            } else {
                location.reload();
                alert("Not Sender nor Receiver!");
            }
            loader.hide();
            allContent.show();
        })
        return App.timelockProgress();
    },

    // execute claim function of underlying HTLC
    claim: function () {
        console.log("Executed claim function");
        const swapId = $("#input-swapId").val();
        const secret = $("#secret-claim").val();
        console.log(secret);
        App.contracts.HashedTimelockERC20.at(App.contractAddress).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.claim(swapId, secret, {
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

    // execute refund function of underlying HTLC
    refund: function () {
        console.log("Executed refund function");
        const swapId = $("#input-swapId").val();
        App.contracts.HashedTimelockERC20.at(App.contractAddress).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.refund(swapId, {
                from: App.account,
                gas: 500000
            });
        }).then(function (err, result) {
            if (err) {
                console.log(err)
            } else {
                $("form").trigger("reset");
            }
        });
    },

    //TODO [IDEA]: implement a progress bar that shows timelock expiry in percent
    timelockProgress: function () {
        console.log("timelockProgress was executed");
        const swapId = $("#input-swapId").val();
        App.contracts.HashedTimelockERC20.at(App.contractAddress).then(function (HashedTimelockERC20) {
            return HashedTimelockERC20.getSwap(swapId);
        }).then(function (result) {
            //to be tested => does this display the right remaining time?
            //console.log("DateNow in sec", Math.floor(Date.now() / 1000));
            // console.log("timelock in sec", result[6].toNumber());
            const timelock = result[6].toNumber();
            console.log("remaining", result[6].toNumber() - Math.floor(Date.now() / 1000));
            const remaining = result[6].toNumber() - Math.floor(Date.now() / 1000);
            var progressPercent = (Math.ceil(remaining) / timelock) * 100;
            $('#progress').css('width', progressPercent + '%');
            $('#remaining-time').html(remaining);
        })
    }
}

// whenever window loads, initialize app
$(function () {
    $(window).load(function () {
        App.init();
    })
});

