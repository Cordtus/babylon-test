export const config = {
    // network config
    RPC_ENDPOINTS: [
        'https://babylon-testnet-rpc.nodes.guru',
        'https://babylon-testnet-rpc.polkachu.com',
        'https://rpc-babylon-testnet.imperator.co'
    ],
    RPC_ENDPOINT: 'https://babylon-testnet-rpc.nodes.guru',
    CHAIN_ID: 'bbn-test-5',

    // gas config
    GAS_PRICE: '0.002ubbn',
    GAS_ADJUSTMENT: 1.3,

    // contract config
    CONTRACT_LABEL: 'message_store',
    INITIAL_MESSAGE: 'initial message',

    // contract path
    WASM_PATH: '../babylon_contract.wasm'
};
