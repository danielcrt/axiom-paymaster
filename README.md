# Axiom Power User Paymaster

## Introduction

This repo is an example on how you can build an ERC-4337 Paymaster poweredby [Axiom](https://axiom.xyz). To learn more about Axiom, check out the developer docs at [docs.axiom.xyz](https://docs.axiom.xyz) or join the developer [Telegram](https://t.me/axiom_discuss).

## Installation

This repo contains both Foundry and Javascript packages. To install, run:

```bash
forge install
pnpm install     # or `npm install` or `yarn install`
```

For installation instructions for Foundry or a Javascript package manager (`npm`, `yarn`, or `pnpm`), see [Package Manager Installation](#package-manager-installation).

Copy `.env.example` to `.env` and fill in your JSON-RPC provider URL. If you'd like to send transactions from a local hot wallet on testnet also add a Sepolia private key.

> ⚠️ **WARNING**: Never use your mainnet private key on a testnet! If you use this option, make sure you are not using the same account on mainnet.

## Test

To run Foundry tests that simulate the Axiom integration flow, run

```bash
forge test -vvvv
```

## Send a Query on-chain

To send a Query on Sepolia testnet (requires `PRIVATE_KEY_SEPOLIA` in `.env` file), run

```bash
npx tsx app/index.ts 
```

## CLI Cheatsheet

```bash
# compile
npx axiom circuit compile app/axiom/average.circuit.ts --provider $PROVIDER_URI_SEPOLIA

# prove
npx axiom circuit prove app/axiom/average.circuit.ts --sourceChainId 11155111 --provider $PROVIDER_URI_SEPOLIA

# get parameters to send a query to Axiom using sendQuery
npx axiom circuit query-params <callback contract address> --refundAddress <your Sepolia wallet address> --sourceChainId 11155111 --provider $PROVIDER_URI_SEPOLIA
```

## Package Manager Installation

Install `npm` or `bun` or `yarn` or `pnpm`:

```bash
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc  # or `source ~/.zshrc` on newer macs

# Install latest LTS node
nvm install --lts

# Install pnpm
npm install -g pnpm
pnpm setup
source ~/.bashrc  # or `source ~/.zshrc` on newer macs
```

Install [Foundry](https://book.getfoundry.sh/getting-started/installation). The recommended way to do this is using Foundryup:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```


## Deploy

To deploy, run the following command substituting `RPC_URL` and `ENTRY_POINT_ADDRESS`

Consider using `--priority-gas-price` to set a lower than maximum priority gas price E.g. `--priority-gas-price 10000`

### EntryPoint

```
forge script script/DeployEntryPoint.s.sol --fork-url <RPC_URL> --broadcast
```

### AccountFactory

```
forge script script/DeployAccountFactory.s.sol <ENTRY_POINT_ADDRESS> --sig "run(address)" --fork-url <RPC_URL> --broadcast
```


### AxiomPaymaster

Value that can be used for test purposes `MAX_REFUND_PER_BLOCK=10000000000000`

```
forge script script/DeployAxiomPaymaster.s.sol <ENTRY_POINT_ADDRESS> <MAX_REFUND_PER_BLOCK> --sig "run(address,uint256)" --fork-url <RPC_URL> --broadcast
```

### FundPaymaster

```
forge script script/FundPaymaster.s.sol <ENTRY_POINT_ADDRESS> <PAYMASTER_ADDRESS> <AMOUNT> --sig "run(address,address,uint256)" --fork-url <RPC_URL> --broadcast
```

If you are deploying to your local node, you must first start the node by running `anvil` in a separate terminal window
