const DiamSdk = require("diamnet-sdk");
require("dotenv").config();

const createAndIssueAssets = async () => {
    console.log("Creating Asset...");
    const issuingKeys = DiamSdk.Keypair.fromSecret(process.env.PRIVATE_KEY);
    const receivingKeys = DiamSdk.Keypair.fromSecret(process.env.SECOND_PVT);
    const server = new DiamSdk.Aurora.Server("https://diamtestnet.diamcircle.io/");

    const astroDollar = new DiamSdk.Asset("AstroDollar", issuingKeys.publicKey());
    const receiver = await server.loadAccount(receivingKeys.publicKey());

    const ctTransaction = new DiamSdk.TransactionBuilder(receiver, {
        fee: 100,
        networkPassphrase: DiamSdk.Networks.TESTNET,
    })
        .addOperation(
            DiamSdk.Operation.changeTrust({
                asset: astroDollar,
                limit: "1000",
            })
        )
        .setTimeout(100)
        .build();

    ctTransaction.sign(receivingKeys);
    const tr = await server.submitTransaction(ctTransaction).catch((error) => {
        console.log("Error submitting transaction", error);
    });
    console.log("Trust change operation was successful", tr);
    console.log(
        ".......................................Issuing Asset........................................"
    );

    const issuer = await server.loadAccount(issuingKeys.publicKey());

    var sendTransaction = new DiamSdk.TransactionBuilder(issuer, {
        fee: 100,
        networkPassphrase: DiamSdk.Networks.TESTNET,
    })
        .addOperation(
            DiamSdk.Operation.payment({
                destination: receivingKeys.publicKey(),
                asset: astroDollar,
                amount: "10",
            })
        )
        .setTimeout(100)
        .build();

    sendTransaction.sign(issuingKeys);
    const txResponse = await server.submitTransaction(sendTransaction).catch((error) => {
        console.log("Error issuing the tokens", error);
    });
    console.log("Tokens transferred successfully", txResponse);
};

module.exports = { createAndIssueAssets };
