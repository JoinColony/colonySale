var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');


module.exports = function(callback) {
  try {
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

    let colonyMultisig = MultiSigWallet.at(MULTISIG_ADDRESS)
    var cs = ColonyTokenSale.at(TOKEN_SALE_ADDRESS)
    let confirmedPayoutAddresses = {}

    cs.Purchase({}, {fromBlock: FROM_BLOCK, toBlock: TO_BLOCK}).get(async (err, res) => {
      if (err){
        console.log('Error: ', exit);
        return process.exit()
      }

      //First, check we ran an unsuccessful sale.
      let saleEndBlock = await cs.endBlock();
      let currentBlock = await web3.eth.blockNumber;
      let minToRaise = await cs.minToRaise();
      let totalRaised = await cs.totalRaised();
      if (totalRaised.greaterThan(minToRaise) || saleEndBlock.greaterThan(currentBlock)){
        console.log("Either more than minimum raised or sale not yet finished.")
        console.log("Minimum raise: " + minToRaise.toString())
        console.log("Total raised: " + totalRaised.toString())
        console.log("Sale ends at block: " + saleEndBlock.toString())
        console.log("Current block: " + currentBlock.toString())
        console.log("Cowardly refusing to refund anyone.")
        return callback(1)
      }

      const payoutsThisRun = {};

      //Now iterate over our events to find everyone we're expecting to refund.
      //NB same address might appear in multiple events, but the userBuys mapping
      //contains the total they paid
      for (var idx = 0; idx < res.length; idx++){
        let purchase = res[idx]
        //Get address of buyer
        let buyerAddress = purchase.args.buyer;
        payoutsThisRun[buyerAddress] = {};
        payoutsThisRun[buyerAddress].paidOut = false;
        let amount = await cs.userBuys.call(buyerAddress);
        payoutsThisRun[buyerAddress].expectedAmount = amount;
      }

      //Iterate through pending transactions on the multisig, marking off anyone
      //that has already had their payout, and checking everything is as expected.

      let transactionCount = await colonyMultisig.transactionCount.call();
      transactionCount = transactionCount.toNumber();

      for (idx = 0; idx < transactionCount; idx++){
        let tx = await colonyMultisig.transactions.call(idx);
        //Is it a payout to an expected address?
        if (!payoutsThisRun[tx[0]]){
          //If not, ignore it.
          continue;
        }
        // Is it the amount we expect?
        if (!tx[1].equals(payoutsThisRun[tx[0]].expectedAmount)){
          console.log("There is a payment to address ", tx[1], " already at txid ", idx)
          console.log("But for an unexpected amount")
          console.log("Investigate before continuing")
          return callback(1);
        }
        //If it's already confirmed, don't try again.
        if (tx[3]===true){
          payoutsThisRun[tx[0]].paidOut = true;
        }

        if (!payoutsThisRun[tx[0]].paidOut){
          console.log('Approving transaction to refund ether to ', tx[0]);
          payoutsThisRun[tx[0]].paidOut = true;
          await colonyMultisig.confirmTransaction(idx, {gasPrice: 4e9, from: MULTISIG_SIGNEE})
          console.log('Transaction approved to refund ether to', tx[0]);
        }
      }
      callback();
    })
  } catch (err){
    return callback(err);
  }
}
