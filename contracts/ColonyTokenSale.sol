pragma solidity^0.4.11;

import "./Token.sol";
import "./dappsys/math.sol";


contract ColonyTokenSale is DSMath {
  // Block number in which the sale starts. Inclusive. Sale will be opened at start block.
  uint public startBlock = 4000000;
  // Sale will continue for a maximum of 71153 blocks (~14 days). Initialised as the latest possible block number at which the sale ends.
  // Updated if softCap reached to the number of blocks it took to reach the soft cap and it is a min of 635 and max 5082.
  // Exclusive. Sale will be closed at end block.
  uint public endBlock = 4071153;
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

  modifier saleOpen {
      assert(getBlockNumber() >= startBlock);
      assert(getBlockNumber() < endBlock);
      _;
  }

  modifier etherCapNotReached {
      assert(add(totalRaised, msg.value) <= softCap);
      _;
  }

  function ColonyTokenSale () {
  }

  function getBlockNumber() constant returns (uint) {
    return block.number;
  }

  function buy(address _owner) {
    if (msg.value > 0) {
      totalRaised += msg.value;
    }
    return;
  }

  function () public payable {
    return buy(msg.sender);
  }
}
