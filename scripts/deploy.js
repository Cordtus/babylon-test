import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { config } from './config.js';

dotenv.config();

// override config if req
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || config.RPC_ENDPOINT;
const CHAIN_ID = process.env.CHAIN_ID || config.CHAIN_ID;
const GAS_PRICE = process.env.GAS_PRICE || config.GAS_PRICE;

async function deployAndTest() {
    try {
        if (!process.env.MNEMONIC) {
            throw new Error('MNEMONIC environment variable is required');
        }

        console.log(`Deploying to ${CHAIN_ID} via ${RPC_ENDPOINT}`);

        // gen wallet from mnemonic
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC, {
            prefix: 'bbn',
        });
        const [firstAccount] = await wallet.getAccounts();
        console.log('Deploying from address:', firstAccount.address);

        // create signer
        const client = await SigningCosmWasmClient.connectWithSigner(
            RPC_ENDPOINT,
            wallet,
            {
                gasPrice: GasPrice.fromString(GAS_PRICE),
            }
        );

        // upload contract
        console.log('Uploading contract...');
        const wasm = fs.readFileSync(config.WASM_PATH);
        const uploadResult = await client.upload(
            firstAccount.address,
            wasm,
            'auto'
        );
        console.log('Upload result:', uploadResult);

        // instantiate
        console.log('Instantiating contract...');
        const instantiateResult = await client.instantiate(
            firstAccount.address,
            uploadResult.codeId,
            { message: config.INITIAL_MESSAGE },
            config.CONTRACT_LABEL,
            'auto'
        );
        console.log('Contract address:', instantiateResult.contractAddress);

        // tests only run with --test
        if (process.argv.includes('--test')) {
            console.log('\nRunning tests...');

            // query message
            const queryResult = await client.queryContractSmart(
                instantiateResult.contractAddress,
                { get_message: {} }
            );
            console.log('Initial message:', queryResult);

            // update message
            const executeResult = await client.execute(
                firstAccount.address,
                instantiateResult.contractAddress,
                { update_message: { message: "updated message" } },
                'auto'
            );
            console.log('Update result:', executeResult);

            // query updated message
            const updatedQuery = await client.queryContractSmart(
                instantiateResult.contractAddress,
                { get_message: {} }
            );
            console.log('Updated message:', updatedQuery);
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

deployAndTest();
