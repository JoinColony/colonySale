var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var Token = artifacts.require("./Token.sol");
var Resolver = artifacts.require("./Resolver.sol");
var EtherRouter = artifacts.require('./EtherRouter.sol');
var Ownable = artifacts.require('./Ownable.sol');
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];

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

  before(async function () {
    ownable = await Ownable.deployed();
    tokenDeployed = await Token.deployed();
    resolver = await Resolver.new(tokenDeployed.address);
  });

  // Setup blank token and token sale with given parameters
  const createColonyTokenSale = async function (startBlock, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration) {
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    colonyMultisig = await MultiSigWallet.new([COINBASE_ACCOUNT], 1);
    colonySale = await ColonyTokenSale.new(startBlock, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration, etherRouter.address, colonyMultisig.address);
  };

  const createColonyTokenSaleWithInvalidMultiSig = async function (startBlock, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration) {
    let etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    colonyMultisig = await MultiSigWallet.new([COINBASE_ACCOUNT], 1);
    colonySale = await ColonyTokenSale.new(startBlock, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration, etherRouter.address, ownable.address);
  };

  describe('sale initialisation', () => {
    beforeEach(async function () {
      softCapInWei = web3.toWei(200000, 'ether');
      await createColonyTokenSale(4000000, softCapInWei, 635, 5082, 71153);
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
        await ColonyTokenSale.new(4000000, softCapInWei, 0, 5082, 71153, etherRouter.address, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }

      try {
        await ColonyTokenSale.new(4000000, softCapInWei, 635, 635, 71153, etherRouter.address, colonyMultisig.address);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }
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
      assert.equal(softCap.toNumber(), web3.toWei('200000', 'ether'));
    });

    it("should have set the Token address", async function () {
      const tokenAddress = await colonySale.token.call();
      assert.equal(tokenAddress, etherRouter.address);
    });

    it.skip("should have correct minumum amount to raise", async function () {
      const minimumAmountToRaise = await colonySale.minimumAmountToRaise.call();
      assert.equal(minimumAmountToRaise.toNumber(), web3.toWei('40000', 'ether'));
    });
  });

  describe('before sale start block is reached', () => {
    beforeEach('setup future startBlock', async () => {
      const currentBlock = web3.eth.blockNumber;
      const startBlock = currentBlock + 30;
      await createColonyTokenSale(startBlock, 1000, 5, 10, 20);
    });

    it("should not accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);
      const amountInWei = web3.toWei(1, 'finney');
      try {
        web3.eth.sendTransaction({ from: COINBASE_ACCOUNT, to: colonySale.address, value: amountInWei });
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
      await createColonyTokenSale(currentBlock, web3.toWei(1, 'ether'), 5, 7, 18);
      // Send the min contribution as a start
      await testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 1, 'finney');
    });

    it("should accept contributions before the soft cap is reached", async function () {
      await testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 1, 'finney');
      const colonySaleBalanceAfter = await web3.eth.getBalance(colonyMultisig.address);
      const totalRaised = web3.toWei(2, 'finney');
      assert.equal(colonySaleBalanceAfter.toNumber(), totalRaised);
      const totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toNumber(), 2);
    });

    it("should not accept contributions less than the minimum of 1 finney", async function () {
      try {
        await testHelper.sendEther(ACCOUNT_TWO, colonySale.address, 10, 'wei');
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      const totalRaised = web3.toWei(1, 'finney');
      assert.equal(colonySaleBalanceAfter.toNumber(), totalRaised);
      const totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toNumber(), 1);
    });

    it("should throw if cannot forward funds to multisig wallet", async function () {
      const currentBlock = await web3.eth.blockNumber;
      await createColonyTokenSaleWithInvalidMultiSig(currentBlock, web3.toWei(1, 'ether'), 5, 7, 18);
      try {
        await testHelper.sendEther(ACCOUNT_TWO, colonySale.address, 1, 'finney');
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toNumber(), 0);
    });

    it("should issue the correct tokens for valid contributions", async function () {
      await testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 4, 'finney');
      await testHelper.sendEther(ACCOUNT_TWO, colonySale.address, 1, 'ether');
      await testHelper.sendEther(ACCOUNT_THREE, colonySale.address, 12, 'finney');
      await testHelper.sendEther(ACCOUNT_TWO, colonySale.address, 1, 'finney');
      await testHelper.sendEther(ACCOUNT_THREE, colonySale.address, 2, 'ether');

      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), 3018000000000000000); // 3 ether 18 finney
      const totalSupply = await token.totalSupply.call();
      assert.equal(totalSupply.toNumber(), 3018);

      const tokenBalance1 = await token.balanceOf.call(COINBASE_ACCOUNT);
      const tokenBalance2 = await token.balanceOf.call(ACCOUNT_TWO);
      const tokenBalance3 = await token.balanceOf.call(ACCOUNT_THREE);
      assert.equal(tokenBalance1.toNumber(), 5);
      assert.equal(tokenBalance2.toNumber(), 1001);
      assert.equal(tokenBalance3.toNumber(), 2012);
    });

    it("should not be able to finalize sale", async function () {
      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isFalse(saleFinalised);
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
      await createColonyTokenSale(web3.eth.blockNumber, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration);
    });

    it('while under the postSoftCapMinBlocks, should set remainder duration to postSoftCapMinBlocks', async function () {
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMinBlocks);
    });

    it('while over postSoftCapMinBlocks but under postSoftCapMaxBlocks, should set remainder duration to that amount of blocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(postSoftCapMinBlocks - 1).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMinBlocks);
    });

    it('while over postSoftCapMaxBlocks, should set remainder duration to postSoftCapMaxBlocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(postSoftCapMaxBlocks).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMaxBlocks);
    });

    it('while over postSoftCapMaxBlocks and over longest-sale-duration block should keep remainder duration to longest-sale-duration block (default)',
    async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(15).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), startBlock.plus(maxSaleDuration).toNumber());
    });

    it("should not be able to finalize sale", async function () {
      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isFalse(saleFinalised);
    });
  });

  describe('when sale end block is reached', () => {
    beforeEach('setup a closed sale', async () => {
      const softCap = web3.toWei(10, 'finney');
      const currentBlock = web3.eth.blockNumber;
      await createColonyTokenSale(currentBlock, softCap, 5, 10, 20);
      // Reach the soft cap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());
    });

    it("should not accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonyMultisig.address);
      const totalRaisedBefore = await colonySale.totalRaised.call();
      const amountInWei = web3.toWei(1, 'finney');
      try {
        web3.eth.sendTransaction({ from: COINBASE_ACCOUNT, to: colonySale.address, value: amountInWei });
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonyMultisig.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
      const totalRaisedAfter = await colonySale.totalRaised.call();
      assert.equal(totalRaisedAfter.toNumber(), totalRaisedBefore.toNumber());
    });

    it("should be able to finalize sale", async function () {
      await colonySale.finalize();
      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isTrue(saleFinalised);
    });

    it("should not be able to finalize sale more which is already finalized", async function () {
      await colonySale.finalize();

      try {
        await colonySale.finalize();
      } catch (err) {
        testHelper.ifUsingTestRPC(err);
      }

      const saleFinalised = await colonySale.saleFinalized.call();
      assert.isTrue(saleFinalised);
    });
  });

  describe.skip('Two years after public sale completes', () => {
  });
});
