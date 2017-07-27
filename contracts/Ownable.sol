pragma solidity ^0.4.13;


contract Ownable {
  address public owner = msg.sender;

  /// @notice check if the msg.sender is the owner of the contract
	modifier onlyOwner {
		require(msg.sender == owner);
		_;
	}

  /// @notice redefine the owner of the contract.
  /// @param _newOwner the address of the new owner of the contract.
  function changeOwner(address _newOwner)
  onlyOwner
  {
    require(_newOwner != 0x0);
    owner = _newOwner;
  }
}
