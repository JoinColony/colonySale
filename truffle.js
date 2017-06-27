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
  },
  mocha: {
    reporter: 'mocha-circleci-reporter',
  },
};
