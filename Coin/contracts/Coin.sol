pragma solidity ^0.6.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Coin is ERC20 {
    uint public initialSupply = (100 * 10 ** 18);
    constructor() public ERC20("myCoin", "MCN") {
        _mint(msg.sender, initialSupply);
    }
}