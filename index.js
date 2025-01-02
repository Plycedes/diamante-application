const DiamSdk = require("diamnet-sdk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Err } = require("diamnet-sdk/contract");
require("dotenv").config();
const { mintNFT } = require("./mint.js");
const { createAndIssueAssets } = require("./assets.js");

const pair = DiamSdk.Keypair.random();
const server = new DiamSdk.Aurora.Server("https://diamtestnet.diamcircle.io/");

const updateEnv = (key, value) => {
    const envPath = path.join(__dirname, ".env");

    let envContent = "";
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
    }

    const regex = new RegExp(`${key}=.*`, "gm");
    if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
        envContent += `\n${key}=${value}`;
    }

    fs.writeFileSync(envPath, envContent, "utf8");
    console.log(`Updated ${key} to ${value}`);
};

const createAccount = async () => {
    try {
        console.log("Creating account...");
        const response = await axios.get(
            `https://friendbot.diamcircle.io/?addr=${encodeURIComponent(pair.publicKey())}`
        );
        console.log("SUCCESS! You have a new account, Status Code:", response.status);
    } catch (error) {
        console.log("Error creating account", error);
    }
    updateEnv("PUBLIC_KEY", pair.publicKey());
    updateEnv("PRIVATE_KEY", pair.secret());
};

const createLedgerAccount = async (privateKey) => {
    console.log("Creating Ledger Account...");
    try {
        const childAccount = DiamSdk.Keypair.random();
        const senderKeyPair = DiamSdk.Keypair.fromSecret(privateKey);
        const parentAccount = await server.loadAccount(senderKeyPair.publicKey());

        let createAccountTx = new DiamSdk.TransactionBuilder(parentAccount, {
            fee: DiamSdk.BASE_FEE,
            networkPassphrase: DiamSdk.Networks.TESTNET,
        })
            .addOperation(
                DiamSdk.Operation.createAccount({
                    destination: childAccount.publicKey(),
                    startingBalance: "5",
                })
            )
            .setTimeout(180)
            .build();

        createAccountTx.sign(senderKeyPair);

        let txRespone = await server.submitTransaction(createAccountTx).catch((error) => {
            console.log("Error submitting transaction", error);
        });
        console.log("Ledger Account created", txRespone);
        updateEnv("LEDGER_KEY", childAccount.publicKey());
        updateEnv("LEDGER_SECRET", childAccount.secret());
    } catch (error) {
        console.log("Error creating ledger account", error);
    }
};

const checkAccountBalance = async (publickey) => {
    console.log("Fetching balance...");
    const account = await server.loadAccount(publickey);

    console.log(`Balances for account ${publickey}:`);
    account.balances.forEach((balance) => {
        console.log(`Type: ${balance.asset_type}, Balance: ${balance.balance}`);
    });
};

const sendPayment = async (senderPrivateKey, recieverPublicKey, amount) => {
    console.log("Sending Payment...");

    const sourceKeys = DiamSdk.Keypair.fromSecret(senderPrivateKey);

    await server.loadAccount(recieverPublicKey).catch((error) => {
        if (error instanceof DiamSdk.NotFoundError) {
            throw new Error("The destination account doesn't exist");
        } else {
            console.log(error);
        }
    });

    try {
        const sourceAccount = await server.loadAccount(sourceKeys.publicKey());

        let transaction = new DiamSdk.TransactionBuilder(sourceAccount, {
            fee: DiamSdk.BASE_FEE,
            networkPassphrase: DiamSdk.Networks.TESTNET,
        })
            .addOperation(
                DiamSdk.Operation.payment({
                    destination: recieverPublicKey,
                    asset: DiamSdk.Asset.native(),
                    amount: amount.toString(),
                })
            )
            .addMemo(DiamSdk.Memo.text("Test Transaction"))
            .setTimeout(180)
            .build();

        transaction.sign(sourceKeys);

        const txResponse = await server.submitTransaction(transaction);
        console.log(`Transaction ID: ${txResponse}`);
    } catch (error) {
        console.log("Error occured while sending payment:", error);
    }
};

(async () => {
    //await createAccount();
    //await createLedgerAccount(process.env.PRIVATE_KEY);
    // await checkAccountBalance(process.env.PUBLIC_KEY);
    // await checkAccountBalance(process.env.SECOND_PUB);
    //await sendPayment(process.env.SECOND_PVT, process.env.PUBLIC_KEY, 20);
    await createAndIssueAssets();
    await checkAccountBalance(process.env.PUBLIC_KEY);
    await checkAccountBalance(process.env.SECOND_PUB);
})();
