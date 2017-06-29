// These globals represent contracts and are added by Truffle:
/* globals FakeNewRootColony, RootColony, Colony, RootColonyResolver, ColonyFactory, EternalStorage*/

import Promise from 'bluebird';
import _ from 'lodash';
import shortid from 'shortid';

module.exports = {
  checkAllGasSpent(gasAmount, txid) {
    const receipt = web3.eth.getTransactionReceipt(txid);
    // When a transaction throws, all the gas sent is spent. So let's check that
    // we spent all the gas that we sent.
    assert.equal(gasAmount, receipt.gasUsed, 'didnt fail - didn\'t throw and use all gas');
  },
  forwardTime(seconds) {
    console.log('Forwarding time with ' + seconds + 's ...');
    return web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: new Date().getTime() });
  },
  mineTransaction() {
    return web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine' });
  },
  startMining() {
    return web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'miner_start',
      params: [1],
      id: new Date().getTime() });
  },
  stopMining() {
    return web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'miner_stop',
      id: new Date().getTime() });
  },
  async waitForTxToBeMined(txid) {
    let receipt = null;
    while (receipt === null) {
      const response = await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txid],
        id: new Date().getTime() });
      receipt = response.result;
      console.log('got receipt', receipt);
    }
    return receipt;
  } };
