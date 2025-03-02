require('dotenv').config();

const express = require('express');
const { Aptos, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");
const { ChatAnthropic } = require("@langchain/anthropic");
const { AptosAccount } = require('aptos');
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

// Use existing routes
app.use('/api', apiRoutes);

// Start server
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});