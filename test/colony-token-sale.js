var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];
  let colonySale;

  describe('sale initialisation', () => {
    let softCapInWei;

    before(async function () {
      softCapInWei = web3.toWei(200000, 'ether');
      colonySale = await ColonyTokenSale.new(4000000, softCapInWei, 635, 5082, 71153);
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
        await ColonyTokenSale.new(4000000, softCapInWei, 0, 5082, 71153);
      } catch (e) {
        testHelper.ifUsingTestRPC(e);
      }

      try {
        await ColonyTokenSale.new(4000000, softCapInWei, 635, 635, 71153);
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

    it.skip("should have correct minumum amount to raise", async function () {
      const minimumAmountToRaise = await colonySale.minimumAmountToRaise.call();
      assert.equal(minimumAmountToRaise.toNumber(), web3.toWei('40000', 'ether'));
    });
  });

  describe('before the start block is reached', () => {
    beforeEach('setup future startBlock', async () => {
      const currentBlock = web3.eth.blockNumber;
      const startBlock = currentBlock + 30;
      colonySale = await ColonyTokenSale.new(startBlock, 1000, 5, 10, 20);
    });

    it("should not accept contributions", async function () {
      const colonySaleBalanceBefore = web3.eth.getBalance(colonySale.address);
      const amountInWei = web3.toWei(1, 'finney');
      try {
        web3.eth.sendTransaction({ from: COINBASE_ACCOUNT, to: colonySale.address, value: amountInWei });
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonySale.address);
      assert.equal(colonySaleBalanceAfter.toNumber(), colonySaleBalanceBefore.toNumber());
      const totalRaised = await colonySale.totalRaised.call();
      assert.equal(totalRaised.toNumber(), 0);
    });
  });

  describe('start of public sale, when the start block is reached', async () => {
    beforeEach('setup sale at startBlock', async () => {
      const currentBlock = web3.eth.blockNumber;
      colonySale = await ColonyTokenSale.new(currentBlock, 1000, 5, 10, 20);
      // Send 1 test ether to the contract
      testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 1, 'ether');
    });

    it("should accept contributions before the soft cap is reached", async function () {
      testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 1, 'ether');
      const colonySaleBalanceAfter = web3.eth.getBalance(colonySale.address);
      const totalRaised = web3.toWei(2, 'ether');
      assert.isTrue(colonySaleBalanceAfter.equals(totalRaised));
    });

    it("should not accept contributions less than the minimum of 1 finney", async function () {
      try {
        testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 10, 'wei');
      } catch(err) {
        testHelper.ifUsingTestRPC(err);
      }
      const colonySaleBalanceAfter = web3.eth.getBalance(colonySale.address);
      const totalRaised = web3.toWei(1, 'ether');
      assert.equal(colonySaleBalanceAfter.toNumber(), totalRaised);
    });

    it.skip('should fail to transfer tokens too early', async function () {

    });
  });

  describe('when soft cap reached', async () => {
    const postSoftCapMinBlocks = 5;
    const postSoftCapMaxBlocks = 7
    const maxSaleDuration = 18;
    const softCap = web3.toWei(10, 'finney');

    beforeEach(async () => {
      const currentBlock = web3.eth.blockNumber;
      colonySale = await ColonyTokenSale.new(currentBlock, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration);
    });

    it('while under the postSoftCapMinBlocks, should set remainder duration to postSoftCapMinBlocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMinBlocks);
    });

    it('while over postSoftCapMinBlocks but under postSoftCapMaxBlocks, should set remainder duration to that amount of blocks',
    async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(5).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMinBlocks + 1);
    });

    it('while over postSoftCapMaxBlocks, should set remainder duration to postSoftCapMaxBlocks', async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(8).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const currentBlock = web3.eth.blockNumber;
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), currentBlock + postSoftCapMaxBlocks);
    });

    it('while over postSoftCapMaxBlocks and over longest-sale-duration block should keep remainder duration to longest-sale-duration block (default)',
    async function () {
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.plus(10).toNumber());
      // Reach the softCap
      await colonySale.send(softCap, { from: COINBASE_ACCOUNT });
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), startBlock.plus(maxSaleDuration).toNumber());
    });
  });

  // Sale ends after 21 days or 24 hours after the soft cap is reached, whichever comes first
  describe.skip('End of public sale', () => {
    it('if soft cap is NOT reached within 14 days from start, should close the sale', async function () {

    });

    it('when post softCap period is occuring and the maximum number of blocks 71153 is reached, should close the sale', async function () {

    });

    it('when post softCap period has ended, should close the sale', async function () {

    });
  });

  describe.skip('Past end of public sale', () => {
    it.skip("should not accept contributions", async function () {

    });
  });

  describe.skip('Two years after public sale completes', () => {
  });
});
