module.exports = {
    copyNodeModules: true,
    skipFiles: [
      'EtherRouter.sol',
      'dappsys/auth.sol',
      'dappsys/base.sol',
      'dappsys/erc20.sol',
      'dappsys/guard.sol',
      'dappsys/math.sol',
      'dappsys/note.sol',
      'dappsys/stop.sol',
      'dappsys/token.sol',
    ],
    testCommand: './node_modules/.bin/truffle test --network coverage',
    testrpcOptions: '--port 8555 --account="0x0355596cdb5e5242ad082c4fe3f8bbe48c9dba843fe1f99dd8272f487e70efae, 100000000000000000000" --account="0xe9aebe8791ad1ebd33211687e9c53f13fe8cca53b271a6529c7d7ba05eda5ce2, 100000000000000000000" --account="0x6f36842c663f5afc0ef3ac986ec62af9d09caa1bbf59a50cdb7334c9cc880e65, 100000000000000000000"'
};
