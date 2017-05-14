pragma solidity^0.4.9;

import "./CLNY.sol";

contract ColonyTokenSale {
  // Block number in which the sale starts. Inclusive. sale will be opened at initial block.
  uint public initialBlock;
  // Number of CLNY tokens for 1 wei, at the start of the sale
  uint public initialPrice;
  // Duration of sale post reaching the soft cap
  uint8 public postSoftCapDuration;
  // The address to hold the funds donated
  address public colonyMultisig;
  // The address of the Colony Network Token
  CLNY public tokenTracker;

  // Minimum investment
  uint constant public dust = 1 finney;

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
  function ColonyTokenSale (uint _initialBlock)
  {
      if (_initialBlock < getBlockNumber()) throw;
      initialBlock = _initialBlock;
  }

  function getBlockNumber() constant returns (uint) {
    return block.number;
  }
}
