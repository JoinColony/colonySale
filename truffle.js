require('babel-register');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    integration: {
      host: 'localhost',
      port: 8545,
      network_id: 'integration',
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8555,         // <-- Use port 8555
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    }
  },
  mocha: {
    reporter: 'mocha-circleci-reporter',
  },
};
