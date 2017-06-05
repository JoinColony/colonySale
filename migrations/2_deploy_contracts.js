var DSMath = artifacts.require("./DSMath.sol");
var CLNY = artifacts.require("./CLNY.sol");
var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");

module.exports = function(deployer) {
  deployer.deploy(DSMath);
  deployer.deploy(CLNY);
  deployer.deploy(ColonyTokenSale);
};
