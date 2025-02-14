# Guide to Babylon Smart Contract Development

## Development Environment Setup

### Dependencies

```bash
# Basic development tools
apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    jq \
    nano \
    wget \
    binaryen  # For wasm-opt

# Install Rust and WASM target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target add wasm32-unknown-unknown
```

### Development Environment Notes

- VSCode setup not documented in official guides but highly recommended
  - Essential extensions: rust-analyzer, Better TOML, CodeLLDB
  - Consider adding settings for rust-analyzer to workspace
- GitHub CLI (`gh`) useful for repository management
- `tmux` helpful for managing multiple terminal sessions (node sync, contract development)

### Known Issues and Workarounds

#### Node Setup Issues

1. State sync not documented/working
   - Currently best to sync from genesis or snapshot
   - Snapshot speeds up process but requires trust in snapshot provider
   - Consider documenting state sync process if/when working

#### Development Environment Issues

1. Docker optimization problematic in LXC
   - Use `wasm-opt` directly instead
   - Commands:
     ```bash
     wasm-opt -Oz contract.wasm -o optimized.wasm
     ```
   - Not as optimal as Docker optimizer but workable

#### Testnet Access Issues

*Faucet accessibility limited*

   - Current options not well documented
   - Need more accessible faucets (Telegram/Discord/Web)
   - Should have higher limits with rate limiting
   - Local testnet may be better for heavy / initial development

## Contract Usage Guide

### Contract Overview

Our contract implements a simple message storage system with owner permissions:
 
- Store and update messages
- Owner-only message updates
- Query current message

### Building and Deploying

1. Build Contract

```bash
cargo build --release --target wasm32-unknown-unknown
```
**Optimization**

2.a: No Docker method

```bash
wasm-opt -Oz target/wasm32-unknown-unknown/release/babylon_contract.wasm -o babylon_contract.wasm
```
2.b: Docker method (preferred)
Produces smallest possible file size, recommended for production deployments.

```bash
# create Dockerfile
cat > Dockerfile <<EOF
FROM cosmwasm/rust-optimizer:0.14.0
COPY . ./
RUN optimize.sh
EOF

# Run optimization
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer:0.14.0
```

Typically results in smaller file than other method.


3. Upload contract on Chain

```bash
babylond tx wasm store babylon_contract.wasm \
    --from=$key \
    --gas=auto \
    --gas-prices=0.002ubbn \
    --chain-id="$chainId" \
    -b=sync \
    --yes \
    $keyringBackend
```

4. Get Code ID
```bash
CODE_ID=$(babylond query wasm list-code -o json | jq -r '.code_infos[-1].code_id')
```

5. Instantiate Contract
```bash
babylond tx wasm instantiate $CODE_ID \
    '{"message":"initial message"}' \
    --from=$key \
    --label="message_store" \
    --no-admin \
    --chain-id="$chainId" \
    -b=sync \
    --yes \
    $keyringBackend
```

6. Get Contract Address

```bash
CONTRACT_ADDR=$(babylond query wasm list-contract-by-code $CODE_ID -o json | jq -r '.contracts[-1]')
```

### Interacting with Contract

#### Query Message

```bash
babylond query wasm contract-state smart $CONTRACT_ADDR '{"get_message":{}}'
```

#### Update Message (Owner Only)
```bash
babylond tx wasm execute $CONTRACT_ADDR \
    '{"update_message":{"message":"new message"}}' \
    --from=$key \
    --chain-id="$chainId" \
    -b=sync \
    --yes \
    $keyringBackend
```

### Error Handling

- Unauthorized updates return clear error message
- Storage errors handled gracefully
- Gas estimation automatic but may need adjustment

## Suggestions

   - Local Testing
   - Use `cargo test` extensively
   - Test all error conditions
   - Test authorization checks

## Quick Deployment Script Usage

### Overview
Instead of waiting for a full node sync, I decided to deploy directly to testnet using a simple js script.

### Setup and Usage

1. Install Node.js dependencies:

```bash
cd scripts && yarn
```

2. Configure environment:

```bash
cp .env.template .env
# Edit .env and add your mnemonic
```

3. Deploy contract:

```bash
yarn deploy        # Basic deployment
yarn deploy:test   # Deploy and run automated tests
```

### Expected Output

```
Deploying to bbn-test-5 via https://babylon-testnet-rpc.polkachu.com
Deploying from address: bbn14jqa0s90a3vqp8ft82qy2h7y0n0jqpvxg3cl6f
Uploading contract...
Upload result: {
  originalSize: 129000,
  originalChecksum: "...",
  compressedSize: 129000,
  compressedChecksum: "...",
  codeId: 123,
  events: [...]
}
Instantiating contract...
Contract address: bbn1...

Running tests...
Initial message: "initial message"
Update result: { ... }
Updated message: "updated message"
```

### Troubleshooting

- If upload fails with out of gas, adjust GAS_PRICE in config.js
- If RPC endpoint is unresponsive, try alternate endpoints in config.js
- Ensure sufficient testnet BBN tokens in deployer account

## Future Improvements Needed

1. Development Environment
   - More comprehensive documentation for dev environment setup
   - Standardized development container
   - Reference to Non-Docker optimization tool/methods

2. Network Access
   - More accessible faucets
   - State sync documentation/fixes

3. Contract Tools
   - CLI tools for common operations
   - Better contract templates
