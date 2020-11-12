var TokenSwapCoin = artifacts.require("TokenSwapCoin");

module.exports = function(deployer) {
    deployer.deploy(TokenSwapCoin);
}