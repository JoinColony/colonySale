pragma solidity^0.4.11;

import "./Token.sol";
import "./dappsys/math.sol";


contract ColonyTokenSale is DSMath {
  // Block number in which the sale starts. Inclusive. sale will be opened at initial block.
  uint public initialBlock = 4000000;
  // CLNY token wei price, at the start of the sale
  uint public initialPrice = 1 finney;
  // Minimum contribution amount
  uint constant public MINIMUM_INVESTMENT = 1 finney;
  // Total amount raised
  uint public totalRaised = 0 ether;
  // Sale soft cap
  uint public softCap = 200000 ether;
  // The address to hold the funds donated
  address public colonyMultisig;
  // The address of the Colony Network Token
  Token public tokenTracker;

  modifier etherCapNotReached {
      assert(add(totalRaised, msg.value) <= softCap);
      _;
  }

  function ColonyTokenSale () {
      if (initialBlock < getBlockNumber())
        throw;
  }

  function getBlockNumber() constant returns (uint) {
    return block.number;
  }

  function () public payable {
    return;
  }
}
