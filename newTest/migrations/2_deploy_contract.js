var TestCoin = artifacts.require("TestCoin");

module.exports = function(deployer) {
  deployer.deploy(TestCoin);
};