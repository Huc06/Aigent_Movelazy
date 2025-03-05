require('dotenv').config();

const express = require('express');
const { ChatAnthropic } = require("@langchain/anthropic");
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

// Use existing routes
app.use('/api', apiRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});