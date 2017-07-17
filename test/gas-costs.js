var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var Token = artifacts.require("./Token.sol");
var Resolver = artifacts.require("./Resolver.sol");
var EtherRouter = artifacts.require('./EtherRouter.sol');
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

import testHelper from '../helpers/test-helper';

contract('ColonyTokenSale', function(accounts) {
  const COINBASE_ACCOUNT = accounts[0];
  const ACCOUNT_TWO = accounts[1];
  const ACCOUNT_THREE = accounts[2];
  const FOUNDATION = '0x4e7DBb49018489a27088FE304b18849b02F708F6';

  // Initialised at the start of test in `before` call
  let ownable;
  let tokenDeployed;
  let resolver;

  // Set via createColonyTokenSale function
  let etherRouter;
  let token;
  let colonyMultisig;
  let colonySale;

  // Sale properties
  let softCapInWei;
  let minAmountToRaise;

  before(async function () {
    tokenDeployed = await Token.deployed();
    resolver = await Resolver.new(tokenDeployed.address);
  });

  // Setup blank token and token sale with given parameters
  const createColonyTokenSale = async function (startBlock, minToRaise, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration) {
    etherRouter = await EtherRouter.new();
    await etherRouter.setResolver(resolver.address);
    token = await Token.at(etherRouter.address);
    colonyMultisig = await MultiSigWallet.new([COINBASE_ACCOUNT], 1);
    colonySale = await ColonyTokenSale.new(startBlock, minToRaise, softCap, postSoftCapMinBlocks, postSoftCapMaxBlocks, maxSaleDuration, etherRouter.address, colonyMultisig.address);
  };

  describe('gas costs', async () => {
    const minToRaise = web3.toWei(2, 'ether');
    const softCap = web3.toWei(10, 'ether');
    const value = web3.toWei(1, 'finney');

    beforeEach('setup sale at startBlock', async () => {
      const currentBlock = await web3.eth.blockNumber;
      await createColonyTokenSale(currentBlock, minToRaise, softCap, 5, 7, 18);
    });

    it("functions", async function () {
      const txBuy = await colonySale.send(value, { FROM: ACCOUNT_TWO });
      console.error('buy() cost', txBuy.receipt.gasUsed);

      // Reach the soft cap
      const txBuySoftCapSet = await colonySale.send(softCap, { from: ACCOUNT_THREE });
      console.error('buy() cost when endBlock updated', txBuySoftCapSet.receipt.gasUsed);

      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());

      const txFinalize = await colonySale.finalize();
      console.log('finalize() cost', txFinalize.receipt.gasUsed);

      const txData = await colonySale.contract.claimPurchase.getData(ACCOUNT_TWO);
      const txClaimPurchase = await colonyMultisig.submitTransaction(etherRouter.address, 0, txData, { from: COINBASE_ACCOUNT });
      console.log('claimPurchase() cost', txClaimPurchase.receipt.gasUsed);

      testHelper.forwardTime(15552000);
      const txClaimVestedTokens = await colonySale.claimVestedTokens({ from: FOUNDATION });
      console.log('claimVestedTokens() cost', txClaimVestedTokens.receipt.gasUsed);
    });
  });
});
