/* globals artifacts */

const MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

const EtherRouter = artifacts.require('EtherRouter');
const Resolver = artifacts.require('Resolver');
const Token = artifacts.require('Token');

contract('EtherRouter / Resolver', function (accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];

  let etherRouter;
  let resolver;
  let token;
  let tokenDeployed;
  let multisig;

  beforeEach(async function () {
    tokenDeployed = await Token.deployed();
    resolver = await Resolver.new(tokenDeployed.address);
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    // Need at least 2 confirmations for EtherRouter owner-required transactions
    multisig = await MultiSigWallet.new([ACCOUNT_TWO, ACCOUNT_THREE], 2);
    await etherRouter.changeOwner(multisig.address);
  });

  describe('EtherRouter', function () {
    it('should throw if non-owner tries to change the Resolver on EtherRouter', async function () {
      const tx = await etherRouter.setResolver('0xb3e2b6020926af4763d706b5657446b95795de57', { from: ACCOUNT_TWO, gas: 4700000 });
      assert.equal(tx.receipt.gasUsed, 4700000);
      const _resolver = await etherRouter.resolver.call();
      assert.equal(_resolver, resolver.address);
    });

    it('should throw if there have been insufficient number of confirmations to change the Resolver on EtherRouter', async function () {
      const txData = await etherRouter.contract.setResolver.getData('0xb3e2b6020926af4763d706b5657446b95795de57');
      const tx = await multisig.submitTransaction(etherRouter.address, 0, txData, { from: ACCOUNT_TWO });
      const transactionId = tx.logs[0].args['transactionId'];
      const isConfirmed = await multisig.isConfirmed.call(transactionId);
      assert.isFalse(isConfirmed);
      const _resolver = await etherRouter.resolver.call();
      assert.equal(_resolver, resolver.address);
    });

    it('should succeed if there have been sufficient number of confirmations to change the Resolver on EtherRouter', async function () {
      const txData = await etherRouter.contract.setResolver.getData('0xb3e2b6020926af4763d706b5657446b95795de57');
      const tx = await multisig.submitTransaction(etherRouter.address, 0, txData, { from: ACCOUNT_TWO });
      const transactionId = tx.logs[0].args['transactionId'];
      await multisig.confirmTransaction(transactionId, { from: ACCOUNT_THREE });
      const _resolver = await etherRouter.resolver.call();
      assert.equal(_resolver, '0xb3e2b6020926af4763d706b5657446b95795de57');
    });
  });

  describe('Resolver', function () {
    it('should throw if non-owner tries to change the Resolver on EtherRouter', async function () {
      const tx = await etherRouter.setResolver('0xb3e2b6020926af4763d706b5657446b95795de57', { from: ACCOUNT_TWO, gas: 4700000 });
      assert.equal(tx.receipt.gasUsed, 4700000);
      const _resolver = await etherRouter.resolver.call();
      assert.equal(_resolver, resolver.address);
    });

    it('should successfully lookup erc20 functions', async function () {
      // Check `totalSupply` function is registered successfully
      let response = await resolver.lookup.call('0x18160ddd');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 32);

      // Check `balanceOf` function is registered successfully
      response = await resolver.lookup.call('0x70a08231');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 32);

      // Check `allowance` function is registered successfully
      response = await resolver.lookup.call('0xdd62ed3e');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 32);

      // Check `transfer` function is registered successfully
      response = await resolver.lookup.call('0xa9059cbb');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 32);

      // Check `transferFrom` function is registered successfully
      response = await resolver.lookup.call('0x23b872dd');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 32);

      // Check `approve` function is registered successfully
      response = await resolver.lookup.call('0x095ea7b3');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 32);

      // Check `mint` function is registered successfully
      response = await resolver.lookup.call('0x69d3e20e');
      assert.equal(response[0], tokenDeployed.address);
      assert.equal(response[1], 0);
    });
  });
});
