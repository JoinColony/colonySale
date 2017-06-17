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
      return UpdatedToken.new();
    })
    .then(function (instance) {
      updatedToken = UpdatedToken.at(instance.address);
      return updatedToken.isUpdated.call();
    })
    .then(function (isUpdated) {
      assert.equal(isUpdated, true);
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
    beforeEach('setup the Token contract with some data', async() => {
      await token.mint(100);
      await token.transfer(ACCOUNT_TWO, 20);
      await token.transfer(ACCOUNT_THREE, 30);
      await token.approve(ACCOUNT_TWO, 15, { from: COINBASE_ACCOUNT });
      await token.approve(ACCOUNT_THREE, 5, { from: COINBASE_ACCOUNT });
      await token.approve(ACCOUNT_THREE, 10, { from: ACCOUNT_TWO });
    });

    it('should return correct total supply of tokens', async function () {
      const total = await token.totalSupply.call();
      assert.equal(100, total.toNumber());
      const updatedTokenTotal = await updatedToken.totalSupply.call();
      assert.equal(100, updatedTokenTotal.toNumber());
    });

    it('should return correct token balances', async function () {
      const totalAccount1 = await updatedToken.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(50, totalAccount1.toNumber());
      const totalAccount2 = await updatedToken.balanceOf.call(ACCOUNT_TWO);
      assert.equal(20, totalAccount2.toNumber());
      const totalAccount3 = await updatedToken.balanceOf.call(ACCOUNT_THREE);
      assert.equal(30, totalAccount3.toNumber());
    });

    it('should return correct token allowances', async function () {
      const allowance1 = await updatedToken.allowance.call(COINBASE_ACCOUNT, ACCOUNT_TWO);
      assert.equal(15, allowance1.toNumber());
      const allowance2 = await updatedToken.allowance.call(COINBASE_ACCOUNT, ACCOUNT_THREE);
      assert.equal(5, allowance2.toNumber());
      const allowance3 = await updatedToken.allowance.call(ACCOUNT_TWO, ACCOUNT_THREE);
      assert.equal(10, allowance3.toNumber());
    });
  });
});
