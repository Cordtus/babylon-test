# Contract Deployment - Babylon Testnet

## Deployment

- **Contract Address**: bbn1w2y5auktmc0k0j5xktxyauj5drdagejhhjtld4d5tp2syzpfndes8swx6l
- **Code Upload TX**: [156A4FDD4828E4FD7E711F133DD7328A309002A5583055AC335AC15488258E60](https://testnet.babylon.explorers.guru/transaction/156A4FDD4828E4FD7E711F133DD7328A309002A5583055AC335AC15488258E60)
- **Instantiation TX**: [D2E38310E4F52EB09AAD427F538C76C0107C8533C664902F1709AB6639C6A031](https://testnet.babylon.explorers.guru/transaction/D2E38310E4F52EB09AAD427F538C76C0107C8533C664902F1709AB6639C6A031)
- **Message Updates**:
  - Update 1: [0C944C772443269D33EC3B152634AF7BA31D79530845DDECE336B9ECD64BC744](https://testnet.babylon.explorers.guru/transaction/0C944C772443269D33EC3B152634AF7BA31D79530845DDECE336B9ECD64BC744)
  - Update 2: [A689A15CA36BA80947CEFD70EF44836F46185E5A809C13C45C2324AC0A8C2BAC](https://testnet.babylon.explorers.guru/transaction/A689A15CA36BA80947CEFD70EF44836F46185E5A809C13C45C2324AC0A8C2BAC)

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

### IDE and Development Tools
- VSCode (recommended)
  - Essential extensions:
    - rust-analyzer
    - Better TOML
    - CodeLLDB
  - Add rust-analyzer settings to workspace
- GitHub CLI (`gh`) for repository management
- `tmux` for managing multiple terminal sessions

## Known Issues and Workarounds

### HD Path Issue
**This was the root cause of initial deployment failures and is not documented in official guides.**

The babylond SDK key generation differs from standard Cosmos key derivation:
- Use standard Cosmos HD path: `m/44'/118'/0'/0/0`
- When importing keys, explicitly specify the path:

```bash
babylond keys add good --hd-path "m/44'/118'/0'/0/0" --recover
```

### Node Setup Issues
1. State sync not clearly documented
   - Possibly non-working (?)
   - Only option is to sync from snapshot

2. Docker optimization problematic in LXC
   - Alternative: Use `wasm-opt` directly
   ```bash
   wasm-opt -Oz contract.wasm -o optimized.wasm
   ```
   - Less optimal but workable

### Testnet Access Issues
- Faucet accessibility limited - consider additional avenues (Telegram, Twitter)
- Current options not quite adequate. (Discord faucet ran out, also provides an inadequate amount of tokens for any real testing)
- Must use local testnet for heavy development

## Contract Usage Guide

### Contract Overview
Simple message storage system with owner permissions:
- Store and update messages
- Owner-only message updates
- Query current message

### Building and Deployment Options

#### Option 1: Traditional Deployment
1. Build Contract
```bash
cargo build --release --target wasm32-unknown-unknown
```

2. Optimize (Choose one method):

a) Direct optimization:
```bash
wasm-opt -Oz target/wasm32-unknown-unknown/release/babylon_contract.wasm -o babylon_contract.wasm
```

b) Docker optimization (preferred):
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

3. Upload and Deploy:
```bash
# Upload
babylond tx wasm store babylon_contract.wasm \
    --from=$key \
    --gas=auto \
    --gas-prices=0.002ubbn \
    --chain-id="$chainId" \
    -b=sync \
    --yes \
    $keyringBackend

# Get Code ID
CODE_ID=$(babylond query wasm list-code -o json | jq -r '.code_infos[-1].code_id')

# Instantiate
babylond tx wasm instantiate $CODE_ID \
    '{"message":"initial message"}' \
    --from=$key \
    --label="message_store" \
    --no-admin \
    --chain-id="$chainId" \
    -b=sync \
    --yes \
    $keyringBackend

# Get Address
CONTRACT_ADDR=$(babylond query wasm list-contract-by-code $CODE_ID -o json | jq -r '.contracts[-1]')
```

#### Option 2: Quick Deployment Script
1. Setup:
```bash
cd scripts && yarn
cp .env.template .env
# Edit .env and add your mnemonic
```

2. Deploy:
```bash
yarn deploy        # Basic deployment
yarn deploy:test   # Deploy and run automated tests
```

### Contract Interaction

#### Via Babylond CLI
```bash
# Query
babylond query wasm contract-state smart $CONTRACT_ADDR '{"get_message":{}}'

# Update Message
babylond tx wasm execute $CONTRACT_ADDR \
    '{"update_message":{"message":"new message"}}' \
    --from=$key \
    --chain-id="$chainId" \
    -b=sync \
    --yes \
    $keyringBackend
```

#### Via REST API
A helper script is required for querying CosmWasm contracts via REST. You can use [cwquery.sh](https://raw.githubusercontent.com/Cordtus/bitsnpcs/refs/heads/main/scripts/cwquery.sh) or similar tools.

```bash
./cwquery.sh https://babylon-testnet-api.polkachu.com \
    <contract_address> \
    '{"get_message":{}}'
```

## Troubleshooting Guide

### Deployment Issues
1. Account Not Found
   - Verify HD path matches `m/44'/118'/0'/0/0`
   - Use explicit HD path when importing keys
   - Consider using wallet generation tool for verification

2. Gas Issues
   - Default working values:
     - Gas wanted: ~1086991
     - Gas used: ~1007343
     - Gas price: 0.002ubbn
   - Adjust in config.js if needed

3. RPC Endpoints
   - Try alternate endpoints if primary is unresponsive
   - Verify endpoint supports required APIs

### API Query Issues
1. Unknown Variant Errors
   - Verify query message format
   - Check JSON escaping
   - Confirm using correct API endpoint

## Development Tools
- [Wallet Generation Tool](https://github.com/Cordtus/wallet_generator)
- REST API query tools
- Deployment scripts

## Testing Strategy
1. Local Testing
   - Cargo test
   - Error condition coverage
   - Auth checks

2. Testnet Testing
   - Deploy with yarn deploy:test
   - REST API query validates message
   - Transaction confirmation by hash

## Areas for Improvement
1. Development Environment
   - Comprehensive setup documentation
   - Standardized development container
   - Non-Docker optimization tools

2. Network Access
   - Improved faucet accessibility
   - State sync documentation

3. Development Tools
   - More detailed environment setup tips
   - Enhanced CLI tools
   - Improved templates
   - Better details around key derivation
