pragma solidity ^0.4.11;

import "./Resolver.sol";

// Basic Colony token implementation purely to satisfy ERC20 standard
// Used for the purposes of an immutable structure used by clients and exchanges for managing tokens
contract Token {
  Resolver public resolver;

  function setResolver(address _resolver) {
    resolver = Resolver(_resolver);
  }

  function totalSupply() returns (uint) {
    uint r;

    var (destination, outsize) = resolver.lookup(msg.sig);

    assembly {
      calldatacopy(mload(0x40), 0, calldatasize)
      r := call(sub(gas, 700), destination, msg.value, mload(0x40), calldatasize, mload(0x40), outsize)
    }

    if (r != 1) { throw;}

    assembly {
      return(mload(0x40), outsize)
    }
  } 
}
