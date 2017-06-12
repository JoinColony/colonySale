var DSMath = artifacts.require("./math.sol");
var ERC20 = artifacts.require("./erc20.sol");
var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
const Token = artifacts.require('./Token.sol');
const Resolver = artifacts.require('./Resolver.sol');
const EtherRouter = artifacts.require('./EtherRouter.sol');

module.exports = function(deployer) {
  // Deploy external imports
  deployer.deploy(DSMath);
  deployer.deploy(ERC20);

  // Deploy token and router
  deployer.deploy(Resolver);
  deployer.deploy(Token);

  // Deploy main token sale
  deployer.deploy(ColonyTokenSale);
};
