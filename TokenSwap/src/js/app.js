App = {

    web3Provider: null,
    contracts: {},


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
        return App.initContract();
    },

    // instantiate smart contract so web3 knows where to find it and
    // how it works => enables interacting with Ethereum via web3
    initContract: function () {
        $.getJSON('../build/contracts/TokenSwapCoin.json', function (data) {
            // Get the necessary contract artifact file
            // (= information about contract, e.g. deployed address etc.)
            var TokenSwapCoinArtifact = data;
            // instantiate truffle contract with TruffleContract()
            App.contracts.TokenSwapCoin = TruffleContract(TokenSwapCoinArtifact);
            // set the web3 provider for the contract
            App.contracts.TokenSwapCoin.setProvider(App.web3Provider);

            // deployment for testing
            App.contracts.TokenSwapCoin.deployed().then(function(TokenSwapCoin) {
                console.log("Token address: ", TokenSwapCoin.address);
            });

        });
    }


}

// whenever window loads, initialize app
$(function () {
    $(window).load(function () {
        App.init();
    })
});

