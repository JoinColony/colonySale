var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

contract('ColonyTokenSale', function(accounts) {
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

  it("should return correct current block number", function() {
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

  it.skip("should not accept contributions before the start block", function () {
    const currentBlock = web3.eth.blockNumber;
    ColonyTokenSale.new();
  });
});
