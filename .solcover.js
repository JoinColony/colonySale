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
    testCommand: './node_modules/.bin/truffle test --network coverage'
};
