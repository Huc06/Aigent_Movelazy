require('dotenv').config();

const express = require('express');
const { ChatAnthropic } = require("@langchain/anthropic");
const apiRoutes = require('./routes/apiRoutes');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON
app.use(express.json());

const llm = new ChatAnthropic({
    temperature: 0.7,
    model: "claude-3-5-sonnet-latest",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use existing routes
app.use('/api', apiRoutes);

app.post('/api/module-info', async (req, res) => {
  const { address } = req.body; // Nhận địa chỉ từ body của yêu cầu

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  const options = {
    method: 'GET',
    url: `https://fullnode.devnet.aptoslabs.com/v1/accounts/${address}/modules`,
    headers: { Accept: 'application/json, application/x-bcs' }
  };

  try {
    const { data } = await axios.request(options);
    res.json(data); // Gửi dữ liệu về client
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "An error occurred while fetching data" });
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});