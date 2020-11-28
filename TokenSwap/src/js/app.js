App = {

    web3Provider: null,
    contracts: {},
    account: '0x0',
    loading: false,
    tokenPrice: 0,


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
    //FIXME
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
        }).done(function () {
            $.getJSON('../build/contracts/TokenSwapCoin.json', function (data) {
                var TokenSwapCoinArtifact = data;
                App.contracts.TokenSwapCoin = TruffleContract(TokenSwapCoinArtifact);
                App.contracts.TokenSwapCoin.setProvider(App.web3Provider);
                var input_address_token = $('#input-address-token').val();
                App.contracts.TokenSwapCoin.at(input_address_token).then(function (TokenSwapCoin) {
                    console.log("Token address: ", TokenSwapCoin.address);
                    return TokenSwapCoin.balanceOf("0x7885c1BFE70624Cf6C83a784dE298AC53CA63CF5");
                })
                //  return App.render();
                return App.renderHomepage();
            })
        });
    },


    testContracts: function () {
        console.log("testContracts was executed");
        var input_address_token = $('#input-address-token').val();
        App.contracts.TokenSwapCoin.at("0x3f543AAC9B7b905A12b8a827DDD0F7898b279387").then(function (instance) {
            TokenSwapCoinInstance = instance;
            var user_account = $('#accountAddress').val();
            return TokenSwapCoinInstance.balanceOf("0x7885c1BFE70624Cf6C83a784dE298AC53CA63CF5");
        }).then(function (balance) {
            console.log(balance.toNumber());
            return TokenSwapCoinInstance.balanceOf("0x31281336c2e70E1D816b0be3f7b036Dbd14308d8");
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
        web3.eth.getAccounts(function (err, account) {
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
        console.log("ContractId", contractId);
        return App.testContracts();
    },

    // acts as function that renders the entire app
    render: function () {
        if (App.loading) {
            return;
        }
        App.loading = true;

        var loader = $('#loader');
        var content = $('#content');

        loader.show();
        content.hide();


        /*
        // display total token supply on the whole network
        App.contracts.TokenSwapCoin.deployed().then(function (instance) {
            TokenSwapCoinInstance = instance;
            return TokenSwapCoinInstance.totalSupply();
        }).then(function (totalSupply) {
            App.totalSupply = totalSupply;
            $('#token-totalSupply').html(App.totalSupply.toNumber());
            return TokenSwapCoinInstance.address;
        }).then(function (tokenContractAddress) {
            App.tokenContractAddress = tokenContractAddress;
            $('#tokenContractAddress').html("Token Contract Address on the Network (Token): " +
                App.tokenContractAddress);
            return TokenSwapCoinInstance.symbol();
        }).then(function (symbol) {
            //$('#token-balance').html("You currently have " + balance.toNumber() + " Token");
            $('.token-symbol').html(symbol);
            return TokenSwapCoinInstance.balanceOf(App.account);
        })
            .then(function (balance) {
                //$('#token-balance').html("You currently have " + balance.toNumber() + " Token");
                $('#token-balance').html(balance.toNumber());
                console.log(balance.toNumber());
            })
        // show everything
        App.loading = false;
        loader.hide();
        content.show();

         */
    }
}

// whenever window loads, initialize app
$(function () {
    $(window).load(function () {
        App.init();
    })
});

