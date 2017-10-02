/* eslint-disable no-undef, no-unused-vars-rest/no-unused-vars, no-var */
const assert = require('assert');

const EtherRouter = artifacts.require('./EtherRouter.sol');
const Token = artifacts.require('./Token.sol');
const Resolver = artifacts.require('./Resolver.sol');
const MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

module.exports = function (deployer, network, accounts) {
  var resolverDeployed;
  var tokenDeployed;
  var etherRouterDeployed;
  var routerOwnerMultiSig;
  var COINBASE_ACCOUNT = accounts[0];

  deployer.then(function () {
    return Token.deployed();
  })
  .then(function (instance) {
    tokenDeployed = instance;
    return Resolver.new(tokenDeployed.address);
  })
  .then(function (instance) {
    resolverDeployed = instance;
    console.log('Resolver', resolverDeployed.address);
    return EtherRouter.deployed();
  })
  .then(function (instance) {
    etherRouterDeployed = instance;
    return etherRouterDeployed.setResolver(resolverDeployed.address);
  })
  .then(function () {
    return etherRouterDeployed.resolver.call();
  })
  .then(function(_registeredResolver) {
    assert.equal(_registeredResolver, resolverDeployed.address);
    return resolverDeployed.lookup.call('0x18160ddd');
  })
  .then(function(response) {
    // Check `totalSupply` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.lookup.call('0x70a08231');
  })
  .then(function(response) {
    // Check `balanceOf` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.lookup.call('0xdd62ed3e');
  })
  .then(function(response) {
    // Check `allowance` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.lookup.call('0xa9059cbb');
  })
  .then(function(response) {
    // Check `transfer` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.lookup.call('0x23b872dd');
  })
  .then(function(response) {
    // Check `transferFrom` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.lookup.call('0x095ea7b3');
  })
  .then(function(response) {
    // Check `approve` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 32);
    return resolverDeployed.lookup.call('0xa0712d68');
  })
  .then(function(response) {
    // Check `mint` function is registered successfully
    assert.equal(response[0], tokenDeployed.address);
    assert.equal(response[1], 0);
    console.log('### Contracts registered successfully ###');
    return MultiSigWallet.new([COINBASE_ACCOUNT], 1);
  })
  .then(function(instance) {
    routerOwnerMultiSig = instance;
    return etherRouterDeployed.setOwner(instance.address);
  })
  .then(function () {
    return etherRouterDeployed.owner.call();
  })
  .then(function(routerOwner) {
    assert.equal(routerOwner, routerOwnerMultiSig.address);
    console.log('### EtherRouter owner set to MultiSig', routerOwnerMultiSig.address);
  });
};
