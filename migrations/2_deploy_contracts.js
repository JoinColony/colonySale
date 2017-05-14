var CLNY = artifacts.require("./CLNY.sol");
var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
const saleStartBlock = 4000000;

module.exports = function(deployer) {
  deployer.deploy(CLNY);
  deployer.link(CLNY, ColonyTokenSale);
  deployer.deploy(ColonyTokenSale, saleStartBlock);
};
