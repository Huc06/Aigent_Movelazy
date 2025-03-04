import { Tool } from "langchain/tools";
import { AptosAccount } from "aptos";

class CreateAccountTool extends Tool {
  name = "create_account";
  description = "This tool creates a new random Aptos account and returns the address and private key.";

  constructor() {
    super();
  }

  async _call(args) {
    const account = new AptosAccount();
    const result = {
      address: account.address().hex(),
      privateKey: account.toPrivateKeyObject().privateKeyHex,
    };
    return JSON.stringify(result);
  }
}

console.log('CreateAccountTool:', CreateAccountTool);

export default CreateAccountTool;