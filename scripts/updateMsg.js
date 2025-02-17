import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import dotenv from 'dotenv';
import { config } from './config.js';

dotenv.config();

// Override config if environment variables are present
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || config.RPC_ENDPOINT;
const CHAIN_ID = process.env.CHAIN_ID || config.CHAIN_ID;
const GAS_PRICE = process.env.GAS_PRICE || config.GAS_PRICE;

async function updateMessage(contractAddress, newMessage) {
    try {
        if (!process.env.MNEMONIC) {
            throw new Error('MNEMONIC environment variable is required');
        }

        if (!contractAddress) {
            throw new Error('Contract address is required');
        }

        if (!newMessage) {
            throw new Error('New message is required');
        }

        console.log(`Updating message on contract ${contractAddress} on ${CHAIN_ID}`);

        // Generate wallet from mnemonic
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC, {
            prefix: 'bbn',
        });
        const [firstAccount] = await wallet.getAccounts();
        console.log('Updating from address:', firstAccount.address);

        // Create signing client
        const client = await SigningCosmWasmClient.connectWithSigner(
            RPC_ENDPOINT,
            wallet,
            {
                gasPrice: GasPrice.fromString(GAS_PRICE),
            }
        );

        // Execute update message
        const executeResult = await client.execute(
            firstAccount.address,
            contractAddress,
            { update_message: { message: newMessage } },
            'auto'
        );
        console.log('Update result:', executeResult);

        // Query to verify update
        const updatedMessage = await client.queryContractSmart(
            contractAddress,
            { get_message: {} }
        );
        console.log('Updated message:', updatedMessage);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node update-message.js <contract-address> <new-message>');
    process.exit(1);
}

const [contractAddress, newMessage] = args;
updateMessage(contractAddress, newMessage);
