pragma solidity^0.4.13;

import "./Token.sol";
import "../lib/dappsys/math.sol";


contract ColonyTokenSale is DSMath {
  // Block number in which the sale starts. Inclusive. Sale will be opened at start block.
  uint public startBlock;
  // Block number at which the sale ends. Exclusive. Sale will be closed at end block.
  uint public endBlock;
  uint public postSoftCapMinBlocks;
  uint public postSoftCapMaxBlocks;
  uint public minToRaise;
  uint public totalRaised = 1 finney;
  uint public softCap;
  bool endBlockUpdatedAtSoftCap = false;
  bool public saleStopped = false;
  bool public saleFinalized = false;
  uint public saleFinalizedTime;
  address public colonyMultisig;
  Token public token;

  uint constant public TOKEN_PRICE_MULTIPLIER = 1000;
  uint constant public MIN_CONTRIBUTION = 10 finney;
  uint constant internal SECONDS_PER_MONTH = 2628000;

  address public INVESTOR_1 = 0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4;
  address public INVESTOR_2 = 0x9F485401a3C22529aB6EA15E2EbD5A8CA54a5430;
  address public TEAM_MEMBER_1 = 0x4110afd6bAc4F25724aDe66F0e0300dde0696a58;
  address public TEAM_MEMBER_2 = 0x099a2B3E7b8558381A8aB3B3B7953858d5691946;
  address public TEAM_MULTISIG = 0xd6Bf4Be334A4661e12a647b62EF1510a247dd625;
  address public FOUNDATION = 0x4e7DBb49018489a27088FE304b18849b02F708F6;
  address public STRATEGY_FUND = 0x2304aD70cAA2e8D4BE0665E4f49AD1eDe56F3e8F;

  uint constant public ALLOCATION_TEAM_MEMBER_1 = 30 * 10 ** 18;
  uint constant public ALLOCATION_TEAM_MEMBER_2 = 80 * 10 ** 18;
  uint constant public ALLOCATION_TEAM_MEMBERS_TOTAL = 110 * 10 ** 18;

  uint64 constant VESTING_CLIFF = 6;
  uint64 constant VESTING_DURATION = 24;

  struct Grant {
    uint amount;
    uint64 monthsClaimed;
    uint totalClaimed;
  }
  mapping (address => Grant) public tokenGrants;
  mapping (address => uint) public userBuys;

  event LogPurchase(address buyer, uint amount);
  event LogClaim(address buyer, uint amount, uint tokens);
  event LogUpdatedSaleEndBlock(uint endblockNumber);
  event LogSaleFinalized(address user, uint totalRaised, uint totalSupply);
  event LogAllocatedReservedTokens(address user, uint tokens);

  modifier onlyColonyMultisig {
    require(msg.sender == colonyMultisig);
    _;
  }

  modifier saleOpen {
    require(block.number >= startBlock);
    require(block.number < endBlock);
    require (!saleStopped);
    _;
  }

  modifier saleClosed {
    require(block.number >= endBlock);
    _;
  }

  modifier raisedMinimumAmount {
    require(totalRaised >= minToRaise);
    _;
  }

  modifier saleIsFinalized {
    require(saleFinalized);
    _;
  }

  modifier saleNotFinalized {
    require(!saleFinalized);
    _;
  }

  modifier contributionMeetsMinimum {
    require(msg.value >= MIN_CONTRIBUTION);
    _;
  }

  modifier nonZeroAddress(address x) {
    require(x != 0);
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
    address _colonyMultisig)
    nonZeroAddress(_token)
  {
    require(_colonyMultisig != 0); // Switch to nonZeroAddress modifier when solidity#2621 is fixed
    require(_startBlock >= block.number);
    // Validate duration params that 0 < postSoftCapMinBlocks < postSoftCapMaxBlocks
    require(_postSoftCapMinBlocks != 0);
    require(_postSoftCapMinBlocks < _postSoftCapMaxBlocks);

    startBlock = _startBlock;
    endBlock = add(startBlock, _maxSaleDurationBlocks);
    minToRaise = _minToRaise;
    softCap = _softCap;
    postSoftCapMinBlocks = _postSoftCapMinBlocks;
    postSoftCapMaxBlocks = _postSoftCapMaxBlocks;
    token = Token(_token);
    colonyMultisig = _colonyMultisig;
  }

  function buy(address _user) internal
  saleOpen
  contributionMeetsMinimum
  {
    colonyMultisig.transfer(msg.value);
    userBuys[_user] = add(msg.value, userBuys[_user]);
    totalRaised = add(msg.value, totalRaised);

    // When softCap is reached, calculate the remainder sale duration in blocks
    if (!endBlockUpdatedAtSoftCap && totalRaised >= softCap) {
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

      endBlock = min(updatedEndBlock, endBlock);
      endBlockUpdatedAtSoftCap = true;
      LogUpdatedSaleEndBlock(endBlock);
    }

    LogPurchase(_user, msg.value);
  }

  function () public payable {
    return buy(msg.sender);
  }

  function claimPurchase(address _user) external
  onlyColonyMultisig
  saleIsFinalized
  {
    uint amount = userBuys[_user];
    uint tokens = mul(amount, TOKEN_PRICE_MULTIPLIER);
    userBuys[_user] = 0;
    token.transfer(_user, tokens);

    LogClaim(_user, amount, tokens);
  }

  function claimVestedTokens() external
  saleIsFinalized
  {
    Grant storage tokenGrant = tokenGrants[msg.sender];
    uint amount = tokenGrant.amount;
    uint64 monthsClaimed = tokenGrant.monthsClaimed;
    uint totalClaimed = tokenGrant.totalClaimed;

    // Check cliff was reached
    uint elapsedTime = sub(now, saleFinalizedTime);
    uint64 monthsSinceSaleFinalized = uint64(div(elapsedTime, SECONDS_PER_MONTH));
    require(monthsSinceSaleFinalized >= VESTING_CLIFF);

    // If over 24 months, all tokens vested
    if (monthsSinceSaleFinalized >= VESTING_DURATION) {
      uint remainingGrant = sub(amount, totalClaimed);
      tokenGrant.monthsClaimed = VESTING_DURATION;
      tokenGrant.totalClaimed = amount;
      token.transfer(msg.sender, remainingGrant);
    } else {
      // Get the time period for which we LogClaim
      uint64 monthsPendingClaim = uint64(sub(monthsSinceSaleFinalized, monthsClaimed));
      // Calculate vested tokens and transfer them to recipient
      uint amountVestedPerMonth = div(amount, VESTING_DURATION);
      uint amountVested = mul(monthsPendingClaim, amountVestedPerMonth);
      tokenGrant.monthsClaimed = monthsSinceSaleFinalized;
      tokenGrant.totalClaimed = add(totalClaimed, amountVested);
      token.transfer(msg.sender, amountVested);
    }
  }

  function finalize() external
  saleClosed
  raisedMinimumAmount
  saleNotFinalized
  {
    totalRaised = sub(totalRaised, 10 ** 15);

    // Mint as much retained tokens as raised in sale, i.e. 51% is sold, 49% retained
    uint purchasedSupply = mul(totalRaised, TOKEN_PRICE_MULTIPLIER);
    uint totalSupply = div(mul(purchasedSupply, 100), 51);
    token.mint(cast(totalSupply));
    token.setOwner(colonyMultisig);

    // 5% allocated to Investor
    uint earlyInvestorAllocation = div(mul(totalSupply, 5), 100);
    token.transfer(INVESTOR_1, earlyInvestorAllocation);
    LogAllocatedReservedTokens(INVESTOR_1, earlyInvestorAllocation);

    // 10% allocated to Team
    uint totalTeamAllocation = div(mul(totalSupply, 10), 100);

    // Allocate to team members
    token.transfer(TEAM_MEMBER_1, ALLOCATION_TEAM_MEMBER_1);
    LogAllocatedReservedTokens(TEAM_MEMBER_1, ALLOCATION_TEAM_MEMBER_1);
    token.transfer(TEAM_MEMBER_2, ALLOCATION_TEAM_MEMBER_2);
    LogAllocatedReservedTokens(TEAM_MEMBER_2, ALLOCATION_TEAM_MEMBER_2);

    // Send remainder as token grant to team multisig
    uint teamRemainderAmount = sub(totalTeamAllocation, ALLOCATION_TEAM_MEMBERS_TOTAL);
    tokenGrants[TEAM_MULTISIG] = Grant(teamRemainderAmount, 0, 0);

    // 15% allocated as token grant to Foundation
    uint foundationAllocation = div(mul(totalSupply, 15), 100);
    tokenGrants[FOUNDATION] = Grant(foundationAllocation, 0, 0);

    // 19% allocated to Strategy fund
    uint strategyFundAllocation = sub(totalSupply, add(add(add(earlyInvestorAllocation, totalTeamAllocation), foundationAllocation), purchasedSupply));
    token.transfer(STRATEGY_FUND, strategyFundAllocation);
    LogAllocatedReservedTokens(STRATEGY_FUND, strategyFundAllocation);

    saleFinalized = true;
    saleFinalizedTime = now;
    LogSaleFinalized(msg.sender, totalRaised, totalSupply);
  }

  function stop()
  onlyColonyMultisig
  {
    saleStopped = true;
  }

  function start()
  onlyColonyMultisig
  {
    saleStopped = false;
  }
}
