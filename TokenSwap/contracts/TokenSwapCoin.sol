pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenSwapCoin is ERC20 {
    uint public initialSupply = 100;
    constructor() public ERC20("TokenSwapCoin", "TSC") {
        _setupDecimals(0);
        _mint(msg.sender, initialSupply);
    }
}