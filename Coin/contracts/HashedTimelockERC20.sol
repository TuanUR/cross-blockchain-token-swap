//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HashedTimelockERC20 {
    
    event newSwap(
        bytes32 indexed swapId,
        address indexed sender,
        address indexed receiver,
        address tokenContract,
        uint256 tokenAmount,
        bytes32 hashlock,
        uint256 timelock
    );

    event claimedSwap(bytes32 indexed swapId, string secret);

    event refundedSwap(bytes32 indexed swapId);

    struct Swap{
        address sender;
        address receiver;
        address tokenContract;
        uint256 tokenAmount;
        bytes32 hashlock;
        string secret;
        uint256 timelock;
        bool claimed;
        bool refunded;
    }

    mapping(bytes32 => Swap) storedSwaps;

    modifier swapExists(bytes32 _swapId) {
        require(storedSwaps[_swapId].sender != address(0), "swapId does not exist");
        _;
    }

    modifier contractNeitherClaimedNorRefunded(bytes32 _swapId) {
        require(storedSwaps[_swapId].claimed == false, "swap already claimed");
        require(storedSwaps[_swapId].refunded == false, "swap already refunded");
        _;
    }

    // Set a swap with the receiver, the ERC20 token contract, a sha256 hashed secret, a timelock and the token amount
    function setSwap(
        address _receiver, 
        address _tokenContract, 
        bytes32 _hashlock,
        uint256 _timelock, 
        uint256 _tokenAmount
    ) external returns(bytes32 swapId) {
        require(ERC20(_tokenContract).allowance(msg.sender, address(this)) >= _tokenAmount, "token allowance must be >= token amount");
        require(_timelock > block.timestamp, "timelock must be in the future");
        require(_tokenAmount > 0, "token amount must be > 0");

        swapId = sha256(abi.encodePacked(msg.sender, _receiver, _tokenContract, _hashlock, _timelock, _tokenAmount));

        if(storedSwaps[swapId].sender != address(0)){
            revert("Contract already exists, use different parameters, ideally a different hashlock");
        }

        if(!ERC20(_tokenContract).transferFrom(msg.sender, address(this), _tokenAmount)) {
            revert("transferFrom sender to this failed");
        }

        storedSwaps[swapId] = Swap(
            msg.sender, 
            _receiver,
            _tokenContract,
            _tokenAmount,
            _hashlock,
            "",
            _timelock,
            false,
            false
        );

        emit newSwap(
            swapId,
            msg.sender,
            _receiver,
            _tokenContract,
            _tokenAmount,
            _hashlock,
            _timelock
        );
    }

    // Claim the swap with the id and the secrect within the timelock
    function claim(bytes32 _swapId, string memory _secret)
        external
        contractNeitherClaimedNorRefunded(_swapId)
        swapExists(_swapId) 
        returns (bool)
    {
        require(storedSwaps[_swapId].receiver == msg.sender, "not receiver");
        require(storedSwaps[_swapId].hashlock == sha256(abi.encodePacked(_secret)), "hashlock and secret do not match");
        require(storedSwaps[_swapId].timelock >= block.timestamp, "timelock time has passed");

        Swap storage a = storedSwaps[_swapId];
        ERC20(a.tokenContract).transfer(a.receiver, a.tokenAmount);
        a.secret = _secret;
        a.claimed = true;

        emit claimedSwap(_swapId, _secret);
        return true;
    }

    // Refund the swap contract with the swap id after the timelock expires
    function refund(bytes32 _swapId)
        external
        contractNeitherClaimedNorRefunded(_swapId)
        swapExists(_swapId) 
        returns (bool) 
    {
        require(storedSwaps[_swapId].sender == msg.sender, "not sender");
        require(storedSwaps[_swapId].timelock < block.timestamp, "timelock still active");

        Swap storage a = storedSwaps[_swapId];
        ERC20(a.tokenContract).transfer(a.sender, a.tokenAmount);
        a.refunded = true;

        emit refundedSwap(_swapId);
        return true;
    }

    // Return the swap parameters
    function getSwap(bytes32 _swapId) 
        public
        view   
        swapExists(_swapId) 
        returns(
            address sender,
            address receiver,
            address tokenContract,
            uint256 tokenAmount,
            bytes32 hashlock,
            string memory secret,
            uint256 timelock,
            bool claimed,
            bool refunded
        ) 
    {
       Swap storage a = storedSwaps[_swapId];
       return (
           a.sender,
           a.receiver,
           a.tokenContract,
           a.tokenAmount,
           a.hashlock,
           a.secret,
           a.timelock,
           a.claimed,
           a.refunded
       ); 
    }

}