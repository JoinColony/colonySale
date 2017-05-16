pragma solidity^0.4.10;

import "./CLNY.sol";

contract ColonyTokenSale {
  // Block number in which the sale starts. Inclusive. sale will be opened at initial block.
  uint public initialBlock = 4000000;
  // Number of CLNY tokens for 1 wei, at the start of the sale
  uint public initialPrice;
  // Sale soft cap
  uint public softCap = 200000 ether;
  // The address to hold the funds donated
  address public colonyMultisig;
  // The address of the Colony Network Token
  CLNY public tokenTracker;

  /*
    price ^
          |
          |
          |
  Initial |      +------------+
  price   |      |            |
          |      |            |
  Final   |      |            +------------------+
  price   |      |            |                  |
          |      |            |                  |
          |      |            |                  |
          |      |            |     24 hours     |
          +------+------------+------------------+------->
            Initial        Soft cap             Final    time
            block          reached              block
  */
  function ColonyTokenSale ()
  {
      if (initialBlock < getBlockNumber()) throw;
  }

  function getBlockNumber() constant returns (uint) {
    return block.number;
  }
}
