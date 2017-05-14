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

  it.skip("should not accept contributions before the start block", function() {
  });
  it.skip("should accept contributions after the start block", function() {
  });
});
