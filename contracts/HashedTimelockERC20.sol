//"SPDX-License-Identifier: UNLICENSED"

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
* Hashed Timelock Contracts (HTLCs) on Ethereum ERC-20 tokens.
* This HTLC provides a way to swap ERC-20 tokens.
*
* Protocol:
*
*  1) newSwap(receiver, tokenContract, hashlock, timelock, tokenAmount) 
*     -> the sender can create a new swap for a given token and token contract
*        and a 32 byte swap id is returned
*
*  2) withdraw(swapId, secret) 
*     -> once the receiver knows the secret of the hashlock they can claim
*        the tokens with this function prior to the expiry of the timelock
*
*  3) refund(swapId)
*     -> the sender of the swap can get their tokens back after the timelock has 
*        expired and if the receiver did not withdraw the tokens
*/

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

    event claimedSwap(bytes32 indexed swapId, string secret); //alternative way to retrieve the secret

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

    modifier swapNeitherClaimedNorRefunded(bytes32 _swapId) {
        require(storedSwaps[_swapId].claimed == false, "swap already claimed");
        require(storedSwaps[_swapId].refunded == false, "swap already refunded");
        _;
    }

/**
* Sender sets up a new swap depositing the tokens by specifying the receiver and terms
*
* NOTE: _receiver must first call approve() on the token contract
*
* @param _receiver : Receiver of the tokens
* @param _tokenContract : ERC-20 Token contract address
* @param _hashlock : A sha256 hash hashlock
* @param _timelock : UNIX epoch seconds time that the lock expires at
*                    Refunds can be made after this time
* @param _tokenAmount : Number of the token to lock up
* @return swapId : Id of the new swap needed for subsequent calls
*
*/
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

        // Generate random id
        swapId = sha256(abi.encodePacked(msg.sender, _receiver, _tokenContract, _hashlock, _timelock, _tokenAmount));

        // Reject if a swap already exists with the same parameters
        if(storedSwaps[swapId].sender != address(0)){
            revert("Contract already exists, use different parameters, ideally a different hashlock");
        }

        // The HTLC becomes the temporary owner of the tokens
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

/**
* Receiver can withdraw the funds once they know the preimage (secret) of the hashlock
* This will transfer ownership of the locked tokens to their address
*
* @param _swapId : Id of the swap to claim from
* @param _secret : sha256(_secret) should equal the swap hashlock
* @return bool : true on success
*/
    function claim(bytes32 _swapId, string memory _secret)
        external
        swapNeitherClaimedNorRefunded(_swapId)
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

/**
* Sender can retrieve his funds if there was no withdraw and the time lock has expired
* This will restore ownership of the tokens to the sender
*
* @param _swapId : Id of the swap to refund from
* @return bool : true on success
*/
    function refund(bytes32 _swapId)
        external
        swapNeitherClaimedNorRefunded(_swapId)
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

/**
* Get swap details
*
* @param _swapId : Id of the swap to obatin details from
* return All parameters in struct Swap for _swapId
*/
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