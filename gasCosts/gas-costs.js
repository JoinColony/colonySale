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
  let tokenDeployed;
  let resolver;

  // Set via createColonyTokenSale function
  let etherRouter;
  let token;
  let colonyMultisig;
  let colonySale;

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
    await etherRouter.changeOwner(colonySale.address);
  };

  describe('gas costs', async () => {
    const minToRaise = web3.toWei(2, 'ether');
    const softCap = web3.toWei(10, 'ether');
    const oneEther = web3.toWei(1, 'ether');
    const tenFinney = web3.toWei(10, 'finney');

    beforeEach('setup sale at startBlock', async () => {
      const currentBlock = await web3.eth.blockNumber;
      await createColonyTokenSale(currentBlock + 10, minToRaise, softCap, 5, 7, 18);
      const startBlock = await colonySale.startBlock.call();
      testHelper.forwardToBlock(startBlock.toNumber());
    });

    it("functions", async function () {
      const txBuy1 = await colonySale.send(oneEther, { FROM: COINBASE_ACCOUNT });
      console.error('First buy() cost', txBuy1.receipt.gasUsed);

      const txBuy2 = await colonySale.send(tenFinney, { FROM: ACCOUNT_TWO });
      console.error('Second buy() cost', txBuy2.receipt.gasUsed);

      // Reach the soft cap
      const txBuySoftCapSet = await colonySale.send(softCap, { from: ACCOUNT_THREE });
      // Check it's the right transaction we're measuring
      assert.equal(txBuySoftCapSet.logs[0].event, 'UpdatedSaleEndBlock');
      console.error('buy() cost when endBlock updated', txBuySoftCapSet.receipt.gasUsed);

      const txBuy3 = await colonySale.send(tenFinney, { FROM: ACCOUNT_TWO });
      console.error('Third buy() cost', txBuy2.receipt.gasUsed);

      // Get the endBlock and fast forward to it
      const endBlock = await colonySale.endBlock.call();
      testHelper.forwardToBlock(endBlock.toNumber());

      const txFinalize = await colonySale.finalize();
      console.log('finalize() cost', txFinalize.receipt.gasUsed);

      const txData = await colonySale.contract.claimPurchase.getData(ACCOUNT_TWO);
      const txClaimPurchase = await colonyMultisig.submitTransaction(etherRouter.address, 0, txData, { from: COINBASE_ACCOUNT });
      console.log('claimPurchase() cost', txClaimPurchase.receipt.gasUsed);

      testHelper.forwardTime(2628000 * 6);
      const txClaimVestedTokens1 = await colonySale.claimVestedTokens({ from: FOUNDATION });
      console.log('First claimVestedTokens() cost', txClaimVestedTokens1.receipt.gasUsed);

      testHelper.forwardTime(2628000 * 6);
      const txClaimVestedTokens2 = await colonySale.claimVestedTokens({ from: FOUNDATION });
      console.log('Second claimVestedTokens() cost', txClaimVestedTokens2.receipt.gasUsed);
    });
  });
});
