var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var Token = artifacts.require("./Token.sol");
var Resolver = artifacts.require("./Resolver.sol");
var EtherRouter = artifacts.require('./EtherRouter.sol');
var Ownable = artifacts.require('./Ownable.sol');
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

import BigNumber from 'bignumber.js';
import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  const COLONY_ACCOUNT = accounts[0]; //0xb77D57F4959eAfA0339424b83FcFaf9c15407461
  const BUYER_ONE = accounts[1];      //0x9dF24e73f40b2a911Eb254A8825103723E13209C
  const BUYER_TWO = accounts[2];      //0x27fF0C145E191C22C75cD123C679C3e1F58a4469
  const BUYER_THREE = accounts[3];    //0x0021Cb24d7D4e669120b139030095315DFa6699a
  const BUYER_FOUR = accounts[4];     //0xF822d689a2e10c1511dcD54dF5Ce43a9d393e75c
  const INVESTOR_1 = '0x3a965407cEd5E62C5aD71dE491Ce7B23DA5331A4';
  const INVESTOR_2 = accounts[6];     //0x9F485401a3C22529aB6EA15E2EbD5A8CA54a5430
  const TEAM_MEMBER_1 = accounts[7];  //0x4110afd6bAc4F25724aDe66F0e0300dde0696a58
  const TEAM_MEMBER_2 = accounts[8];  //0x099a2B3E7b8558381A8aB3B3B7953858d5691946
  const TEAM_MEMBER_3 = accounts[9];  //0xd6Bf4Be334A4661e12a647b62EF1510a247dd625
  const FOUNDATION = accounts[10];    //0x4e7DBb49018489a27088FE304b18849b02F708F6
  const STRATEGY_FUND = '0x2304aD70cAA2e8D4BE0665E4f49AD1eDe56F3e8F'

  // Initialised at the start of test in `before` call
  let ownable;
  let tokenDeployed;
  let resolver;

  // Set via createColonyTokenSale function
  let etherRouter;
  let token;
  let colonyMultisig;
  let colonySale;

  // Sale properties
  let softCapInWei;
  let minAmountToRaise;

  before(async function () {
    ownable = await Ownable.deployed();
    tokenDeployed = await Token.deployed();
    resolver = await Resolver.new(tokenDeployed.address);
  });

  // Setup blank token and token sale with given parameters
  const createColonyTokenSale = async function (startBlock, minToRaise, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration) {
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    colonyMultisig = await MultiSigWallet.new([COLONY_ACCOUNT], 1);
    colonySale = await ColonyTokenSale.new(startBlock, minToRaise, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration, etherRouter.address, colonyMultisig.address);
  };

  const createColonyTokenSaleWithInvalidMultiSig = async function (startBlock, minToRaise, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration) {
    let etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    colonyMultisig = await MultiSigWallet.new([COLONY_ACCOUNT], 1);
    colonySale = await ColonyTokenSale.new(startBlock, minToRaise, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration, etherRouter.address, ownable.address);
  };

  describe('sale initialisation', () => {
    beforeEach(async function () {
      softCapInWei = web3.toWei(50000, 'ether');
      minAmountToRaise = web3.toWei(20000, 'ether');
      await createColonyTokenSale(4000000, minAmountToRaise, softCapInWei, 635, 5082, 71153);
    });

    it("should return correct current block number", async function () {
      await testHelper.stopMining();
      const currentBlock = await colonySale.getBlockNumber.call();
      const currentActualBlock = web3.eth.blockNumber;
      await testHelper.startMining();
      assert.equal(currentActualBlock, currentBlock.toNumber());
    });

    it("should have correct sale start block", async function () {
      const startBlock = await colonySale.startBlock.call();
      assert.equal(startBlock.toNumber(), 4000000);
    });

    it("should have correct initial sale end block", async function () {
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), 4071153);
    });

    it("should have correct minimum amount to raise", async function () {
      const endBlock = await colonySale.minToRaise.call();
      assert.equal(endBlock.toNumber(), web3.toWei(20000, 'ether'));
    });

    it("should have correct min post soft cap blocks duration", async function () {
      const postSoftCapMinBlocks = await colonySale.postSoftCapMinBlocks.call();
      assert.equal(postSoftCapMinBlocks.toNumber(), 635);
    });

    it("should have correct max post soft cap blocks duration", async function () {
      const postSoftCapMaxBlocks = await colonySale.postSoftCapMaxBlocks.call();
      assert.equal(postSoftCapMaxBlocks.toNumber(), 5082);
    });

    it("should throw if initialised with invalid block duration parameters", async function () {
      try {
        await ColonyTokenSale.new(4000000, 20000, softCapInWei, 0, 5082, 71153, etherRouter.address, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }

      try {
        await ColonyTokenSale.new(4000000, 20000, softCapInWei, 635, 635, 71153, etherRouter.address, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
    });

    it("should throw if initialised with zero address parameters", async function () {
      let saleContract = '';
      try {
        saleContract = await ColonyTokenSale.new(4000000, 20000, softCapInWei, 0, 5082, 71153, 0, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
      assert.equal(saleContract, '');

      try {
        saleContract = await ColonyTokenSale.new(4000000, 20000, softCapInWei, 635, 635, 71153, etherRouter.address, 0x0);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
      assert.equal(saleContract, '');
    });

    it("should have CLNY token wei price of 1 finney", async function () {
      const tokenPrice = await colonySale.tokenPrice.call();
      const oneFinney = web3.toWei(1, 'finney');
      assert.equal(tokenPrice.toNumber(), oneFinney);
    });

    it("should have minimum contribution of 1 finney", async function () {
      const minimumContribution = await colonySale.minimumContribution.call();
      const oneFinney = web3.toWei(1, 'finney');
      assert.equal(minimumContribution.toNumber(), oneFinney);
    });

    it("should have correct soft cap", async function () {
      const softCap = await colonySale.softCap.call();
      assert.equal(softCap.toNumber(), web3.toWei('50000', 'ether'));
    });

    it("should have set the Token address", async function () {
      const tokenAddress = await colonySale.token.call();
      assert.equal(tokenAddress, etherRouter.address);
    });
  });

  describe('before sale start block is reached', () => {
    beforeEach('setup future startBlock', async () => {
      const currentBlock = web3.eth.blockNumber;
      const startBlock = currentBlock + 30;
      await createColonyTokenSale(startBlock, 300, 1000, 5, 10, 20);
    });

    it("should NOT accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);
      const amountInWei = web3.toWei(1, 'finney');
      try {
        web3.eth.sendTransaction({ from: BUYER_ONE, to: colonySale.address, value: amountInWei });
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
      const totalRaised = await colonySale.totalRaised.call();
      assert.equal(totalRaised.toNumber(), 0);
    });
  });

  describe('when sale start block is reached', async () => {
    beforeEach('setup sale at startBlock', async () => {
      const currentBlock = await web3.eth.blockNumber;
      await createColonyTokenSale(currentBlock, web3.toWei(0.3, 'ether'), web3.toWei(1, 'ether'), 5, 7, 18);
      // Send the min contribution as a start
      await testHelper.sendEther(BUYER_ONE, colonySale.address, 1, 'finney');
    });

    it("should accept contributions before the soft cap is reached", async function () {
      await testHelper.sendEther(BUYER_ONE, colonySale.address, 1, 'finney');
      const colonySaleBalanceAfter = await web3.eth.getBalance(colonyMultisig.address);
      const TwoFinney = web3.toWei(2, 'finney');
      assert.equal(colonySaleBalanceAfter.toNumber(), TwoFinney);
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), TwoFinney);
    });

    it("contributions should log Puchase events", async function () {
      const tx = await colonySale.send(web3.toWei(1, 'finney'));
      assert.equal(tx.logs[0].event, 'Purchase');
    });

    it("should NOT accept contributions less than the minimum of 1 finney", async function () {
      try {
        await testHelper.sendEther(BUYER_ONE, colonySale.address, 10, 'wei');
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), web3.toWei(1, 'finney'));
    });

    it("should throw if cannot forward funds to multisig wallet", async function () {
      const currentBlock = await web3.eth.blockNumber;
      await createColonyTokenSaleWithInvalidMultiSig(currentBlock, web3.toWei(1, 'ether'), 5, 7, 18);
      try {
        await testHelper.sendEther(BUYER_ONE, colonySale.address, 1, 'finney');
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
        let txData = await colonySale.contract.claim.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });

    it.skip('should fail to transfer tokens too early', async function () {

    });
  });

  describe('when soft cap reached', async () => {
    const softCap = web3.toWei(10, 'finney');
    const postSoftCapMinBlocks = 6;
    const postSoftCapMaxBlocks = 8;
    const maxSaleDuration = 20;

    beforeEach(async () => {
      await createColonyTokenSale(web3.eth.blockNumber, web3.toWei(3, 'finney'), softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration);
    });

    it('while under the postSoftCapMinBlocks, should set remainder duration to postSoftCapMinBlocks', async function () {
      // Reach the softCap
      await colonySale.send(softCap, { from: BUYER_TWO });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMinBlocks);
    });

    it('while over postSoftCapMinBlocks but under postSoftCapMaxBlocks, should set remainder duration to that amount of blocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(postSoftCapMinBlocks - 1).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: BUYER_TWO });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMinBlocks);
    });

    it('while over postSoftCapMaxBlocks, should set remainder duration to postSoftCapMaxBlocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(postSoftCapMaxBlocks).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: BUYER_TWO });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMaxBlocks);
    });

    it('while over postSoftCapMaxBlocks and over longest-sale-duration block should keep remainder duration to longest-sale-duration block (default)',
    async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(15).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: BUYER_TWO });
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), startBlock.plus(maxSaleDuration).toNumber());
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
        let txData = await colonySale.contract.claim.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });
  });

  describe('when sale is successful, i.e. endBlock reached and raised minimum amount', () => {
    beforeEach('setup a closed sale', async () => {
      const softCap = web3.toWei(3, 'ether');
      const currentBlock = web3.eth.blockNumber;
      await createColonyTokenSale(currentBlock, web3.toWei(1, 'finney'), softCap, 5, 10, 20);
      // Add purchases for 3 ether 18 finney in total
      await testHelper.sendEther(COLONY_ACCOUNT, colonySale.address, 4, 'finney');
      await testHelper.sendEther(BUYER_ONE, colonySale.address, 1, 'ether');
      await testHelper.sendEther(BUYER_TWO, colonySale.address, 12, 'finney');
      await testHelper.sendEther(BUYER_ONE, colonySale.address, 1, 'finney');
      await testHelper.sendEther(BUYER_TWO, colonySale.address, 2, 'ether');
      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());
    });

    it("should NOT accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);
      const totalRaisedBefore = await colonySale.totalRaised.call();
      const amountInWei = web3.toWei(1, 'finney');
      try {
        web3.eth.sendTransaction({ from: BUYER_ONE, to: colonySale.address, value: amountInWei });
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
      const totalRaisedAfter = await colonySale.totalRaised.call();
      assert.equal(totalRaisedAfter.toNumber(), totalRaisedBefore.toNumber());
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), web3.toWei(1001, 'finney'));
    });

    it("when sale NOT yet finalized, should NOT be able to claim tokens", async function () {
      try {
        let txData = await colonySale.contract.claim.getData(BUYER_ONE);
        await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const balanceOfTokenholder = await token.balanceOf.call(BUYER_ONE);
      assert.equal(balanceOfTokenholder.toNumber(), 0);
    });

    it("when minToRaise has been reached, should be able to finalize sale", async function () {
      const tx = await colonySale.finalize();
      assert.equal(tx.logs[2].event, 'SaleFinalized');
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
      assert.equal(tokenSupply.toNumber(), 5915686274509803921569); // = 3017 CLNY tokens sold / 0.51
    });

    it("when sale finalized, should assign correct retained allocations", async function () {
      await colonySale.finalize();

      // Total number of tokens (wei) is 5915686274509803921569
      // Investor balance = 5% of total
      const investorTokenWeiBalance = await token.balanceOf.call(INVESTOR_1);
      const expectedInvestorAllocation = new BigNumber('295784313725490196078'); // Actually 5% is exactly 295784313725490196078.5
      assert.isTrue(investorTokenWeiBalance.equals(expectedInvestorAllocation));

      // Strategy fund balance = 19% of total
      const strategyFundTokenWeiBalance = await token.balanceOf.call(STRATEGY_FUND);
      const expectedStrategyFundAllocation = new BigNumber('1123980392156862745098');
      assert.isTrue(strategyFundTokenWeiBalance.equals(expectedStrategyFundAllocation));
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
      // Claim tokens for account
      let txData = await colonySale.contract.claim.getData(COLONY_ACCOUNT);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      const tokenBalance1 = await token.balanceOf.call(COLONY_ACCOUNT);
      assert.equal(tokenBalance1.toNumber(), 4);

      txData = await colonySale.contract.claim.getData(BUYER_ONE);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      const tokenBalance2 = await token.balanceOf.call(BUYER_ONE);
      assert.equal(tokenBalance2.toNumber(), 1001);

      txData = await colonySale.contract.claim.getData(BUYER_TWO);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      const tokenBalance3 = await token.balanceOf.call(BUYER_TWO);
      assert.equal(tokenBalance3.toNumber(), 2012);
    });

    it("when sale is finalized and tokens claimed, that account balance in userBuys should be set to 0", async function () {
      await colonySale.finalize();
      const txData = await colonySale.contract.claim.getData(COLONY_ACCOUNT);
      await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });

      const userBuy = await colonySale.userBuys.call(COLONY_ACCOUNT);
      assert.equal(userBuy.toNumber(), 0);
    });

    it.skip("when sale is finalized and tokens claimed, claim event should be logged", async function () {
      await colonySale.finalize();
      const txData = await colonySale.contract.claim.getData(BUYER_ONE);
      const tx = await colonyMultisig.submitTransaction(colonySale.address, 0, txData, { from: COLONY_ACCOUNT });
      // Cannot get the logs below the multisig parent transaction
      assert.equal(tx.logs[2].event, 'Claim');
      const userBuy = await colonySale.userBuys.call(BUYER_ONE);
      assert.equal(userBuy.toNumber(), 0);
    });

    it("should NOT be able to claim tokens, if called by anyone but colonyMultisig", async function () {
      try {
        let txData = await colonySale.contract.claim.getData(BUYER_ONE);
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
      const softCap = web3.toWei(10, 'finney');
      const currentBlock = web3.eth.blockNumber;
      await createColonyTokenSale(currentBlock, web3.toWei(3, 'finney'), softCap, 5, 10, 20);
      // Reach the soft cap
      //TODO: standardise the way we send ether. testHelper vs .send
      testHelper.sendEther(BUYER_ONE, colonySale.address, 1, 'finney');
      testHelper.sendEther(BUYER_TWO, colonySale.address, 1, 'finney');
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
        let txData = await colonySale.contract.claim.getData(BUYER_ONE);
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

  describe.skip('Two years after public sale completes', () => {
  });
});
