![Colony Logo](https://user-images.githubusercontent.com/9886144/31672259-f9586cc4-b353-11e7-97fd-486069cbd256.png)

# Colony Token and Crowdsale contracts

## About

This is the repository for the postponed Colony token sale.

If you're curious, you can read [the blog post about why we postponed the sale](https://blog.colony.io/the-colony-token-sale-7ac14c845bc0).

For a description of the sale contract and its design, have a look at [Elena's post on the Token Sale Contract and the CLNY token](https://medium.com/@elena_di/3da67d833087).

The contracts contained in this repo have been released under a GPL-3.0 license. 

It should go without saying, but the code contained herein is designed to handle potentially large amounts of Ether, and as such should be deployed at your own risk and sole responsibility.  

If you've found a bug, please reach out to us here on github or by [email](mailto:hello@colony.io).

## Install

```
git clone https://github.com/JoinColony/colonySale.git
yarn global add mkdirp gulp@3.9.1
yarn --pure-lockfile
git submodule update --init --recursive --remote
```

## Contracts

The CLNY Token contract is defined in contracts/Token.sol and contracts/EtherRouter.sol.

The Token Sale contract is defined in contracts/ColonyTokenSale.sol

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
