pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestCoin is ERC20 {
  uint public initialSupply = 100000000000;
  constructor() public ERC20("TestCoin", "TCN") {
      _mint(msg.sender, initialSupply);
  }
}