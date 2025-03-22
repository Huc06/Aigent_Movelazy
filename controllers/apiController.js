const { Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey, PrivateKeyVariants } = require("@aptos-labs/ts-sdk");
const { ChatAnthropic } = require("@langchain/anthropic");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { AgentRuntime, LocalSigner, createAptosTools } = require("move-agent-kit");
const { Readable } = require('stream');

const llm = new ChatAnthropic({
    temperature: 0.7,
    model: "claude-3-5-sonnet-latest",
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const handleApiRequest = async (req, res) => {
    try {
        // Initialize Aptos configuration
        const aptosConfig = new AptosConfig({
            network: Network.DEVNET,
        });

        const aptos = new Aptos(aptosConfig);

        // Validate and get private key from environment
        const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
        if (!privateKeyStr) {
            throw new Error("Missing APTOS_PRIVATE_KEY environment variable");
        }

        // Setup account and signer
        const account = await aptos.deriveAccountFromPrivateKey({
            privateKey: new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyStr, PrivateKeyVariants.Ed25519)),
        });

        const signer = new LocalSigner(account, Network.DEVNET);
        const aptosAgent = new AgentRuntime(signer, aptos, {
            PANORA_API_KEY: process.env.PANORA_API_KEY,
        });
        const tools = createAptosTools(aptosAgent);

        // Create React agent
        const agent = createReactAgent({
            llm,
            tools,
            messageModifier: `
                You are a helpful agent that can interact onchain using the Aptos Agent Kit. You are
                empowered to interact onchain using your tools. If you ever need funds, you can request them from the
                faucet. If not, you can provide your wallet details and request funds from the user. If there is a 5XX
                (internal) HTTP error code, ask the user to try again later. If someone asks you to do something you
                can't do with your currently available tools, you must say so, and encourage them to implement it
                themselves using the Aptos Agent Kit, recommend they go to https://www.aptosagentkit.xyz for more information. 
                Beconcise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.
                if the input contains "call function" then detect the 'module address' and 'module name' and 'function name' and 'function arguments' then combine then into a single string like 'aptos move run --function-id <module address>::<module name>::<function name> --args type0:arg0 type1:arg1 --assume-yes' then return the string. 
                Example: 'call function with moduleaddress=a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f modulename=usdk function=mint args=[address:a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f, u64:100000000] show me the result when done' return 'aptos move run --function-id a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f::usdk::mint --args address:a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f u64:100000000 --assume-yes';               
                'I want to call function with moduleaddress=a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f modulename=fa_coin function=mint args=address:a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f u64:100000000 and show me the result' return 'aptos move run --function-id a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f::fa_coin::mint --args address:a02a821ada9af357949c3fd934ef6da80c8a31d73c8da0e152f4f63eb03e327f u64:100000000 --assume-yes'; 
            `,
        });

        // Parse request body
        const body = req.body;
        const messages = body.messages ?? [];
        const showIntermediateSteps = body.show_intermediate_steps ?? false;

        if (!showIntermediateSteps) {
            const eventStream = await agent.streamEvents(
                { messages },
                {
                    version: "v2",
                    configurable: {
                        thread_id: "Aptos Agent Kit!",
                    },
                }
            );

            const textEncoder = new TextEncoder();
            const transformStream = new ReadableStream({
                async start(controller) {
                    for await (const { event, data } of eventStream) {
                        if (event === "on_chat_model_stream") {
                            if (data.chunk.content) {
                                if (typeof data.chunk.content === "string") {
                                    controller.enqueue(textEncoder.encode(data.chunk.content));
                                } else {
                                    for (const content of data.chunk.content) {
                                        controller.enqueue(textEncoder.encode(content.text ? content.text : ""));
                                    }
                                }
                            }
                        }
                    }
                    controller.close();
                },
            });

            const reader = transformStream.getReader();
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
            res.end(); // End the response
            return; // Add return to ensure no additional response is sent
        } else {
            const result = await agent.invoke({ messages });
            return res.json({
                messages: result.messages.map(convertLangChainMessageToVercelMessage),
            });
        }
    } catch (error) {
        console.error("Request error:", error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : "An error occurred",
            status: "error",
        });
    }
};

module.exports = { handleApiRequest }; 