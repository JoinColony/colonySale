/* globals artifacts */

const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');

contract('Immutable Token', function (accounts) {
  const MAIN_ACCOUNT = accounts[0];
  const OTHER_ACCOUNT = accounts[1];
  // this value must be high enough to certify that the failure was not due to the amount of gas but due to a exception being thrown
  const GAS_TO_SPEND = 4700000;

  let resolver;
  let token;

  before(function (done) {
    Resolver.deployed()
    .then(function (_resolver) {
      resolver = _resolver;
      return Token.deployed();
    })
    .then(function (_token) {
      token = _token;
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
    it('should allow users to get total supply', function (done) {

      token.totalSupply.call()
      .then(function (total) {
        console.log(total);
        //TODO: You gotta have a colony with 3e18 tokens
        return assert.equal(3e18, total);
      })
      .then(done)
      .catch(done);
    });
  });
});
