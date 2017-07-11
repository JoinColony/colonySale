pragma solidity^0.4.11;

import "./Token.sol";
import "./dappsys/math.sol";


contract ColonyTokenSale is DSMath {
  // Block number in which the sale starts. Inclusive. Sale will be opened at start block.
  uint public startBlock;
  // Sale will continue for a maximum of 71153 blocks (~14 days). Initialised as the latest possible block number at which the sale ends.
  // Updated if softCap reached to the number of blocks it took to reach the soft cap and it is a min of 635 and max 5082.
  // Exclusive. Sale will be closed at end block.
  uint public endBlock;
  // Once softCap is reached, the remaining sale duration is set to the same amount of blocks it's taken the sale to reach the softCap
  // minumum and maximum are 635 and 5082 blocks corresponding to roughly 3 and 24 hours.
  uint public postSoftCapMinBlocks;
  uint public postSoftCapMaxBlocks;
  // CLNY token wei price, at the start of the sale
  uint constant public tokenPrice = 1 finney;
  // Minimum contribution amount
  uint constant public minimumContribution = 1 finney;
  // Minimum amount to raise for sale to be successful
  uint public minToRaise;
  // Total amount raised
  uint public totalRaised = 0 wei;
  // Sale soft cap
  uint public softCap;
  // The address to hold the funds donated
  address public colonyMultisig;
  // The address of the Colony Network Token
  Token public token;
  // Has the sale been finalised by Colony
  bool public saleFinalized = false;

  mapping (address => uint) public userBuys;

  modifier sale_is_open {
    require(getBlockNumber() >= startBlock);
    require(getBlockNumber() < endBlock);
    _;
  }

  modifier sale_is_finalized {
    require(saleFinalized);
    _;
  }

  modifier contribution_is_over_the_minimum {
    require(msg.value >= minimumContribution);
    _;
  }

  function ColonyTokenSale (
    uint _startBlock,
    uint _minToRaise,
    uint _softCap,
    uint _postSoftCapMinBlocks,
    uint _postSoftCapMaxBlocks,
    uint _maxSaleDurationBlocks,
    address _token,
    address _colonyMultisig) {
    // Validate duration params that 0 < postSoftCapMinBlocks < postSoftCapMaxBlocks
    require(_postSoftCapMinBlocks > 0);
    require(_postSoftCapMinBlocks < _postSoftCapMaxBlocks);

    // TODO validate startBLock > block.number;
    startBlock = _startBlock;
    endBlock = add(startBlock, _maxSaleDurationBlocks);
    minToRaise = _minToRaise;
    softCap = _softCap;
    postSoftCapMinBlocks = _postSoftCapMinBlocks;
    postSoftCapMaxBlocks = _postSoftCapMaxBlocks;
    token = Token(_token);
    colonyMultisig = _colonyMultisig;
  }

  function getBlockNumber() constant returns (uint) {
    return block.number;
  }

  function buy(address _owner) internal
  contribution_is_over_the_minimum
  sale_is_open
  {
    // Send funds to multisig, revert op performed on failure
    colonyMultisig.transfer(msg.value);
    userBuys[_owner] += msg.value;

    // Up the total raised with given value
    totalRaised = add(msg.value, totalRaised);

    // When softCap is reached, calculate the remainder sale duration in blocks
    if (totalRaised >= softCap) {
      uint updatedEndBlock;
      uint currentBlock = block.number;
      uint blocksInSale = sub(currentBlock, startBlock);
      if (blocksInSale < postSoftCapMinBlocks) {
        updatedEndBlock = add(currentBlock, postSoftCapMinBlocks);
      } else if (blocksInSale > postSoftCapMaxBlocks) {
        updatedEndBlock = add(currentBlock, postSoftCapMaxBlocks);
      } else {
        updatedEndBlock = add(currentBlock, blocksInSale);
      }

      // We cannot exceed the longest sale duration
      endBlock = min(updatedEndBlock, endBlock);
    }

    //TODO: log the buy
  }

  function () public payable {
    return buy(msg.sender);
  }

  //TODO: make this owner only
  function claim(address _owner) external
  sale_is_finalized
  {
    // Calculate token amount for given value and transfer tokens
    uint amount = div(userBuys[_owner], tokenPrice);
    token.transfer(_owner, amount);
    //TODO log claim
  }

  //TODO: secure to owner only
  function finalize() external {
    uint currentBlock = block.number;
    // Check the sale is closed, i.e. on or past endBlock
    assert(currentBlock >= endBlock);

    // Check min amount to raise is reached
    assert(totalRaised >= minToRaise);

    // Check sale is not finalised already
    assert(saleFinalized == false);

    // Mint as much retained tokens as raised in sale, i.e. 50% is sold, 50% retained
    uint amount = div(totalRaised, tokenPrice);
    uint128 hamount = hmul(cast(amount), 2);
    token.mint(hamount);

    //TODO
    // 5% early investors
    // 10% team
    // 15% foundation
    // 20% strategy fund

    saleFinalized = true;
  }
}
