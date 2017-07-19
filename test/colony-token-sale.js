var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var Token = artifacts.require("./Token.sol");
var Resolver = artifacts.require("./Resolver.sol");
var EtherRouter = artifacts.require('./EtherRouter.sol');
var Ownable = artifacts.require('./Ownable.sol');
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

import BigNumber from 'bignumber.js';
import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  //Starting balance 100 ETH for each account
  const COLONY_ACCOUNT = '0xb77D57F4959eAfA0339424b83FcFaf9c15407461';
  const BUYER_ONE = '0x9dF24e73f40b2a911Eb254A8825103723E13209C';
  const BUYER_TWO = '0x27fF0C145E191C22C75cD123C679C3e1F58a4469';
  const BUYER_THREE = '0x0021Cb24d7D4e669120b139030095315DFa6699a';
  const BUYER_FOUR = '0xF822d689a2e10c1511dcD54dF5Ce43a9d393e75c';
  const INVESTOR_1 = '0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4';
  const INVESTOR_2 = '0x9F485401a3C22529aB6EA15E2EbD5A8CA54a5430';
  const TEAM_MEMBER_1 = '0x4110afd6bAc4F25724aDe66F0e0300dde0696a58';
  const TEAM_MEMBER_2 = '0x099a2B3E7b8558381A8aB3B3B7953858d5691946';
  const TEAM_MULTISIG = '0xd6Bf4Be334A4661e12a647b62EF1510a247dd625';
  const FOUNDATION = '0x4e7DBb49018489a27088FE304b18849b02F708F6';
  const STRATEGY_FUND = '0x2304aD70cAA2e8D4BE0665E4f49AD1eDe56F3e8F';

  // Initialised at the start of test in `before` call
  let ownable;
  let tokenDeployed;
  let resolver;

  // Set via createColonyTokenSale function
  let etherRouter;
  let token;
  let colonyMultisig;
  let colonySale;

  // Sale real properties
  const r_startBlock = 4000000;
  const r_minAmountToRaise = web3.toWei(20000, 'ether');
  const r_softCap = web3.toWei(50000, 'ether');
  const r_minContribution = web3.toWei(10, 'finney');
  const r_postSoftCapMinBlocks = 540;
  const r_postSoftCapMaxBlocks = 4320;
  const r_maxSaleDuration = 60480;

  // Sale test properties
  const t_minAmountToRaise = web3.toWei(10, 'finney');;
  const t_softCap = web3.toWei(3, 'ether');
  const t_minContribution = web3.toWei(10, 'finney');
  const t_postSoftCapMinBlocks = 5;
  const t_postSoftCapMaxBlocks = 9;
  const t_maxSaleDuration = 22;

  before(async function () {
    ownable = await Ownable.deployed();
    tokenDeployed = await Token.deployed();
    resolver = await Resolver.new(tokenDeployed.address);
  });

  const createSale_realValues = async function () {
    colonyMultisig = await MultiSigWallet.new([COLONY_ACCOUNT], 1);
    await _createColonyTokenSale(r_startBlock, r_minAmountToRaise, r_softCap, r_postSoftCapMinBlocks, r_postSoftCapMaxBlocks, r_maxSaleDuration, colonyMultisig.address);
  };

  const createSale_testValues = async function () {
    const currentBlock = web3.eth.blockNumber;
    colonyMultisig = await MultiSigWallet.new([COLONY_ACCOUNT], 1);
    await _createColonyTokenSale(currentBlock + 10, t_minAmountToRaise, t_softCap, t_postSoftCapMinBlocks, t_postSoftCapMaxBlocks, t_maxSaleDuration, colonyMultisig.address);
  };

  const createSale_invalidMultiSig = async function () {
    const currentBlock = web3.eth.blockNumber;
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    await _createColonyTokenSale(currentBlock + 10, t_minAmountToRaise, t_softCap, t_postSoftCapMinBlocks, t_postSoftCapMaxBlocks, t_maxSaleDuration, ownable.address);
  };

  const _createColonyTokenSale = async function (_startBlock, _minAmountToRaise, _softCap, _postSoftCapMinBlocks, _postSoftCapMaxBlocks, _maxSaleDuration, _colonyMultisig) {
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    colonySale = await ColonyTokenSale.new(_startBlock, _minAmountToRaise, _softCap, _postSoftCapMinBlocks, _postSoftCapMaxBlocks, _maxSaleDuration, etherRouter.address, _colonyMultisig);
  };

  const forwardToStartBlock = async function () {
    const startBlock = await colonySale.startBlock.call();
    testHelper.forwardToBlock(startBlock.toNumber());
  };

  describe('sale initialisation', () => {
    beforeEach(async function () {
      await createSale_realValues();
    });

    it("should have correct sale start block", async function () {
      const startBlock = await colonySale.startBlock.call();
      assert.equal(startBlock.toNumber(), 4000000);
    });

    it("should have correct initial sale end block", async function () {
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), 4060480);
    });

    it("should have correct minimum amount to raise", async function () {
      const endBlock = await colonySale.minToRaise.call();
      assert.equal(endBlock.toNumber(), web3.toWei(20000, 'ether'));
    });

    it("should have correct min post soft cap blocks duration", async function () {
      const postSoftCapMinBlocks = await colonySale.postSoftCapMinBlocks.call();
      assert.equal(postSoftCapMinBlocks.toNumber(), 540);
    });

    it("should have correct max post soft cap blocks duration", async function () {
      const postSoftCapMaxBlocks = await colonySale.postSoftCapMaxBlocks.call();
      assert.equal(postSoftCapMaxBlocks.toNumber(), 4320);
    });

    it("should throw if initialised with invalid block duration parameters", async function () {
      try {
        await ColonyTokenSale.new(4000000, 20000, testSoftCap, 0, 4320, 60480, etherRouter.address, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }

      try {
        await ColonyTokenSale.new(4000000, 20000, testSoftCap, 540, 540, 60480, etherRouter.address, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
    });

    it("should throw if initialised with zero address parameters", async function () {
      let saleContract = '';
      try {
        saleContract = await ColonyTokenSale.new(4000000, 20000, testSoftCap, 0, 4320, 60480, 0, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
      assert.equal(saleContract, '');

      try {
        saleContract = await ColonyTokenSale.new(4000000, 20000, testSoftCap, 540, 540, 60480, etherRouter.address, 0x0);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
      assert.equal(saleContract, '');
    });

    it("should have CLNY token wei price multiplier of 1000", async function () {
      const tokenPriceMultiplier = await colonySale.tokenPriceMultiplier.call();
      assert.equal(tokenPriceMultiplier.toNumber(), 1000);
    });

    it("should have correct minimum contribution", async function () {
      const minimumContribution = await colonySale.minimumContribution.call();
      assert.equal(minimumContribution.toNumber(), r_minContribution);
    });

    it("should have correct soft cap", async function () {
      const softCap = await colonySale.softCap.call();
      assert.equal(softCap.toNumber(), web3.toWei('50000', 'ether'));
    });

    it("should have set the Token address", async function () {
      const tokenAddress = await colonySale.token.call();
      assert.equal(tokenAddress, etherRouter.address);
    });

    it("should have saleStopped set to false", async function () {
      const saleStopped = await colonySale.saleStopped.call();
      assert.isFalse(saleStopped);
    });

    it("should have saleFinalized set to false", async function () {
      const saleFinalized = await colonySale.saleFinalized.call();
      assert.isFalse(saleFinalized);
    });
  });

  describe('before sale start block is reached', () => {
    beforeEach('setup future startBlock', async () => {
      await createSale_testValues();
    });

    it("should NOT accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);
      try {
        testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
      const totalRaised = await colonySale.totalRaised.call();
      const startingTotalRaised = web3.toWei(1, 'finney');
      assert.equal(totalRaised.toNumber(), startingTotalRaised);
    });
  });

  describe('when sale start block is reached', async () => {
    beforeEach('setup sale at startBlock', async () => {
      await createSale_testValues();
      await forwardToStartBlock();
      // Send the min contribution as a start
      testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
    });

    it("should accept contributions before the soft cap is reached", async function () {
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_minContribution);
      const colonySaleBalanceAfter = await web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), 2 * t_minContribution);
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), t_minContribution);
    });

    it("contributions should log Puchase events", async function () {
      const tx = await colonySale.send(t_minContribution);
      assert.equal(tx.logs[0].event, 'Purchase');
    });

    it("should NOT accept contributions less than the minimum", async function () {
      try {
        await testHelper.sendWei(BUYER_ONE, colonySale.address, 10);
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), t_minContribution);
    });

    it("should throw if cannot forward funds to multisig wallet", async function () {
      const currentBlock = await web3.eth.blockNumber;
      await createSale_invalidMultiSig();
      try {
        await testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toNumber(), 0);
    });

    it("should NOT be able to finalize sale", async function () {
      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isFalse(saleFinalised);
    });

    it("should NOT be able to claim tokens", async function () {
      try {
        let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });

    it("should be able to STOP the sale", async function () {
      let txData = await colonySale.contract.stop.getData();
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      const saleStopped = await colonySale.saleStopped.call();
      assert.isTrue(saleStopped);

      try {
        await testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), t_minContribution);
    });

    it("should be able to START a stopped sale", async function () {
      let txData = await colonySale.contract.stop.getData();
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      txData = await colonySale.contract.start.getData();
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      const saleStopped = await colonySale.saleStopped.call();
      assert.isFalse(saleStopped);

      await testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      const colonySaleBalanceAfter = await web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), t_minContribution * 2);
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), t_minContribution * 2);
    });
  });

  describe('when soft cap reached', async () => {
    beforeEach(async () => {
      await createSale_testValues();
      await forwardToStartBlock();
    });

    it('while under the postSoftCapMinBlocks, should set remainder duration to postSoftCapMinBlocks', async function () {
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + t_postSoftCapMinBlocks);
    });

    it('while over postSoftCapMinBlocks but under postSoftCapMaxBlocks, should set remainder duration to that amount of blocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(t_postSoftCapMinBlocks).plus(2).toNumber());

      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + t_postSoftCapMinBlocks + 3);
    });

    it('while over postSoftCapMaxBlocks, should set remainder duration to postSoftCapMaxBlocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(t_postSoftCapMaxBlocks).plus(1).toNumber());

      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + t_postSoftCapMaxBlocks);
    });

    it('while over postSoftCapMaxBlocks and over longest-sale-duration block should keep remainder duration to longest-sale-duration block (default)',
    async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(t_postSoftCapMaxBlocks).plus(5).toNumber());

      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), startBlock.plus(t_maxSaleDuration).toNumber());
    });

    it('when soft cap reached and endBlock reset, should not reset endBlock again', async function () {
      const tx1 = await colonySale.send(t_softCap, { from: BUYER_TWO });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + t_postSoftCapMinBlocks);
      assert.equal(tx1.logs[0].event, 'updatedSaleEndBlock');

      // Execute another buy tx and check endBlock hasn't been updated
      const tx2 = await colonySale.send(t_minContribution, { from: BUYER_TWO });
      assert.notEqual(tx2.logs[0].event, 'updatedSaleEndBlock');
      const endBlockNew = await colonySale.endBlock.call();
      assert.equal(endBlockNew.toNumber(), endBlock.toNumber());
    });

    it("should NOT be able to finalize sale", async function () {
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);

      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isFalse(saleFinalised);
    });

    it("should NOT be able to claim tokens", async function () {
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);

      try {
        let txData = await colonySale.contract.claimPurchase.getData(BUYER_TWO);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_TWO);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });

    it("should be able to STOP the sale", async function () {
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);

      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);

      let txData = await colonySale.contract.stop.getData();
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      const saleStopped = await colonySale.saleStopped.call();
      assert.isTrue(saleStopped);

      try {
        await testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
    });

    it("should be able to START a stopped sale", async function () {
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_softCap);

      let txData = await colonySale.contract.stop.getData();
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      txData = await colonySale.contract.start.getData();
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      const saleStopped = await colonySale.saleStopped.call();
      assert.isFalse(saleStopped);

      await testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), t_minContribution);
    });
  });

  describe('when sale is successful, i.e. endBlock reached and raised minimum amount', () => {
    beforeEach('setup a closed sale', async () => {
      await createSale_testValues();
      await forwardToStartBlock();
      // Add purchases for 3 ether 18 finney 1 szabo in total
      testHelper.sendEther(BUYER_ONE, colonySale.address, 998, 'finney');
      testHelper.sendEther(BUYER_TWO, colonySale.address, 10, 'finney');
      testHelper.sendEther(BUYER_THREE, colonySale.address, 10001, 'szabo');
      testHelper.sendEther(BUYER_TWO, colonySale.address, 2, 'ether');
      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());
    });

    it("should NOT accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);
      const totalRaisedBefore = await colonySale.totalRaised.call();
      try {
        testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
      const totalRaisedAfter = await colonySale.totalRaised.call();
      assert.equal(totalRaisedAfter.toNumber(), totalRaisedBefore.toNumber());
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), web3.toWei(998, 'finney'));
    });

    it("when sale NOT yet finalized, should NOT be able to claim tokens", async function () {
      try {
        let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });

    it("when minToRaise has been reached, should be able to finalize sale", async function () {
      const tx = await colonySale.finalize();
      assert.equal(tx.logs[4].event, 'SaleFinalized');
      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isTrue(saleFinalised);
    });

    it("when sale finalised, should NOT be able to finalize sale again", async function () {
      await colonySale.finalize();

      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isTrue(saleFinalised);
    });

    it("when sale finalized, should mint correct total retained tokens", async function () {
      await colonySale.finalize();
      const tokenSupply = await token.totalSupply.call();
      const expected = new BigNumber('5917649019607843137254');
      assert.equal(tokenSupply.toNumber(), expected.toNumber()); // = 3018001 * 1e15 * CLNY tokens sold / 0.51
    });

    it("when sale finalized, should assign correct retained allocations", async function () {
      await colonySale.finalize();

      // Total number of tokens (wei) is 5917649019607843137254
      // Investor balance = 5% of total
      const investorTokenWeiBalance = await token.balanceOf.call(INVESTOR_1);
      const expectedInvestorAllocation = new BigNumber('295882450980392156863'); // Actually 5% is exactly 295784313725490196078.5
      assert.isTrue(investorTokenWeiBalance.equals(expectedInvestorAllocation), 'Investor allocation incorrect');

      // Team balance = 10% of total
      const teamMember1TokenWeiBalance = await token.balanceOf.call(TEAM_MEMBER_1);
      const expectedTeamMember1Allocation = new BigNumber('30000000000000000000');
      assert.isTrue(teamMember1TokenWeiBalance.equals(expectedTeamMember1Allocation));

      const teamMember2TokenWeiBalance = await token.balanceOf.call(TEAM_MEMBER_2);
      const expectedTeamMember2Allocation = new BigNumber('80000000000000000000');
      assert.isTrue(teamMember2TokenWeiBalance.equals(expectedTeamMember2Allocation));

      // Strategy fund balance = 19% of total
      const strategyFundTokenWeiBalance = await token.balanceOf.call(STRATEGY_FUND);
      const expectedStrategyFundAllocation = new BigNumber('1124353313725490196078');
      assert.isTrue(strategyFundTokenWeiBalance.equals(expectedStrategyFundAllocation), 'StrategyFund allocation incorrect');
    });

    it("when sale finalized, should generate correct token grants", async function () {
      await colonySale.finalize();

      const teamGrantAmount = await colonySale.tokenGrants.call(TEAM_MULTISIG);
      assert.equal(teamGrantAmount.toNumber(), new BigNumber('481764901960784313725').toNumber());

      const foundationGrantAmount = await colonySale.tokenGrants.call(FOUNDATION);
      assert.equal(foundationGrantAmount.toNumber(), new BigNumber('887647352941176470588').toNumber());
    });

    it("when sale finalized, buyers should be able to claim their tokens", async function () {
      await colonySale.finalize();

      // Initially their balance is 0, except if they receive preallcated tokens, e.g. investors
      const tokenBalance1Pre = await token.balanceOf.call(COLONY_ACCOUNT);
      assert.equal(tokenBalance1Pre.toNumber(), 0);
      const tokenBalance2Pre = await token.balanceOf.call(BUYER_ONE);
      assert.equal(tokenBalance2Pre.toNumber(), 0);
      const tokenBalance3Pre = await token.balanceOf.call(BUYER_TWO);
      assert.equal(tokenBalance3Pre.toNumber(), 0);
      // Claim tokens
      let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      const tokenBalance2 = await token.balanceOf.call(BUYER_ONE);
      assert.equal(tokenBalance2.toNumber(), 998 * 1e18);

      txData = await colonySale.contract.claimPurchase.getData(BUYER_TWO);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      const tokenBalance3 = await token.balanceOf.call(BUYER_TWO);
      assert.equal(tokenBalance3.toNumber(), 2010 * 1e18);

      txData = await colonySale.contract.claimPurchase.getData(BUYER_THREE);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      const tokenBalance4 = await token.balanceOf.call(BUYER_THREE);
      assert.equal(tokenBalance4.toNumber(), 10001 * 1e15);
    });

    it("when sale is finalized and tokens claimed, that account balance in userBuys should be set to 0", async function () {
      await colonySale.finalize();
      let txData = await colonySale.contract.claimPurchase.getData(COLONY_ACCOUNT);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      const userBuy = await colonySale.userBuys.call(COLONY_ACCOUNT);
      assert.equal(userBuy.toNumber(), 0);
    });

    it.skip("when sale is finalized and tokens claimed, claim event should be logged", async function () {
      await colonySale.finalize();
      let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
      const tx = await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      // Cannot get the logs below the multisig parent transaction
      assert.equal(tx.logs[2].event, 'Claim');
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), 0);
    });

    it("when called by anyone but colonyMultisig, should NOT be able to claim tokens", async function () {
      await colonySale.finalize();

      try {
        let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: BUYER_ONE });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });
  });

  describe('when sale is unsuccessful, i.e. endBlock reached without raising minimum amount', () => {
    beforeEach('setup unsuccessful sale', async () => {
      await createSale_testValues();
      await forwardToStartBlock();
      testHelper.sendWei(BUYER_ONE, colonySale.address, t_minContribution);
      testHelper.sendWei(BUYER_TWO, colonySale.address, t_minContribution);
      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());
    });

    it("should NOT be able to finalize sale", async function () {
      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isFalse(saleFinalised);
    });

    it("should NOT be able to claim tokens", async function () {
      try {
        let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder1 = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder1.toNumber(), 0);
      const balanceOfTokenholder2 = await token.balanceOf.call(BUYER_TWO);
      assert.equal(balanceOfTokenholder2.toNumber(), 0);
    });
  });

  describe('6-24 months after public sale is finalized', () => {
    let foundationTotal = new BigNumber('887647352941176470588');
    let teamTotal = new BigNumber('481764901960784313725');
    const secondsPerMonth = 2628000;

    beforeEach('setup a finalized sale', async () => {
      await createSale_testValues();
      await forwardToStartBlock();
      // Add purchases for 3 ether 18 finney 1 szabo in total
      testHelper.sendEther(BUYER_ONE, colonySale.address, 998, 'finney');
      testHelper.sendEther(BUYER_TWO, colonySale.address, 10, 'finney');
      testHelper.sendEther(BUYER_THREE, colonySale.address, 10001, 'szabo');
      testHelper.sendEther(BUYER_TWO, colonySale.address, 2, 'ether');
      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());
      await colonySale.finalize();
    });

    it("Less than 6 months after sale finalized, team should NOT be able to claim token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 5);
      const balanceBefore = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceBefore.toNumber(), 0);

      try {
        await colonySale.claimVestedTokens({ from: TEAM_MULTISIG });
      }
      catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceAfter = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceAfter.toNumber(), 0);
    });

    it("Less than 6 months after sale finalized, foundation should NOT be able to claim token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 5);
      const balanceBefore = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceBefore.toNumber(), 0);

      try {
        await colonySale.claimVestedTokens({ from: FOUNDATION });
      }
      catch (err) {
        testHelper.ifUsingTestRPC(err);
      }
      const balanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceAfter.toNumber(), 0);
    });

    it("6 months after sale finalized, team should be able to claim 25% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 6);
      const balanceBefore = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceBefore.toNumber(), 0);

      await colonySale.claimVestedTokens({ from: TEAM_MULTISIG });
      const balanceAfter = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceAfter.toNumber(), teamTotal.div(24).mul(6).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(TEAM_MULTISIG);
      assert.equal(tokenGrantClaimed[1].toNumber(), teamTotal.div(24).mul(6).toNumber());
    });

    it("6 months after sale finalized, foundation should be able to claim 25% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 6);
      const balanceBefore = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceBefore.toNumber(), 0);

      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const balanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceAfter.toNumber(), foundationTotal.div(4).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(FOUNDATION);
      assert.equal(tokenGrantClaimed[1].toNumber(), foundationTotal.div(4).toNumber());
    });

    it("12 months after sale finalized, team should be able to claim 50% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 12);
      await colonySale.claimVestedTokens({ from: TEAM_MULTISIG });
      const balanceAfter = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceAfter.toNumber(), teamTotal.div(2).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(TEAM_MULTISIG);
      assert.equal(tokenGrantClaimed[1].toNumber(), teamTotal.div(2).toNumber());
    });

    it("12 months after sale finalized, foundation should be able to claim 50% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 12);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const balanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceAfter.toNumber(), foundationTotal.div(2).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(FOUNDATION);
      assert.equal(tokenGrantClaimed[1].toNumber(), foundationTotal.div(2).toNumber());
    });

    it("18 months after sale finalized, team should be able to claim 75% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 18);
      await colonySale.claimVestedTokens({ from: TEAM_MULTISIG });
      const balanceAfter = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceAfter.toNumber(), teamTotal.div(4).mul(3).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(TEAM_MULTISIG);
      assert.equal(tokenGrantClaimed[1].toNumber(), teamTotal.div(4).mul(3).toNumber());
    });

    it("18 months after sale finalized, foundation should be able to claim 75% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 18);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const balanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceAfter.toNumber(), foundationTotal.div(4).mul(3).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(FOUNDATION);
      assert.equal(tokenGrantClaimed[1].toNumber(), foundationTotal.div(4).mul(3).toNumber());
    });

    it("21 months after sale finalized, foundation should be able to claim 87.5% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 21 + 2000);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const balanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceAfter.toNumber(), foundationTotal.div(24).mul(21).toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(FOUNDATION);
      assert.equal(tokenGrantClaimed[1].toNumber(), foundationTotal.div(24).mul(21).toNumber());
    });

    it("24 months after sale finalized, team should be able to claim 100% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 24);
      await colonySale.claimVestedTokens({ from: TEAM_MULTISIG });
      const balanceAfter = await token.balanceOf.call(TEAM_MULTISIG);
      assert.equal(balanceAfter.toNumber(), teamTotal.toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(TEAM_MULTISIG);
      assert.equal(tokenGrantClaimed[1].toNumber(), teamTotal.toNumber());
    });

    it("24 months after sale finalized, foundation should be able to claim 100% of their total token grant", async function () {
      testHelper.forwardTime(secondsPerMonth * 24);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const balanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(balanceAfter.toNumber(), foundationTotal.toNumber());

      const tokenGrantClaimed = await colonySale.grantClaimTotals.call(FOUNDATION);
      assert.equal(tokenGrantClaimed[1].toNumber(), foundationTotal.toNumber());
    });

    it("token grants should be claimed correctly over time", async function () {
      testHelper.forwardTime(secondsPerMonth * 6.9);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      let foundationBalance = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalance.toNumber(), foundationTotal.div(24).mul(6).toNumber());

      testHelper.forwardTime(secondsPerMonth * 0.2);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      foundationBalance = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalance.toNumber(), foundationTotal.div(24).mul(7).toNumber());

      testHelper.forwardTime(secondsPerMonth * 16.6);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      foundationBalance = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalance.toNumber(), foundationTotal.div(24).mul(23).toNumber());

      testHelper.forwardTime(secondsPerMonth);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      foundationBalance = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalance.toNumber(), foundationTotal.toNumber());
    });

    it("token grants should be claimed correctly over long periods of time", async function () {
      testHelper.forwardTime(secondsPerMonth * 10);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      let foundationBalance = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalance.toNumber(), foundationTotal.div(24).mul(10).toNumber());

      testHelper.forwardTime(secondsPerMonth * (256 -2));
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      foundationBalance = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalance.toNumber(), foundationTotal.toNumber());
    });

    it("when submitting multiple successive claims, token grants should be claimed correctly", async function () {
      testHelper.forwardTime(secondsPerMonth * 10);
      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const foundationBalanceBefore = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalanceBefore.toNumber(), foundationTotal.div(24).mul(10).toNumber());

      await colonySale.claimVestedTokens({ from: FOUNDATION });
      const foundationBalanceAfter = await token.balanceOf.call(FOUNDATION);
      assert.equal(foundationBalanceBefore.toNumber(), foundationBalanceAfter.toNumber());
    });

    it("when all purchases and grants have been claimed, colonySale token balance should be 0", async function () {
      let txData = await colonySale.contract.claimPurchase.getData(BUYER_ONE);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      txData = await colonySale.contract.claimPurchase.getData(BUYER_TWO);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      txData = await colonySale.contract.claimPurchase.getData(BUYER_THREE);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      testHelper.forwardTime(secondsPerMonth * 24);
      await colonySale.claimVestedTokens({ from: TEAM_MULTISIG });
      await colonySale.claimVestedTokens({ from: FOUNDATION });

      const tokenBalanceLeft = await token.balanceOf.call(colonySale.address);
      assert.equal(tokenBalanceLeft.toNumber(), 0);
    });
  });
});
