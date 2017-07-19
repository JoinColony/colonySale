pragma solidity^0.4.11;

import "./Token.sol";
import "./dappsys/math.sol";


contract ColonyTokenSale is DSMath {
  // Block number in which the sale starts. Inclusive. Sale will be opened at start block.
  uint public startBlock;
  // Sale will continue for a maximum of 60480 blocks (~14 days). Initialised as the latest possible block number at which the sale ends.
  // Updated if softCap reached to the number of blocks it took to reach the soft cap and it is a min of 540 and max 4320.
  // Exclusive. Sale will be closed at end block.
  uint public endBlock;
  // Once softCap is reached, the remaining sale duration is set to the same amount of blocks it's taken the sale to reach the softCap
  // minumum and maximum are 540 and 4320 blocks corresponding to roughly 3 and 24 hours.
  uint public postSoftCapMinBlocks;
  uint public postSoftCapMaxBlocks;
  // CLNY token price = 1 finney
  // 1 Wei = 1000 CLNY Wei
  uint constant public tokenPriceMultiplier = 1000;
  // Minimum contribution amount
  uint constant public minimumContribution = 1 finney;
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
  // endBlock updated once after softCap met
  bool endBlockUpdatedAtSoftCap = false;
  // Has Colony stopped the sale
  bool public saleStopped = false;
  // Has the sale been finalized
  bool public saleFinalized = false;
  uint public saleFinalisedTime;
  uint constant internal secondsPerMonth = 2592000;

  address public INVESTOR_1 = 0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4;
  address public INVESTOR_2 = 0x9F485401a3C22529aB6EA15E2EbD5A8CA54a5430;
  address public TEAM_MEMBER_1 = 0x4110afd6bAc4F25724aDe66F0e0300dde0696a58;
  address public TEAM_MEMBER_2 = 0x099a2B3E7b8558381A8aB3B3B7953858d5691946;
  address public TEAM_MULTISIG = 0xd6Bf4Be334A4661e12a647b62EF1510a247dd625;
  address public FOUNDATION = 0x4e7DBb49018489a27088FE304b18849b02F708F6;
  address public STRATEGY_FUND = 0x2304aD70cAA2e8D4BE0665E4f49AD1eDe56F3e8F;

  uint128 constant public ALLOCATION_TEAM_MEMBER_1 = 30 * 10 ** 18;
  uint128 constant public ALLOCATION_TEAM_MEMBER_2 = 80 * 10 ** 18;
  uint128 constant public ALLOCATION_TEAM_MEMBERS_TOTAL = 110 * 10 ** 18;

  mapping (address => uint) public userBuys;
  mapping (address => uint) public tokenGrants;

  event Purchase(address buyer, uint amount);
  event Claim(address buyer, uint amount, uint tokens);
  event updatedSaleEndBlock(uint endblockNumber);
  event SaleFinalized(address user, uint totalRaised, uint128 totalSupply);
  event AllocatedReservedTokens(address user, uint tokens);

  modifier onlyColonyMultisig {
    require(msg.sender == colonyMultisig);
    _;
  }

  modifier saleOpen {
    assert(block.number >= startBlock);
    assert(block.number < endBlock);
    _;
  }

  modifier saleClosed {
    assert(block.number >= endBlock);
    _;
  }

  modifier saleNotStopped {
    assert (!saleStopped);
    _;
  }

  modifier raisedMinimumAmount {
    assert(totalRaised >= minToRaise);
    _;
  }

  modifier saleFinalised {
    assert(saleFinalized);
    _;
  }

  modifier saleNotFinalised {
    assert(!saleFinalized);
    _;
  }

  modifier contributionMeetsMinimum {
    require(msg.value >= minimumContribution);
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
    nonZeroAddress(_colonyMultisig)
  {
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
  saleNotStopped
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
      updatedSaleEndBlock(endBlock);
    }

    Purchase(_owner, msg.value);
  }

  function () public payable {
    return buy(msg.sender);
  }

  function claimPurchase(address _owner) external
  onlyColonyMultisig
  saleFinalised
  {
    // Calculate token amount for given value and transfer tokens
    uint amount = userBuys[_owner];
    uint tokens = mul(amount, tokenPriceMultiplier);
    userBuys[_owner] = 0;
    assert(token.transfer(_owner, tokens));

    Claim(_owner, amount, tokens);
  }

  function claimVestedTokens() external
  saleFinalised
  {
    uint elapsedTime = sub(now, saleFinalisedTime);
    uint cliffMultiplier = div(elapsedTime, secondsPerMonth * 6);
    assert(cliffMultiplier > 0);

    // Calculate vested tokens and transfer them to recipient
    uint amountVested = (cliffMultiplier == 4 ? tokenGrants[msg.sender] : mul(div(tokenGrants[msg.sender], 4), cliffMultiplier));
    tokenGrants[msg.sender] -= amountVested;
    assert(token.transfer(msg.sender, amountVested));
  }

  function finalize() external
  saleClosed
  raisedMinimumAmount
  saleNotFinalised
  {
    // Deduct initial 1 finney, see note on `totalRaised` prop
    totalRaised = sub(totalRaised, 10 ** 15);

    // Mint as much retained tokens as raised in sale, i.e. 51% is sold, 49% retained
    uint purchasedSupply = mul(totalRaised, tokenPriceMultiplier);
    uint128 totalSupply = cast(div(mul(purchasedSupply, 100), 51));
    token.mint(totalSupply);

    // 5% allocated to Investor
    uint128 earlyInvestorAllocation = wmul(wdiv(totalSupply, 100), 5);
    assert(token.transfer(INVESTOR_1, earlyInvestorAllocation));
    AllocatedReservedTokens(INVESTOR_1, earlyInvestorAllocation);

    // 10% allocated to Team
    uint128 totalTeamAllocation = wmul(wdiv(totalSupply, 100), 10);

    // Allocate to team members
    assert(token.transfer(TEAM_MEMBER_1, ALLOCATION_TEAM_MEMBER_1));
    AllocatedReservedTokens(TEAM_MEMBER_1, ALLOCATION_TEAM_MEMBER_2);
    assert(token.transfer(TEAM_MEMBER_2, ALLOCATION_TEAM_MEMBER_2));
    AllocatedReservedTokens(TEAM_MEMBER_2, ALLOCATION_TEAM_MEMBER_2);

    // Vest remainder to team multisig
    uint128 teamRemainderAmount = hsub(totalTeamAllocation, ALLOCATION_TEAM_MEMBERS_TOTAL);
    tokenGrants[TEAM_MULTISIG] = teamRemainderAmount;

    // 15% allocated to Foundation
    uint128 foundationAllocation = wmul(wdiv(totalSupply, 100), 15);
    tokenGrants[FOUNDATION] = foundationAllocation;

    // 19% allocated to Strategy fund
    uint128 strategyFundAllocation = hsub(totalSupply, hadd(hadd(hadd(earlyInvestorAllocation, totalTeamAllocation), foundationAllocation), cast(purchasedSupply)));
    assert(token.transfer(STRATEGY_FUND, strategyFundAllocation));
    AllocatedReservedTokens(STRATEGY_FUND, strategyFundAllocation);

    saleFinalized = true;
    saleFinalisedTime = now;
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
