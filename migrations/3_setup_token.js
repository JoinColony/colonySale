/* eslint-disable no-undef, no-unused-vars-rest/no-unused-vars, no-var */
const assert = require('assert');

const EtherRouter = artifacts.require('./EtherRouter.sol');
const Token = artifacts.require('./Token.sol');
const Resolver = artifacts.require('./Resolver.sol');
const COMMON_COLONY_CHECKSUM = '0xfa943E269FF39576C495d93892A0205b25431404';
const COMMON_COLONY = "0xfa943e269ff39576c495d93892a0205b25431404";

module.exports = function (deployer) {
  var resolverDeployed;
  var tokenDeployed;
  var etherRouterDeployed;

  deployer.then(function () {
    return Resolver.deployed();
  })
  .then(function (instance) {
    resolverDeployed = instance;
    return Token.deployed();
  })
  .then(function (instance) {
    tokenDeployed = instance;
    return EtherRouter.new(resolverDeployed.address);
  })
  .then(function (instance) {
    etherRouterDeployed = instance;
    console.log('EtherRouter deployed at', etherRouterDeployed.address);
    return etherRouterDeployed.resolver.call();
  })
  .then(function(_registeredResolver) {
    assert.equal(_registeredResolver, resolverDeployed.address);
    return resolverDeployed.register('totalSupply()', tokenDeployed.address, 32);
  })
  .then(function() {
    return resolverDeployed.lookup.call(0x18160ddd);
  })
  .then(function(response) {
    // Check `totalSupply` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.register('balanceOf(address)', tokenDeployed.address, 32);
  })
  .then(function() {
    return resolverDeployed.lookup.call(0x70a08231);
  })
  .then(function(response) {
    // Check `balanceOf` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.register('generateTokens(uint256)', tokenDeployed.address, 0);
  })
  .then(function (){
    console.log('### Token and Resolver contracts registered successfully ###');
  });
};
