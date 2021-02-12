//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// A basic token used for testing the functionalities of the HashedTimelockERC20

contract Coin is ERC20 {
    uint256 _initialBalance = 100;

    constructor() public ERC20("TokenSwapCoin", "TSC") {
        _setupDecimals(0);
        _mint(msg.sender, _initialBalance);
    }
}