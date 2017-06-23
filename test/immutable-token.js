/* globals artifacts */

const Ownable = artifacts.require('Ownable');
const EtherRouter = artifacts.require('EtherRouter');
const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');

contract('CLNY Token', function (accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];

  let etherRouter;
  let resolver;
  let token;

  beforeEach(async function () {
    resolver = await Resolver.deployed();
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
  });

  describe('when initialising the token', function () {
    it('should throw if non-owner tries to change the Resolver on EtherRouter', async function () {
      const tx = await etherRouter.setResolver('0xb3e2b6020926af4763d706b5657446b95795de57', { from: ACCOUNT_TWO, gas: 4700000 });
      assert.equal(tx.receipt.gasUsed, 4700000);
      const _resolver = await etherRouter.resolver.call();
      assert.equal(_resolver, resolver.address);
    });
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
      var balance = await token.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(1500000, balance.toNumber());
    });

    it('should be able to get allowance for address', async function () {
      await token.approve(ACCOUNT_TWO, 200000);
      var allowance = await token.allowance.call(COINBASE_ACCOUNT, ACCOUNT_TWO);
      assert.equal(200000, allowance.toNumber());
    });

    it('should be able to transfer tokens from own address', async function () {
      const success = await token.transfer.call(ACCOUNT_TWO, 300000);
      assert.equal(true, success);

      var tx = await token.transfer(ACCOUNT_TWO, 300000);
      assert.equal(tx.logs[0].event, 'Transfer');
      const balanceAccount1 = await token.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(1200000, balanceAccount1.toNumber());
      const balanceAccount2 = await token.balanceOf.call(ACCOUNT_TWO);
      assert.equal(300000, balanceAccount2.toNumber());
    });

    it('should be able to transfer pre-approved tokens from address different than own', async function () {
      await token.approve(ACCOUNT_TWO, 300000);
      const success = await token.transferFrom.call(COINBASE_ACCOUNT, ACCOUNT_TWO, 300000, { from: ACCOUNT_TWO });
      assert.equal(true, success);

      var tx = await token.transferFrom(COINBASE_ACCOUNT, ACCOUNT_TWO, 300000, { from: ACCOUNT_TWO });
      assert.equal(tx.logs[0].event, 'Transfer');
      const balanceAccount1 = await token.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(1200000, balanceAccount1.toNumber());
      const balanceAccount2 = await token.balanceOf.call(ACCOUNT_TWO);
      assert.equal(300000, balanceAccount2.toNumber());
      var allowance = await token.allowance.call(COINBASE_ACCOUNT, ACCOUNT_TWO);
      assert.equal(0, allowance.toNumber());
    });

    it('should be able to approve token transfer for other accounts', async function () {
      const success = await token.approve.call(ACCOUNT_TWO, 200000);
      assert.equal(true, success);

      const tx = await token.approve(ACCOUNT_TWO, 200000);
      assert.equal(tx.logs[0].event, 'Approval');

      var allowance = await token.allowance.call(COINBASE_ACCOUNT, ACCOUNT_TWO);
      assert.equal(200000, allowance.toNumber());
    });
  });

  describe('when working with additional functions', function () {
    it('should be able to mint new tokens', async function () {
      await token.mint(1500000);
      var totalSupply = await token.totalSupply.call();
      assert.equal(1500000, totalSupply.toNumber());

      var balance = await token.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(1500000, balance.toNumber());

      // Mint some more tokens
      await token.mint(1);
      totalSupply = await token.totalSupply.call();
      assert.equal(1500001, totalSupply.toNumber());

      balance = await token.balanceOf.call(COINBASE_ACCOUNT);
      assert.equal(1500001, balance.toNumber());
    });
  });
});
