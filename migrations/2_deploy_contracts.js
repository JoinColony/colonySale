var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
const Resolver = artifacts.require('./Resolver.sol');
const Token = artifacts.require('./Token.sol');

module.exports = function(deployer) {

  // Deploy token and router
  deployer.deploy(Resolver);
  deployer.deploy(Token);

  // Deploy main token sale
  deployer.deploy(ColonyTokenSale);
};
