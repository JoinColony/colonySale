pragma solidity ^0.4.11;

contract Resolver {
  struct Pointer { address destination; uint outsize; }
  mapping (bytes4 => Pointer) public pointers;

  event lookUpPerformed(bytes4 signature);

  function Resolver() {
  }

  // Public API
  function lookup(bytes4 sig) returns(address, uint) {
    lookUpPerformed(sig);
    return (destination(sig), outsize(sig));
  }

  // Admin API
  function register(string signature, address destination, uint outsize) {
    pointers[stringToSig(signature)] = Pointer(destination, outsize);
  }

  // Helpers
  function destination(bytes4 sig) returns(address) {
    return pointers[sig].destination;
  }

  function outsize(bytes4 sig) returns(uint) {
    if (pointers[sig].destination != 0) {
      // Stored destination and outsize
      return pointers[sig].outsize;
    } else {
      // Default
      return 32;
    }
  }

  function stringToSig(string signature) returns(bytes4) {
    return bytes4(keccak256(signature));
  }
}
