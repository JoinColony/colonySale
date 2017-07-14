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
  // CLNY token price
  uint constant public tokenPrice = 1 finney;
  // Minimum contribution amount
  uint constant public minimumContribution = 1 finney;
  // Minimum amount to raise for sale to be successful
  uint public minToRaise;
  // Total amount raised
  uint public totalRaised = 0 ether;
  // Sale soft cap
  uint public softCap;
  // The address to hold the funds donated
  address public colonyMultisig;
  // The address of the Colony Network Token
  Token public token;
  // Has the sale been finalised by Colony
  bool public saleFinalized = false;

  address public INVESTOR_1 = 0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4;
  address public INVESTOR_2 = 0x9F485401a3C22529aB6EA15E2EbD5A8CA54a5430;
  address public TEAM_MEMBER_1 = 0x4110afd6bAc4F25724aDe66F0e0300dde0696a58;
  address public TEAM_MEMBER_2 = 0x099a2B3E7b8558381A8aB3B3B7953858d5691946;
  address public TEAM_MULTISIG = 0xd6Bf4Be334A4661e12a647b62EF1510a247dd625;
  address public FOUNDATION = 0x4e7DBb49018489a27088FE304b18849b02F708F6;
  address public STRATEGY_FUND = 0x2304aD70cAA2e8D4BE0665E4f49AD1eDe56F3e8F;

  mapping (address => uint) public userBuys;

  event Purchase(address buyer, uint amount);
  event Claim(address buyer, uint amount, uint tokens);
  event SaleFinalized(address user, uint totalRaised, uint128 totalSupply);
  event AllocatedReservedTokens(address user, uint tokens);

  modifier onlyColonyMultisig {
    require(msg.sender == colonyMultisig);
    _;
  }

  modifier saleOpen {
    require(getBlockNumber() >= startBlock);
    require(getBlockNumber() < endBlock);
    _;
  }

  modifier saleFinalised {
    require(saleFinalized);
    _;
  }

  modifier contributionOverMinimum {
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
  saleOpen
  contributionOverMinimum
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

    Purchase(_owner, msg.value);
  }

  function () public payable {
    return buy(msg.sender);
  }

  function claim(address _owner) external
  onlyColonyMultisig
  saleFinalised
  {
    // Calculate token amount for given value and transfer tokens
    uint amount = userBuys[_owner];
    uint tokens = div(amount, tokenPrice);
    userBuys[_owner] = 0;
    token.transfer(_owner, tokens);

    Claim(_owner, amount, tokens);
  }

  function finalize() external {
    uint currentBlock = block.number;
    // Check the sale is closed, i.e. on or past endBlock
    assert(currentBlock >= endBlock);

    // Check min amount to raise is reached
    assert(totalRaised >= minToRaise);

    // Check sale is not finalised already
    assert(saleFinalized == false);

    // Mint as much retained tokens as raised in sale, i.e. 51% is sold, 49% retained
    uint purchasedTokens = div(totalRaised, tokenPrice);
    uint decimals = token.decimals();
    uint purchasedTokensWei = purchasedTokens * 10 ** decimals;
    uint128 totalSupply = wdiv(wmul(cast(purchasedTokensWei), 100), 51);
    token.mint(totalSupply);

    // 5% allocated to Investor1
    uint128 earlyInvestorAllocation = wmul(wdiv(totalSupply, 100), 5);
    token.transfer(INVESTOR_1, earlyInvestorAllocation);
    AllocatedReservedTokens(INVESTOR_1, earlyInvestorAllocation);

    // 10% allocated to Team
    uint128 totalTeamAllocation = wmul(wdiv(totalSupply, 100), 10);
    // Allocate to team members
    uint teamMember1TotalAmountAllocated = 30 finney;
    uint teamMember1Tokens = div(teamMember1TotalAmountAllocated, tokenPrice);
    uint teamMember1TokensWei = teamMember1Tokens * 10 ** decimals;
    token.transfer(TEAM_MEMBER_1, teamMember1TokensWei);
    AllocatedReservedTokens(TEAM_MEMBER_1, teamMember1TokensWei);

    uint teamMember2TotalAmountAllocated = 80 finney;
    uint teamMember2Tokens = div(teamMember2TotalAmountAllocated, tokenPrice);
    uint teamMember2TokensWei = teamMember2Tokens * 10 ** decimals;
    token.transfer(TEAM_MEMBER_2, teamMember2TokensWei);
    AllocatedReservedTokens(TEAM_MEMBER_2, teamMember2TokensWei);

    //TODO: vest remainder in team multisig (totalTeamAllocation - teamMember1TokensWei - teamMember2TokensWei

    // 19% allocated to Strategy fund
    uint128 strategyFundAllocation = wmul(wdiv(totalSupply, 100), 19);
    token.transfer(STRATEGY_FUND, strategyFundAllocation);
    AllocatedReservedTokens(STRATEGY_FUND, strategyFundAllocation);

    saleFinalized = true;
    SaleFinalized(msg.sender, totalRaised, totalSupply);
  }
}
