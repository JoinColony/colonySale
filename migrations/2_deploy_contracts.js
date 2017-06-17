var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
const Ownable = artifacts.require('./Ownable.sol');
const EtherRouter = artifacts.require('./EtherRouter.sol');
const Resolver = artifacts.require('./Resolver.sol');
const Token = artifacts.require('./Token.sol');

module.exports = function(deployer) {

  // Deploy token and router
  deployer.deploy(Ownable);
  deployer.deploy(EtherRouter);
  deployer.deploy(Resolver);
  deployer.deploy(Token);

  // Deploy main token sale
  deployer.deploy(ColonyTokenSale);
};
