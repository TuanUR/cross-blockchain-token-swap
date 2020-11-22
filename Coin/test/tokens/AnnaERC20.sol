pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// A basic token for testing the HashedTimelockERC20.

contract AnnaERC20 is ERC20 {
    constructor(uint256 _initialBalance) public ERC20("AnnaToken", "ATN") {
        _setupDecimals(0);
        _mint(msg.sender, _initialBalance);
    }
}