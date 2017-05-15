var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

contract('ColonyTokenSale', function(accounts) {
  it("should initiate sale with correct start block", function () {
    ColonyTokenSale.new(1234567)
    .then(function(instance) {
      return instance.initialBlock.call();
    })
    .then(function(initialBlock){
      return assert.equal(initialBlock.toNumber(), 1234567);
    });
  });

  it("should return correct current block number", function() {
    let currentBlockReportedByContract;
    ColonyTokenSale.new(1234567)
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
});
