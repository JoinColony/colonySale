/* globals artifacts */

const EtherRouter = artifacts.require('EtherRouter');
const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');

contract('Immutable Token', function (accounts) {
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
      console.log('Test EtherRouter at', etherRouter.address);
      return Token.at(etherRouter.address);
    })
    .then(function (instance) {
      token = instance;
      return;
    })
    .then(done)
    .catch(done);
  });

  //TODO: implement all ERC20 functions
  //function totalSupply() constant returns (uint);
  //function balanceOf(address who) constant returns (uint);
  //function allowance(address owner, address spender) constant returns (uint);
  //function transfer(address to, uint value) returns (bool ok);
  //function transferFrom(address from, address to, uint value) returns (bool ok);
  //function approve(address spender, uint value) returns (bool ok);
  describe('when working with ERC20 functions', function () {
    beforeEach('mint 1500000 tokens', (done) => {
      token.mint(1500000)
      .then(function(){done();})
      .catch(done);
    });

    it('should allow users to get total supply', function (done) {
      token.totalSupply.call()
      .then(function (total) {
        return assert.equal(1500000, total.toNumber());
      })
      .then(done)
      .catch(done);
    });
  });

  describe('when working with mint and burn functions', function () {
    it('should be able to mint new tokens', function (done) {
      token.mint(1500000)
      .then(function () {
        return token.totalSupply.call();
      })
      .then(function(totalSupply) {
        assert.equal(1500000, totalSupply.toNumber());
        return token.balanceOf.call(MAIN_ACCOUNT);
      })
      .then(function (balance) {
        assert.equal(1500000, balance.toNumber());
        token.mint(1);
      })
      .then(function () {
        return token.totalSupply.call();
      })
      .then(function(totalSupply) {
        assert.equal(1500001, totalSupply.toNumber());
        return token.balanceOf.call(MAIN_ACCOUNT);
      })
      .then(function (balance) {
        assert.equal(1500001, balance.toNumber());
      })
      .then(done);
    });
  });
});
