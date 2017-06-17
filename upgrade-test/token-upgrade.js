/* globals artifacts */

const EtherRouter = artifacts.require('EtherRouter');
const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');
const UpdatedToken = artifacts.require('UpdatedToken');

contract('CLNY Token', function (accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];
  // this value must be high enough to certify that the failure was not due to the amount of gas but due to a exception being thrown
  const GAS_TO_SPEND = 4700000;

  let resolver;
  let etherRouter;
  let token;
  let updatedToken;

  beforeEach(function (done) {
    Resolver.deployed()
    .then(function (_resolver) {
      resolver = _resolver;
      return EtherRouter.new(resolver.address);
    })
    .then(function(instance) {
      etherRouter = instance;
      return Token.at(etherRouter.address);
    })
    .then(function (instance) {
      token = instance;
      return UpdatedToken.at(etherRouter.address);
    })
    .then(function (instance) {
      updatedToken = instance;
      return;
    })
    .then(done)
    .catch(done);
  });

  describe('when upgrading Token contract', function () {
    beforeEach('mint 100 tokens', async() => {
      await token.mint(100);
      await token.transfer(ACCOUNT_TWO, 20);
      await token.transfer(ACCOUNT_THREE, 30);
      await token.approve(ACCOUNT_THREE, 10, { from: ACCOUNT_TWO });
      await token.approve(ACCOUNT_THREE, 5, { from: COINBASE_ACCOUNT });
      await token.approve(ACCOUNT_TWO, 15, { from: COINBASE_ACCOUNT });
    });

    it('should return correct total supply of tokens', async function () {
      const total = await token.totalSupply.call();
      assert.equal(100, total.toNumber());
      const updatedTokenTotal = await updatedToken.totalSupply.call();
      assert.equal(100, updatedTokenTotal.toNumber());
    });

    it.skip('should return correct token balances', async function () {
      var total = await token.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(1500000, total.toNumber());
    });

    it.skip('should return correct token allowances', async function () {
      var total = await token.totalSupply.call();
      assert.equal(1500000, total.toNumber());
    });
  });
});
