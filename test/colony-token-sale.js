var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

contract('ColonyTokenSale', function(accounts) {
  describe('Contract initialisation', () => {
    // TODO: ensure the following execute on the same block
    it.skip("should return correct current block number", function() {
      let currentBlockReportedByContract;
      ColonyTokenSale.new()
      .then(function(instance) {
        return instance.getBlockNumber.call();
      })
      .then(function(currentBlock) {
        currentBlockReportedByContract = currentBlock.toNumber();
        return web3.eth.blockNumber;
      })
      .then(function(currentBlock) {
        return assert.equal(currentBlock, currentBlockReportedByContract);
      });
    });

    it("should initiate sale with correct start block", function () {
      ColonyTokenSale.new()
      .then(function(instance) {
        return instance.initialBlock.call();
      })
      .then(function(initialBlock){
        return assert.equal(initialBlock.toNumber(), 4000000);
      });
    });

    it("should initiate sale with correct soft cap", function () {
      ColonyTokenSale.new()
      .then(function(instance) {
        return instance.softCap.call();
      })
      .then(function(softCap){
        return assert.equal(softCap.toNumber(), web3.toWei('200000', 'ether'));
      });
    });

    it.skip("should initiate sale with correct minumum amount to raise", function () {
      ColonyTokenSale.new()
      .then(function(instance) {
        return instance.minimumAmountToRaise.call();
      })
      .then(function(minimumAmountToRaise){
        return assert.equal(minimumAmountToRaise.toNumber(), web3.toWei('40000', 'ether'));
      });
    });

  });

  describe('Before the start block is reached', () => {
    it.skip("should not accept contributions", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  describe.skip('Start of public sale, when the start block is reached', () => {
    before('Time travel to startBlock', (done) => {
      web3.eth.getBlock('latest', (err, result) => {
        return;
      });
    });

    it.skip("should accept contributions before the soft cap is reached", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("should accept contributions after the soft cap is reached but before sale ends", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("should use CLNY token price of 1 finney for first 24 hours", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("CLNY token price should drop by 25 CLNY per day, incremented on a per block basis", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("CLNY token price should drop by 80% when the soft cap is reached for the remaining 24 hours", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it.skip("should fail to accept less than the minimum investment of 1 finney", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it('should fail to transfer tokens too early', function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  // Sale ends after 21 days or 24 hours after the soft cap is reached, whichever comes first
  describe('End of public sale', () => {
    it('if soft cap is reached, should close sale after 24 hours', function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });

    it('if soft cap is NOT reached, should close sale after 21 days from start', function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  describe('Past end of public sale', () => {
    it.skip("should not accept contributions", function () {
      const currentBlock = web3.eth.blockNumber;
      ColonyTokenSale.new();
    });
  });

  describe('Two years after public sale completes', () => {
  });
});
