# Colony Token and Crowdsale contracts
## Install

```
git clone https://github.com/JoinColony/colonySale.git
npm install -g ethereumjs-testrpc@4.0.0
yarn
```

## Contracts

CLNY Token contract is defined in contracts/Token.sol and contracts/EtherRouter.sol. 
Token Sale is defined in contracts/ColonyTokenSale.sol

The `math`, `erc20` and a significant part of the `token` contracts have been reused from the [Dappsys library](https://github.com/dapphub/dappsys).

## Testing

To run all tests:
```
gulp test:contracts
```
To run tests with code coverage using [solidity-coverage](https://github.com/sc-forks/solidity-coverage):
```
gulp test:contracts:coverage
```
To lint contracts using [Solium](https://github.com/duaraghav8/Solium)
```
gulp lint:contracts
```
