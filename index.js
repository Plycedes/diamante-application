const DiamSdk = require("diamnet-sdk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

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
            `https://friendbot.diamcircle.io?addr=${encodeURIComponent(pair.publicKey())}`
        );
        console.log("SUCCESS! You have a new account, Status Code:", response.status);
    } catch (error) {
        console.log("Error creating account", error);
    }
    updateEnv("PUBLIC_KEY", pair.publicKey());
    updateEnv("PRIVATE_KEY", pair.secret());
};

const createLedgerAccount = async (publicKey) => {
    console.log("Creating Ledger Account...");
    try {
        const parentAccount = await server.loadAccount(publicKey);
        const childAccount = DiamSdk.Keypair.random();

        let createAccountTx = new DiamSdk.TransactionBuilder(parentAccount, {
            fee: DiamSdk.BASE_FEE,
            networkPassphrase: DiamSdk.Networks.TESTNET,
        });

        createAccountTx = await createAccountTx
            .addOperation(
                DiamSdk.Operation.createAccount({
                    destination: childAccount.publicKey(),
                    startingBalance: "5",
                })
            )
            .setTimeout(180)
            .build();

        await createAccountTx.sign(pair);

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
    const account = await server.loadAccount(publickey);

    console.log(`Balances for account ${publickey}:`);
    account.balances.forEach((balance) => {
        console.log(`Type: ${balance.asset_type}, Balance: ${balance.balance}`);
    });
};

(async () => {
    await createAccount();
    //await createLedgerAccount(process.env.PUBLIC_KEY);
    await checkAccountBalance(process.env.PUBLIC_KEY);
})();
