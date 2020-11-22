const { Hash } = require("crypto");

var Coin = artifacts.require("Coin");
var HashedTimelockERC20 = artifacts.require("HashedTimelockERC20");

module.exports = function(deployer) {
    deployer.deploy(Coin);
    deployer.deploy(HashedTimelockERC20);
}