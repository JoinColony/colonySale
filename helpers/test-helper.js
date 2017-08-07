var _sendWei = function(source, dest, amountInWei) {
  const amountInHex = web3.toHex(amountInWei);
  const transactionObject = {
    from: source,
    to: dest,
    gas: '0x30D40', // Buy tx costs ~72,000 gas but solidity-coverage needs more than that, send 200,000
    value: amountInHex
  };

  return web3.eth.sendTransaction(transactionObject);
}

module.exports = {
  ifUsingTestRPC(err) {
    // Make sure this is a throw we expect.
    if (err.message.indexOf('VM Exception while processing transaction: out of gas') == 0
  && err.message.indexOf('VM Exception while processing transaction: invalid JUMP') == 0
  && err.message.indexOf('VM Exception while processing transaction: invalid opcode') == 0) {
    throw err;
  }
    // Okay, so, there is a discrepancy between how testrpc handles
    // OOG errors (throwing an exception all the way up to these tests) and
    // how geth handles them (still making a valid transaction and returning
    // a txid). For the explanation of why, see
    //
    // See https://github.com/ethereumjs/testrpc/issues/39
    //
    // Obviously, we want our tests to pass on both, so this is a
    // bit of a problem. We have to have this special function that we use to catch
    // the error. I've named it so that it reads well in the tests below - i.e.
    // .catch(ifUsingTestRPC)
    // Note that it just swallows the error - open to debate on whether this is
    // the best thing to do, or it should log it even though it's expected, in
    // case we get an error that is unexpected...
    // console.log('Error:',err)

    // Note also the solc updates to error handling
    // https://github.com/ethereum/solidity/blob/develop/docs/control-structures.rst#error-handling-assert-require-revert-and-exceptions
    const block = web3.eth.getBlock('latest', true);
    return block.transactions[0].hash;
  },
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
  forwardToBlock(blockNumber) {
    // Check we are behind the given blockNumber
    let currentBlock = web3.eth.blockNumber;
    assert.isBelow(currentBlock, blockNumber);

    console.log('Forwarding chain to block ' + blockNumber + ' ...');
    while (currentBlock<blockNumber) {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine' });
      currentBlock = web3.eth.blockNumber;
    }
    return;
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
  },
  sendEther(source, dest, amount, denomination) {
    const amountInWei = web3.toWei(amount, denomination);
    return _sendWei(source, dest, amountInWei);
  },
  sendWei(source, dest, amountInWei) {
    return _sendWei(source, dest, amountInWei);
  }
 };
