pragma solidity^0.4.13;

import "./Token.sol";
import "../lib/ds-math/src/math.sol";


contract ColonyTokenSale is DSMath {
  // Block number in which the sale starts. Inclusive. Sale will be opened at start block.
  uint public startBlock;
  // Block number at which the sale ends. Exclusive. Sale will be closed at end block.
  uint public endBlock;
  // Once softCap is reached, the remaining sale duration is set to the same amount of blocks it's taken the sale to reach the softCap
  // where the minimum is `postSoftCapMinBlocks` and the maximum is `postSoftCapMaxBlocks`
  uint public postSoftCapMinBlocks;
  uint public postSoftCapMaxBlocks;
  // CLNY token price = 1 finney
  // 1 Wei = 1000 CLNY Wei
  uint constant public TOKEN_PRICE_MULTIPLIER = 1000;
  // Minimum contribution amount
  uint constant public MIN_CONTRIBUTION = 10 finney;
  // Minimum amount to raise for sale to be successful
  uint public minToRaise;
  // Total amount raised in sale
  // Contains a small starting amount which gets deducted in `finalize()` in order to bring down the cost of very first `buy()` transaction
  uint public totalRaised = 1 finney;
  // Sale soft cap
  uint public softCap;
  // The address to hold the funds donated
  address public colonyMultisig;
  // The address of the Colony Network Token
  Token public token;
  // Has `endBlock` been updated after softCap met
  bool endBlockUpdatedAtSoftCap = false;
  // Has Colony stopped the sale
  bool public saleStopped = false;
  // Has the sale been finalized
  bool public saleFinalized = false;
  // The block time when sale was finalized. (Used in token vesting calculations)
  uint public saleFinalizedTime;
  // Seconds per month, calculated as seconds in a (non-leap) year divided by 12, i.e. 31536000 / 12
  uint constant internal SECONDS_PER_MONTH = 2628000;

  address public INVESTOR_1 = 0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4;
  address public INVESTOR_2 = 0x9F485401a3C22529aB6EA15E2EbD5A8CA54a5430;
  address public TEAM_MEMBER_1 = 0x4110afd6bAc4F25724aDe66F0e0300dde0696a58;
  address public TEAM_MEMBER_2 = 0x099a2B3E7b8558381A8aB3B3B7953858d5691946;
  address public TEAM_MULTISIG = 0xd6Bf4Be334A4661e12a647b62EF1510a247dd625;
  address public FOUNDATION = 0x4e7DBb49018489a27088FE304b18849b02F708F6;
  address public STRATEGY_FUND = 0x2304aD70cAA2e8D4BE0665E4f49AD1eDe56F3e8F;

  // Colony Token wei allocation for each team member
  uint constant public ALLOCATION_TEAM_MEMBER_1 = 30 * 10 ** 18;
  uint constant public ALLOCATION_TEAM_MEMBER_2 = 80 * 10 ** 18;
  uint constant public ALLOCATION_TEAM_MEMBERS_TOTAL = 110 * 10 ** 18;

  mapping (address => uint) public userBuys;
  mapping (address => uint) public tokenGrants;
  struct GrantClaimTotal {
    uint64 monthsClaimed;
    uint totalClaimed;
  }
  mapping (address => GrantClaimTotal) public grantClaimTotals;

  event Purchase(address buyer, uint amount);
  event Claim(address buyer, uint amount, uint tokens);
  event UpdatedSaleEndBlock(uint endblockNumber);
  event SaleFinalized(address user, uint totalRaised, uint totalSupply);
  event AllocatedReservedTokens(address user, uint tokens);

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

  function buy(address _owner) internal
  saleOpen
  contributionMeetsMinimum
  {
    // Send funds to multisig, revert op performed on failure
    colonyMultisig.transfer(msg.value);
    userBuys[_owner] = add(msg.value, userBuys[_owner]);

    // Up the total raised with given value
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

      // We cannot exceed the longest sale duration
      endBlock = min(updatedEndBlock, endBlock);
      endBlockUpdatedAtSoftCap = true;
      UpdatedSaleEndBlock(endBlock);
    }

    Purchase(_owner, msg.value);
  }

  function () public payable {
    return buy(msg.sender);
  }

  function claimPurchase(address _owner) external
  onlyColonyMultisig
  saleIsFinalized
  {
    // Calculate token amount for given value and transfer tokens
    uint amount = userBuys[_owner];
    uint tokens = mul(amount, TOKEN_PRICE_MULTIPLIER);
    userBuys[_owner] = 0;
    token.transfer(_owner, tokens);

    Claim(_owner, amount, tokens);
  }

  function claimVestedTokens() external
  saleIsFinalized
  {
    uint grant = tokenGrants[msg.sender];
    GrantClaimTotal memory grantClaimTotal = grantClaimTotals[msg.sender];
    uint64 monthsClaimed = grantClaimTotal.monthsClaimed;
    uint totalClaimed = grantClaimTotal.totalClaimed;

    // Check cliff was reached
    uint elapsedTime = sub(now, saleFinalizedTime);
    uint64 monthsSinceSaleFinalized = uint64(div(elapsedTime, SECONDS_PER_MONTH));
    assert(monthsSinceSaleFinalized >= 6);

    // If over 24 months, all tokens vested
    if (monthsSinceSaleFinalized >= 24) {
      uint remainingGrant = sub(grant, totalClaimed);
      grantClaimTotals[msg.sender] = GrantClaimTotal(24, grant);
      token.transfer(msg.sender, remainingGrant);
    } else {
      // Get the time period for which we claim
      uint64 monthsPendingClaim = uint64(sub(monthsSinceSaleFinalized, monthsClaimed));
      // Calculate vested tokens and transfer them to recipient
      uint amountVestedPerMonth = div(grant, 24);
      uint amountVested = mul(monthsPendingClaim, amountVestedPerMonth);
      grantClaimTotals[msg.sender] = GrantClaimTotal(monthsSinceSaleFinalized, add(totalClaimed, amountVested));
      token.transfer(msg.sender, amountVested);
    }
  }

  function finalize() external
  saleClosed
  raisedMinimumAmount
  saleNotFinalized
  {
    // Deduct initial 1 finney, see note on `totalRaised` prop
    totalRaised = sub(totalRaised, 10 ** 15);

    // Mint as much retained tokens as raised in sale, i.e. 51% is sold, 49% retained
    uint purchasedSupply = mul(totalRaised, TOKEN_PRICE_MULTIPLIER);
    uint totalSupply = div(mul(purchasedSupply, 100), 51);
    token.mint(cast(totalSupply));
    token.changeOwner(colonyMultisig);

    // 5% allocated to Investor
    uint earlyInvestorAllocation = div(mul(totalSupply, 5), 100);
    token.transfer(INVESTOR_1, earlyInvestorAllocation);
    AllocatedReservedTokens(INVESTOR_1, earlyInvestorAllocation);

    // 10% allocated to Team
    uint totalTeamAllocation = div(mul(totalSupply, 10), 100);

    // Allocate to team members
    token.transfer(TEAM_MEMBER_1, ALLOCATION_TEAM_MEMBER_1);
    AllocatedReservedTokens(TEAM_MEMBER_1, ALLOCATION_TEAM_MEMBER_1);
    token.transfer(TEAM_MEMBER_2, ALLOCATION_TEAM_MEMBER_2);
    AllocatedReservedTokens(TEAM_MEMBER_2, ALLOCATION_TEAM_MEMBER_2);

    // Vest remainder to team multisig
    uint teamRemainderAmount = sub(totalTeamAllocation, ALLOCATION_TEAM_MEMBERS_TOTAL);
    tokenGrants[TEAM_MULTISIG] = teamRemainderAmount;

    // 15% allocated to Foundation
    uint foundationAllocation = div(mul(totalSupply, 15), 100);
    tokenGrants[FOUNDATION] = foundationAllocation;

    // 19% allocated to Strategy fund
    uint strategyFundAllocation = sub(totalSupply, add(add(add(earlyInvestorAllocation, totalTeamAllocation), foundationAllocation), purchasedSupply));
    token.transfer(STRATEGY_FUND, strategyFundAllocation);
    AllocatedReservedTokens(STRATEGY_FUND, strategyFundAllocation);

    saleFinalized = true;
    saleFinalizedTime = now;
    SaleFinalized(msg.sender, totalRaised, totalSupply);
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
