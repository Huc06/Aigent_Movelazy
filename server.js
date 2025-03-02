require('dotenv').config();

const express = require('express');
const { Aptos, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");
const { ChatAnthropic } = require("@langchain/anthropic");
const { AptosAccount } = require('aptos');
const axios = require('axios');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

const llm = new ChatAnthropic({
    temperature: 0.7,
    model: "claude-3-5-sonnet-latest",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function to create a new random Aptos account using AptosAccount
const createNewRandomAccount = () => {
    const account = new AptosAccount();
    return {
        address: account.address().hex(),
        privateKey: account.toPrivateKeyObject().privateKeyHex,
    };
};

// API route to create a new random account
app.post('/api/createNewRandomAccount', (req, res) => {
    const account = createNewRandomAccount();
    const response = {
        messages: [
            {
                role: "user",
                content: `{% ai #createRandomAccount model="openai/gpt-4o-mini" tools="*" structuredOutputs="{address: string, privateKey: string}" /%}`
            }
        ],
        show_intermediate_steps: false,
        structuredOutputs: {
            address: account.address,
            privateKey: account.privateKey
        }
    };
    res.json(response);
});

// Function to fund an account using faucet
const fundAccountFaucet = async (address) => {
    try {
        const response = await axios.post(`https://faucet.devnet.aptoslabs.com/mint?amount=1000000&address=${address}`);
        return response.data;
    } catch (error) {
        console.error('Error funding account:', error.response ? error.response.data : error.message);
        return { error: 'Failed to fund account', details: error.response ? error.response.data : error.message };
    }
};

// API route to fund an account using faucet
app.post('/api/fundAccountFaucet', async (req, res) => {
    const { address } = req.body;
    const result = await fundAccountFaucet(address);
    const response = {
        title: "Fund Account Faucet",
        description: "Fund an account with the faucet",
        input: {
            address: address
        },
        messages: [
            {
                role: "user",
                content: `Let's fund an account with the faucet. Here's the address: ${address}`
            }
        ],
        show_intermediate_steps: false,
        result: result
    };
    res.json(response);
});

// Use existing routes
app.use('/api', apiRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});