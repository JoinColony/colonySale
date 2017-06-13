/* globals artifacts */

const EtherRouter = artifacts.require('EtherRouter');
const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');

contract('CLNY Token', function (accounts) {
  const MAIN_ACCOUNT = accounts[0];
  const OTHER_ACCOUNT = accounts[1];
  // this value must be high enough to certify that the failure was not due to the amount of gas but due to a exception being thrown
  const GAS_TO_SPEND = 4700000;

  let resolver;
  let etherRouter;
  let token;

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
      return;
    })
    .then(done)
    .catch(done);
  });

  describe('when working with ERC20 functions', function () {
    beforeEach('mint 1500000 tokens', async() => {
      await token.mint(1500000);
    });

    it('should be able to get total supply', async function () {
      var total = await token.totalSupply.call();
      assert.equal(1500000, total.toNumber());
    });

    it('should be able to get token balance', async function () {
      var balance = await token.balanceOf.call(MAIN_ACCOUNT);
      assert.equal(1500000, balance.toNumber());
    });

    it('should be able to get allowance for address', async function () {
      await token.approve(OTHER_ACCOUNT, 200000);
      var allowance = await token.allowance.call(MAIN_ACCOUNT, OTHER_ACCOUNT);
      assert.equal(200000, allowance.toNumber());
    });

    it('should be able to transfer tokens from own address', async function () {
      const success = await token.transfer.call(OTHER_ACCOUNT, 300000);
      assert.equal(true, success);

      var tx = await token.transfer(OTHER_ACCOUNT, 300000);
      assert.equal(tx.logs[0].event, 'Transfer');
      const balanceAccount1 = await token.balanceOf.call(MAIN_ACCOUNT);
      assert.equal(1200000, balanceAccount1.toNumber());
      const balanceAccount2 = await token.balanceOf.call(OTHER_ACCOUNT);
      assert.equal(300000, balanceAccount2.toNumber());
    });

    it('should be able to transfer pre-approved tokens from address different than own', async function () {
      await token.approve(OTHER_ACCOUNT, 300000);
      const success = await token.transferFrom.call(MAIN_ACCOUNT, OTHER_ACCOUNT, 300000, { from: OTHER_ACCOUNT });
      assert.equal(true, success);

      var tx = await token.transferFrom(MAIN_ACCOUNT, OTHER_ACCOUNT, 300000, { from: OTHER_ACCOUNT });
      assert.equal(tx.logs[0].event, 'Transfer');
      const balanceAccount1 = await token.balanceOf.call(MAIN_ACCOUNT);
      assert.equal(1200000, balanceAccount1.toNumber());
      const balanceAccount2 = await token.balanceOf.call(OTHER_ACCOUNT);
      assert.equal(300000, balanceAccount2.toNumber());
      var allowance = await token.allowance.call(MAIN_ACCOUNT, OTHER_ACCOUNT);
      assert.equal(0, allowance.toNumber());
    });

    it('should be able to approve token transfer for other accounts', async function () {
      const success = await token.approve.call(OTHER_ACCOUNT, 200000);
      assert.equal(true, success);

      const tx = await token.approve(OTHER_ACCOUNT, 200000);
      assert.equal(tx.logs[0].event, 'Approval');

      var allowance = await token.allowance.call(MAIN_ACCOUNT, OTHER_ACCOUNT);
      assert.equal(200000, allowance.toNumber());
    });
  });

  describe('when working with additional functions', function () {
    it('should be able to mint new tokens', async function () {
      await token.mint(1500000);
      var totalSupply = await token.totalSupply.call();
      assert.equal(1500000, totalSupply.toNumber());

      var balance = await token.balanceOf.call(MAIN_ACCOUNT);
      assert.equal(1500000, balance.toNumber());

      // Mint some more tokens
      await token.mint(1);
      totalSupply = await token.totalSupply.call();
      assert.equal(1500001, totalSupply.toNumber());

      balance = await token.balanceOf.call(MAIN_ACCOUNT);
      assert.equal(1500001, balance.toNumber());
    });
  });
});
