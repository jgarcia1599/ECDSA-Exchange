const express = require("express");
const app = express();
const cors = require("cors");
const secp = require("@noble/secp256k1");
const port = 3042;

// localhost can have cross origin errors
// depending on the browser you use!
app.use(cors());
app.use(express.json());

// generate public and private key addresses using the balances array
const balances = [100, 50, 75];
let ledger = {};
balances.map((balance) => {
  let privateKey = Buffer.from(secp.utils.randomPrivateKey()).toString("hex");
  let publicKey = Buffer.from(secp.getPublicKey(privateKey)).toString("hex");
  // make it look like ethereum public keys
  // publicKey = "0x" + publicKey.slice(publicKey.length-40)
  ledger[publicKey] = {
    privateKey,
    balance,
  };
}); //

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = ledger[address] ? ledger[address].balance : 0;
  res.send({ balance });
});

app.post("/send", async (req, res) => {
  console.log("ledger state before transaction", ledger);
  const { sender, recipient, amount, privateKey } = req.body;
  const messageHash = await secp.utils.sha256(
    `${sender} sends ${recipient} ${amount} ETH`
  );
  const signature = await secp.sign(messageHash, privateKey);
  const isValid = await secp.verify(signature, messageHash, sender);
  if (isValid) {
    if (ledger[sender] && ledger[recipient]) {
      ledger[sender].balance -= amount;
      ledger[recipient].balance = (ledger[recipient].balance || 0) + +amount;
    }
  }
  console.log("ledger state after transaction", ledger);
  res.send({ balance: ledger[sender] ? ledger[sender].balance : 0 });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);

  let publickKeys = Object.keys(ledger);
  let privateKeys = publickKeys.map((key) => ledger[key]["privateKey"]);
  console.log("Available Accounts");
  console.log("==================");
  publickKeys.forEach((key, index) => {
    console.log(`(${index}) ${key} (${ledger[key].balance} ETH )`);
  });
  console.log("Private Keys");
  console.log("=============");
  privateKeys.forEach((key, index) => {
    console.log(`(${index}) ${key}`);
  });
});
