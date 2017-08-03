
const TOKEN_SALE_ADDRESS = "";
const MULTISIG_ADDRESS = ''
let MULTISIG_SIGNEE = '';

const FROM_BLOCK = 0; //Set to block sale started. Or a few before, just to be safe?!
const TO_BLOCK = "latest"; //Set to block sale finished. Or a few after, just to be safe!?

// ===============
// NOTHING BELOW HERE SHOULD NEED TO BE CHANGED
// ===============

var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

// This futzing is required so that the 
let colonyMultisig = MULTISIG_ADDRESS ? MultiSigWallet.at(MULTISIG_ADDRESS) : MultiSigWallet.deployed();
var cs = TOKEN_SALE_ADDRESS ? ColonyTokenSale.at(TOKEN_SALE_ADDRESS) : ColonyTokenSale.deployed();
MULTISIG_SIGNEE = MULTISIG_SIGNEE | "0xb77D57F4959eAfA0339424b83FcFaf9c15407461"

module.exports = function(callback) {
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
      callback(1)
    }

    const payoutsThisRun = {};

    //Now iterate over our events to find everyone we're expecting to refund.
    //NB same address might appear in multiple events, but the userBuys mapping
    //contains the total they paid
    for (var idx = 0; idx < res.length; idx++){
      purchase = res[idx]
      //Get address of buyer
      let buyerAddress = purchase.args.buyer;
      payoutsThisRun[buyerAddress] = {};
      payoutsThisRun[buyerAddress].paidOut = false;
      let amount = await cs.userBuys.call(buyerAddress);
      payoutsThisRun[buyerAddress].expectedAmount = amount;
    }

    //Now iterate over pending transactions
    //Iterate through pending transactions on the multisig
    let transactionCount = await colonyMultisig.transactionCount.call();
    transactionCount = transactionCount.toNumber();

    for (idx = 0; idx < transactionCount; idx++){
      let tx = await colonyMultisig.transactions.call(idx);
      // Is the 'to' address on our list?
      if (!payoutsThisRun[tx[0]]){
        //If not, ignore it.
        continue;
      }
      // Is it the amount we expect?
      if (!payoutsThisRun[tx[1]].equals(payoutsThisRun[tx[0].expectedAmount])){
        console.log("There is a payment to address ", tx[1], " already at txid ", idx)
        console.log("But for an unexpected amount")
        console.log("Investigate before continuing")
        callback(1);
      } else {
        // Record that they've already been paid out
        payoutsThisRun[tx[0]].paidOut = true;
      }
      for (var key in payoutsThisRun){
        if (!payoutsThisRun[key].paidOut){
          console.log('Creating transaction to refund ether to ', buyerAddress);
          await colonyMultisig.submitTransaction(buyerAddress, amount, "", { from: MULTISIG_SIGNEE, gasPrice: 4e9 });
          console.log('Transaction created to refund ether to', buyerAddress);

        }
      }
    }
  })
}
