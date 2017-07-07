pragma solidity ^0.4.11;
import "./Resolver.sol";
import "./Ownable.sol";

contract EtherRouter is Ownable{
  Resolver public resolver;
  bytes32 public symbol = 'CLNY';
  uint256 public decimals = 18;
  bytes32 public name = 'Colony Network Token';

  function() payable {
    uint r;

    // Get routing information for the called function
    var (destination, outsize) = resolver.lookup(msg.sig);

    // Make the call
    assembly {
      calldatacopy(mload(0x40), 0, calldatasize)
      r := delegatecall(sub(gas, 700), destination, mload(0x40), calldatasize, mload(0x40), outsize)
    }

    // Throw if the call failed
    if (r != 1) { throw;}

    // Pass on the return value
    assembly {
      return(mload(0x40), outsize)
    }
  }

  function setResolver(Resolver _resolver)
  onlyOwner
  {
    resolver = _resolver;
  }
}
