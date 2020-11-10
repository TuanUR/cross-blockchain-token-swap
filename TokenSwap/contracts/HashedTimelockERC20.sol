pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HashedTimelockERC20 {
    
    event newSwap(
        bytes32 indexed contractId,
        address indexed sender,
        address indexed receiver,
        address tokenContract,
        uint256 tokenAmount,
        bytes32 hashlock,
        uint256 timelock
    );

    event claimedSwap(bytes32 indexed contractId, bytes32 secretKey);

    event refundedSwap(bytes32 indexed contractId);

    struct HTLC{
        address sender;
        address receiver;
        address tokenContract;
        uint256 tokenAmount;
        bytes32 hashlock;
        bytes32 secretKey;
        uint256 timelock;
        bool claimed;
        bool refunded;
    }

    mapping(bytes32 => HTLC) contracts;

    function setSwap(
        address _receiver, 
        address _tokenContract, 
        bytes32 _hashlock, 
        uint256 _timelock, 
        uint256 _tokenAmount
    ) public returns(bytes32 contractId) {
        require(ERC20(_tokenContract).allowance(msg.sender, address(this)) >= _tokenAmount, "token allowance must be > token amount");
        // require(ERC20(_tokenContract).balanceOf(msg.sender) >= _tokenAmount, "token amount exceeds balance");
        require(_timelock > 0, "timelock has to be in the future");
        require(_tokenAmount > 0, "token amount must be > 0");
        
        uint256 timelocked = block.timestamp + _timelock;

        contractId = sha256(abi.encodePacked(msg.sender, _receiver, _tokenContract, _hashlock, timelocked, _tokenAmount));
        
        if(existingHTLC(contractId)){
            revert("Contract already exists, use different parameters, ideally a different hashlock");
        }

        if(!ERC20(_tokenContract).transferFrom(msg.sender, address(this), _tokenAmount)) {
            revert("transferFrom sender to this failed");
        }

        /*
        if(!ERC20(_tokenContract).transfer(address(this), _tokenAmount), {from: accounts[0]}) {
            revert("transfer to this failed");
        }
        */

        contracts[contractId] = HTLC(
            msg.sender, 
            _receiver,
            _tokenContract,
            _tokenAmount,
            _hashlock,
            0x0,
            timelocked,
            false,
            false
        );

        emit newSwap(
            contractId,
            msg.sender,
            _receiver,
            _tokenContract,
            _tokenAmount,
            _hashlock,
            timelocked
        );
    }

    function claim(bytes32 _contractId, bytes32 _secretKey) 
        external
        contractNeitherClaimedNorRefunded(_contractId)
        contractExists(_contractId) returns (bool)
    {
        require(contracts[_contractId].hashlock == sha256(abi.encodePacked(_secretKey)), "hashlock and secretKey do not match");
        require(contracts[_contractId].receiver == msg.sender, "not receiver");
        // require(contracts[_contractId].claimed == false, "already claimed");
        // require(contracts[_contractId].refunded == false, "already refunded");
        require(contracts[_contractId].timelock >= block.timestamp, "timelock time has passed");

        HTLC storage a = contracts[_contractId];
        ERC20(a.tokenContract).transfer(a.receiver, a.tokenAmount);
        a.secretKey = _secretKey;
        a.claimed = true;

        emit claimedSwap(_contractId, _secretKey);
        return true;
    }

    function refund(bytes32 _contractId)
        external
        contractNeitherClaimedNorRefunded(_contractId)
        contractExists(_contractId) returns (bool) 
    {
        require(contracts[_contractId].sender == msg.sender, "not sender");
        // require(contracts[_contractId].claimed == false, "already claimed");
        // require(contracts[_contractId].refunded == false, "already refunded");
        require(contracts[_contractId].timelock <= block.timestamp, "timelock still active");

        HTLC storage a = contracts[_contractId];
        ERC20(a.tokenContract).transfer(a.sender, a.tokenAmount);
        a.refunded = true;

        emit refundedSwap(_contractId);
        return true;
    }

    function getContract(bytes32 _contractId) 
        public   
        contractExists(_contractId) returns(
            address sender,
            address receiver,
            address tokenContract,
            uint256 tokenAmount,
            bytes32 hashlock,
            bytes32 secretKey,
            uint256 timelock,
            bool claimed,
            bool refunded
        ) 
    {
       HTLC storage a = contracts[_contractId];
       return (
           a.sender,
           a.receiver,
           a.tokenContract,
           a.tokenAmount,
           a.hashlock,
           a.secretKey,
           a.timelock,
           a.claimed,
           a.refunded
       ); 
    }

    function existingHTLC(bytes32 _contractId) internal returns(bool exists) {
        exists = (contracts[_contractId].sender != address(0));
    }

    modifier contractExists(bytes32 _contractId) {
        require(existingHTLC(_contractId), "contractId does not exist");
        _;
    }

    modifier contractNeitherClaimedNorRefunded(bytes32 _contractId) {
        require(contracts[_contractId].claimed == false, "already claimed");
        require(contracts[_contractId].refunded == false, "already refunded");
        _;
    }
}
