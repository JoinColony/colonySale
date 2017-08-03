
const TOKEN_SALE_ADDRESS = "0xc86b420f55db6f754da9731462b5998cbc510ec6";
const MULTISIG_ADDRESS = '0xa8da163375713753acc7e1d429c64f72b9412077'
const MULTISIG_SIGNEE = '0x9dF24e73f40b2a911Eb254A8825103723E13209C';

const DRY_RUN = true;

// ===============
// NOTHING BELOW HERE SHOULD NEED TO BE CHANGED
// ===============

var ColonyTokenSale = artifacts.require("./ColonyTokenSale.sol");
var MultiSigWallet = artifacts.require('multisig-wallet/MultiSigWallet.sol');

let colonyMultisig = MultiSigWallet.at(MULTISIG_ADDRESS);
var cs = ColonyTokenSale.at(TOKEN_SALE_ADDRESS)
let confirmedPayoutAddresses = {}

cs.Purchase({}, {fromBlock: 0, toBlock: "latest"}).get(async (err, res) => {
  if (err){
    console.log('Error: ', exit);
    return process.exit()
  }

  //Iterate through pending transactions on the multisig
  transactionCount = await colonyMultisig.transactionCount.call();
  transactionCount = transactionCount.toNumber();

  for (idx = 0; idx < transactionCount; idx++){
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
      process.exit(1)
    }
    //Check tx is valueless
    if (!tx[1].equals(0)){
      console.log("Unexpected transfer of ether")
      console.log("Transaction " + idx + " wishes to move " + tx[1].toString() + " wei")
      console.log("Investigate before going any further");
      process.exit(1)
    }
    // Check the tx calls the right function i.e. bytes4(sha3(claimPurchase(address)))===0xcc967ba1
    if (tx[2].substr(0,10)!=="0xcc967ba1"){
      console.log("Unexpected function signature")
      console.log("Transaction " + idx + " wishes to call " + tx[2].substr(0,10))
      console.log("Investigate before going any further");
      process.exit(1)
    }
    //Check the tx is paying out an address we expect
    const payoutAddress = '0x' + tx[2].substr(34);
    payoutAmount = await cs.userBuys.call(payoutAddress);
    if (payoutAmount.equals(0)){
      console.log("Zero payout")
      console.log("Transaction " + idx + " wishes to pay out " + payoutAddress)
      console.log("But they have no balance to be paid out")
      console.log("Investigate before going any further");
      process.exit(1)
    }
    // Check the tx isn't paying out an address we've already confirmed this run
    if (confirmedPayoutAddresses[payoutAddress]){
      console.log("Duplicate payout")
      console.log("Transaction " + idx + " wishes to pay out " + payoutAddress)
      console.log("But we have already paid them out")
      console.log("Investigate before going any further");
      process.exit(1)
    }
    //If we got this far, I guess we should confirm!
    if (!DRY_RUN){
      await colonyMultisig.confirmTransaction(idx, {gasPrice: 4e9, from: MULTISIG_SIGNEE})
      console.log("Tansaction to pay out ", payoutAddress, " confirmed");
    } else {
      console.log("DRY RUN: Would confirm transaction to pay out ", payoutAddress);
    }
    confirmedPayoutAddresses[payoutAddress] = true;
  }
  if (DRY_RUN){
    console.log('No issues with pending transactions detected');
  } else {
    console.log('All pending claim transactions successfully confirmed')
  }

})
