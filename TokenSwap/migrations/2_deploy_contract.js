var TokenSwapCoin = artifacts.require("TokenSwapCoin");
var HashedTimelockERC20 = artifacts.require("HashedTimelockERC20");

module.exports = function(deployer) {
    deployer.deploy(TokenSwapCoin);
    deployer.deploy(HashedTimelockERC20);
}