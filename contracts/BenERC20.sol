//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// A basic token used in a swap with the HashedTimelockERC20

contract BenERC20 is ERC20 {
    uint256 _initialBalance = 100;

    constructor() public ERC20("BenToken", "BTN") {
        _setupDecimals(0);
        _mint(msg.sender, _initialBalance);
    }
}