/* globals artifacts */

const EtherRouter = artifacts.require('EtherRouter');
const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');
const UpdatedResolver = artifacts.require('UpdatedResolver');

contract('Resolver contract upgrade', function (accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];

  let resolver;
  let etherRouter;
  let token;
  let updatedResolver;

  beforeEach(async function () {
    etherRouter = await EtherRouter.deployed();
    token = await Token.at(etherRouter.address);
    const tokenDeployed = Token.deployed();
    updatedResolver = await UpdatedResolver.new(tokenDeployed.address);
    await etherRouter.setResolver(updatedResolver.address);
  });

  describe('when upgrading Resolver contract', function () {
    it('should be able to lookup new function on Resolver', async function () {
      const y = await updatedResolver.isUpdated.call();
      assert.isTrue(y);
    });
  });
});
