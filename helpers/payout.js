
var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

module.exports = function(callback) {
  // ===============
  // NOTHING ABOVE HERE SHOULD NEED TO BE CHANGED
  // ===============

  const TOKEN_SALE_ADDRESS = process.env.TOKEN_SALE_ADDRESS || "ADD_ADDRESS_HERE";
  const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || "ADD_ADDRESS_HERE"
  let MULTISIG_SIGNEE = process.env.MULTISIG_SIGNEE || "ADD_ADDRESS_HERE"

  const FROM_BLOCK = 0; //Set to block sale started. Or a few before, just to be safe?!
  const TO_BLOCK = "latest"; //Set to block sale finished. Or a few after, just to be safe!?

  // ===============
  // NOTHING BELOW HERE SHOULD NEED TO BE CHANGED
  // ===============


  let colonyMultisig = MultiSigWallet.at(MULTISIG_ADDRESS);
  var cs = ColonyTokenSale.at(TOKEN_SALE_ADDRESS)

  cs.Purchase({}, {fromBlock: FROM_BLOCK, toBlock: TO_BLOCK}).get(async (err, res) => {
    if (err){
      console.log('Error: ', err);
      return callback(err);
    }
    // Otherwise, no error
    let payoutsThisRun = {};

    // See who we've already paid out, either from a pending transaction or a completed
    // transaction

    let transactionCount = await colonyMultisig.transactionCount.call();
    transactionCount = transactionCount.toNumber();

    for (idx = 0; idx < transactionCount; idx++){
      let tx = await colonyMultisig.transactions.call(idx);
      const payoutAddress = '0x' + tx[2].substr(34);
      if (
        tx[0]===TOKEN_SALE_ADDRESS &&
        tx[2].substr(0,10)==="0xcc967ba1"
      ){
        payoutsThisRun[payoutAddress] = true;
        console.log("Looks like ", payoutAddress, " has already got a completed or pending transaction; will not create another");
      }
    }

    //Now iterate over our events

    for (var idx = 0; idx < res.length; idx++){
      let purchase = res[idx];
      //Get address of buyer
      let buyerAddress = purchase.args.buyer;
      //Have we already paid them out?
      let amount = await cs.userBuys.call(buyerAddress);
      if (!amount.equals(0)  && !payoutsThisRun[buyerAddress]){
          //Then we haven't paid them out in the past
          payoutsThisRun[buyerAddress]=true;
          let txData = await cs.contract.claimPurchase.getData(buyerAddress);
          console.log('Creating transaction to pay out tokens to ', buyerAddress);
          await colonyMultisig.submitTransaction(cs.address, 0, txData, { from: MULTISIG_SIGNEE, gasPrice: 4e9 });
          console.log('Transaction created to pay out tokens to', buyerAddress);
      }
    }
  callback()
  })
}
