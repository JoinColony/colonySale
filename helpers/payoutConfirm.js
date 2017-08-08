
var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

module.exports = function(callback) {

  // ===============
  // NOTHING ABOVE HERE SHOULD NEED TO BE CHANGED
  // ===============

  const TOKEN_SALE_ADDRESS = process.env.TOKEN_SALE_ADDRESS || "ADD_ADDRESS_HERE";
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || "ADD_ADDRESS_HERE"
  let MULTISIG_SIGNEE = process.env.MULTISIG_SIGNEE || "ADD_ADDRESS_HERE"
  let DRY_RUN = false;

  const FROM_BLOCK = 0; //Set to block sale started. Or a few before, just to be safe?!
  const TO_BLOCK = "latest"; //Set to block sale finished. Or a few after, just to be safe!?

  // ===============
  // NOTHING BELOW HERE SHOULD NEED TO BE CHANGED
  // ================

  let colonyMultisig = MultiSigWallet.at(MULTISIG_ADDRESS);
  var cs = ColonyTokenSale.at(TOKEN_SALE_ADDRESS)
  let confirmedPayoutAddresses = {}

  cs.Purchase({}, {fromBlock: 0, toBlock: "latest"}).get(async (err, res) => {
    if (err){
      console.log('Error: ', exit);
      return process.exit()
    }


    //First, check we ran a successful sale.
    let saleEndBlock = await cs.endBlock();
    let currentBlock = await web3.eth.blockNumber;
    let minToRaise = await cs.minToRaise();
    let totalRaised = await cs.totalRaised();
    if (totalRaised.lessThan(minToRaise) || saleEndBlock.greaterThan(currentBlock)){
      console.log("Either less than minimum raised or sale not yet finished.")
      console.log("Minimum raise: " + minToRaise.toString())
      console.log("Total raised: " + totalRaised.toString())
      console.log("Sale ends at block: " + saleEndBlock.toString())
      console.log("Current block: " + currentBlock.toString())
      console.log("Cowardly refusing to try and pay tokens to anyone.")
      return callback(new Error("Did not run a successful sale"))
    }

    //Iterate through pending transactions on the multisig
    let transactionCount = await colonyMultisig.transactionCount.call();
    transactionCount = transactionCount.toNumber();
    let txToConfirm = [];

    for (let idx = 0; idx < transactionCount; idx++){
      let tx = await colonyMultisig.transactions.call(idx);
      // If the transaction is confirmed, it's probably something else, so skip it
      if (tx[3] === true){
        continue;
      }
      // Check the tx goes to the token sale address
      if (tx[0] !== TOKEN_SALE_ADDRESS){
        console.log("Unexpected transaction to not token sale address")
        console.log("Transaction " + idx + " goes to address " + tx[0])
        console.log("Investigate before going any further");
        continue;
      }
      //Check tx is valueless
      if (!tx[1].equals(0)){
        console.log("Unexpected transfer of ether")
        console.log("Transaction " + idx + " wishes to move " + tx[1].toString() + " wei")
        console.log("Investigate before going any further");
        continue;
      }
      // Check the tx calls the right function i.e. bytes4(sha3(claimPurchase(address)))===0xcc967ba1
      if (tx[2].substr(0,10)!=="0xcc967ba1"){
        console.log("Unexpected function signature")
        console.log("Transaction " + idx + " wishes to call " + tx[2].substr(0,10))
        console.log("Investigate before going any further");
        continue;
      }
      //Check the tx is paying out an address we expect
      const payoutAddress = '0x' + tx[2].substr(34);
      let payoutAmount = await cs.userBuys.call(payoutAddress);
      if (payoutAmount.equals(0)){
        console.log("Zero payout")
        console.log("Transaction " + idx + " wishes to pay out " + payoutAddress)
        console.log("But they have no balance to be paid out")
        console.log("Investigate before going any further");
        continue;
      }
      // Check the tx isn't paying out an address we've already confirmed this run
      if (confirmedPayoutAddresses[payoutAddress]){
        console.log("Duplicate payout")
        console.log("Transaction " + idx + " wishes to pay out " + payoutAddress)
        console.log("But we have already paid them out (or are going to)")
        console.log("Investigate before going any further");
        continue;
      }
      //If we got this far, then we want to confirm that tx
      txToConfirm.push(idx);
      confirmedPayoutAddresses[payoutAddress] = true;
    }

    //Now confirm the txs we decided were acceptable
    for (let idx = 0; idx < txToConfirm.length; idx++){
      await colonyMultisig.confirmTransaction(txToConfirm[idx], {gasPrice: 4e9, from: MULTISIG_SIGNEE})
    }
    return callback()
  })
}
