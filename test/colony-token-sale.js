var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];
  let colonySale;

  describe('Sale initialisation', () => {
    before(async function () {
      colonySale = await ColonyTokenSale.new(4000000);
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

    it("should have correct soft cap", async function () {
      const softCap = await colonySale.softCap.call();
      assert.equal(softCap.toNumber(), web3.toWei('200000', 'ether'));
    });

    it.skip("should have correct minumum amount to raise", async function () {
      const minimumAmountToRaise = await colonySale.minimumAmountToRaise.call();
      assert.equal(minimumAmountToRaise.toNumber(), web3.toWei('40000', 'ether'));
    });
  });

  describe('Before the start block is reached', () => {
    beforeEach('setup future startBlock', async () => {
      const currentBlock = web3.eth.blockNumber;
      const startBlock = currentBlock + 30;
      console.log('startBlock set to', startBlock);
      colonySale = await ColonyTokenSale.new(startBlock);
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

  describe('Start of public sale, when the start block is reached', async () => {
    beforeEach('setup sale at startBlock', async () => {
      const currentBlock = web3.eth.blockNumber;
      console.log('startBlock set to currentBlock', currentBlock);
      colonySale = await ColonyTokenSale.new(currentBlock);
      // Send 1 test ether to the contract
      testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 1);
    });

    it("should accept contributions before the soft cap is reached", async function () {
      testHelper.sendEther(COINBASE_ACCOUNT, colonySale.address, 1);
      const colonySaleBalanceAfter = web3.eth.getBalance(colonySale.address);
      const totalRaised = web3.toWei(2, 'ether');
      assert.isTrue(colonySaleBalanceAfter.equals(totalRaised));
    });

    it.skip("should accept contributions after the soft cap is reached but before sale ends", async function () {

    });

    it.skip("should use CLNY token price of 1 finney for first 24 hours", async function () {

    });

    it.skip("CLNY token price should drop by 25 CLNY per day, incremented on a per block basis", async function () {

    });

    it.skip("CLNY token price should drop by 80% when the soft cap is reached for the remaining 24 hours", async function () {

    });

    it.skip("should fail to accept less than the minimum investment of 1 finney", async function () {

    });

    it.skip('should fail to transfer tokens too early', async function () {

    });
  });

  describe.skip('Soft cap reached, countdown to sale end begins', async () => {
    before('get to softCap', async () => {
      await colonySale.send(200000, { from: COINBASE_ACCOUNT });
    });

    it('when softCap reached in under 635 blocks, should set remainder duration to 635 blocks', async function () {
      const currentBlock = web3.eth.blockNumber;
      //await testHelper.forwardTime(60*60);

    });

    it('when softCap reached in over 5082 blocks, should set remainder duration to 5082 blocks', async function () {

    });

    it('when softCap reached in over 635 but under 5082 blocks, should set remainder duration to that amount of blocks', async function () {

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
