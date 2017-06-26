var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
const Ownable = artifacts.require('./Ownable.sol');
const EtherRouter = artifacts.require('./EtherRouter.sol');
const Token = artifacts.require('./Token.sol');

module.exports = function(deployer, network) {

  // Deploy token and router
  deployer.deploy(Ownable);
  deployer.deploy(EtherRouter);
  deployer.deploy(Token);

  // Deploy main token sale
  deployer.deploy(ColonyTokenSale);

  // Add demo data if we're not deploying to the live network.
  if (network === 'integration') {
    const UpdatedToken = artifacts.require('./UpdatedToken.sol');
    deployer.deploy(UpdatedToken);
  }
};
