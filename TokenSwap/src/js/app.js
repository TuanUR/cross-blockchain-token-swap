App = {

    web3Provider: null,
    contracts: {},


    // init app
    init: function() {
        console.log("App initialized...")
    },

    initWeb3: function() {
        web3.setProvider('ws://localhost:7545');
    }
}

// whenever window loads, initialize app
$(function() {
    $(window).load(function() {
        App.init();
    })
});

