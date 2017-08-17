var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
const EtherRouter = artifacts.require('./EtherRouter.sol');
const Token = artifacts.require('./Token.sol');

module.exports = function(deployer, network) {

  // Deploy token and router
  deployer.deploy(EtherRouter);
  deployer.deploy(Token);

  // Add demo data if we're not deploying to the live network.
  if (network === 'integration') {
    const UpdatedToken = artifacts.require('./UpdatedToken.sol');
    deployer.deploy(UpdatedToken);
  }
};
