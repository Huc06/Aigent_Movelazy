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

app.post('/api/execute-move', async (req, res) => {
  const { functionName, typeArguments, arguments } = req.body; // Nhận tên hàm, kiểu tham số và tham số từ body của yêu cầu

  if (!functionName || !typeArguments || !arguments) {
    return res.status(400).json({ error: "Function name, type arguments, and arguments are required" });
  }

  const options = {
    method: 'POST',
    url: 'https://fullnode.devnet.aptoslabs.com/v1/view',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, application/x-bcs'
    },
    data: {
      function: functionName,
      type_arguments: typeArguments,
      arguments: arguments
    }
  };

  try {
    const { data } = await axios.request(options);
    console.log(data);
    res.json(data); // Gửi phản hồi về client
  } catch (error) {
    if (error.response && error.response.status === 410) {
      res.status(410).json({ error: "Requested ledger version has been pruned" });
    } else {
      console.error(error);
      res.status(500).json({ error: "An error occurred during the execution" });
    }
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});