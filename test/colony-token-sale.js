var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];
  let colonySale;

  beforeEach(async function () {
    colonySale = await ColonyTokenSale.new();
  });

  describe('Sale initialisation', () => {
    // TODO: ensure the following execute on the same block
    it.skip("should return correct current block number", async function () {
      let currentBlockReportedByContract;
      const currentBlock = await colonySale.getBlockNumber.call();
      const currentActualBlock = web3.eth.blockNumber;
      assert.equal(currentActualBlock, currentBlock.toNumber());
    });

    it("should have correct sale start block", async function () {
      const startBlock = await colonySale.startBlock.call();
      assert.equal(startBlock.toNumber(), 4000000);
    });

    it("should have correct soft cap", async function () {
      const softCap = await colonySale.softCap.call();
      assert.equal(softCap.toNumber(), web3.toWei('200000', 'ether'));
    });

    it.skip("should have correct minumum amount to raise", async function () {
      const minimumAmountToRaise = await colonySale.minimumAmountToRaise.call();
      assert.equal(minimumAmountToRaise.toNumber(), web3.toWei('40000', 'ether'));
    });

    it("should have correct maximum duration", async function () {
      const endBlock = await colonySale.endBlock.call();
      assert.equal(endBlock.toNumber(), 4071153);
    });
  });

  describe('Before the start block is reached', () => {
    it.skip("should not accept contributions", async function () {
      const currentBlock = web3.eth.blockNumber;
    });
  });

  describe.skip('Start of public sale, when the start block is reached', async () => {
    before('Time travel to startBlock', (done) => {
      web3.eth.getBlock('latest', (err, result) => {
        return;
      });
    });

    it.skip("should accept contributions before the soft cap is reached", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("should accept contributions after the soft cap is reached but before sale ends", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("should use CLNY token price of 1 finney for first 24 hours", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("CLNY token price should drop by 25 CLNY per day, incremented on a per block basis", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("CLNY token price should drop by 80% when the soft cap is reached for the remaining 24 hours", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("should fail to accept less than the minimum investment of 1 finney", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip('should fail to transfer tokens too early', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  describe('Soft cap reached, countdown to sale end begins', async () => {
    before('get to softCap', async () => {
      colonySale.send(200000, { from: COINBASE_ACCOUNT });
    });

    it('when softCap reached in under 635 blocks, should set remainder duration to 635 blocks', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it('when softCap reached in over 5082 blocks, should set remainder duration to 5082 blocks', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it('when softCap reached in over 635 but under 5082 blocks, should set remainder duration to that amount of blocks', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  // Sale ends after 21 days or 24 hours after the soft cap is reached, whichever comes first
  describe('End of public sale', () => {
    it('if soft cap is NOT reached within 14 days from start, should close the sale', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it('when post softCap period is occuring and the maximum number of blocks 71153 is reached, should close the sale', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it('when post softCap period has ended, should close the sale', async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  describe('Past end of public sale', () => {
    it.skip("should not accept contributions", async function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  describe('Two years after public sale completes', () => {
  });
});
