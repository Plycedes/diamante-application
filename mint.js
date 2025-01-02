const DiamSdk = require("diamnet-sdk");
require("dotenv").config();

async function mintNFT() {
    console.log("Minting NFT...");
    const server = new DiamSdk.Aurora.Server("https://diamtestnet.diamcircle.io/");

    const secretKey = process.env.PRIVATE_KEY;
    const keypair = DiamSdk.Keypair.fromSecret(secretKey);
    const parentAccount = await server.loadAccount(keypair.publicKey());

    const nftMetadata = {
        name: "My Unique NFT",
        description: "This is a unique NFT on the Diamante blockchain.",
        image: "https://res.cloudinary.com/dxsffcg6l/image/upload/v1708589618/atmpjad885vjm6otiv6f.jpg",
        attributes: [
            { trait_type: "Rarity", value: "Rare" },
            { trait_type: "Category", value: "Art" },
        ],
    };

    if (!nftMetadata.name || !nftMetadata.image) {
        console.error("NFT metadata is missing required fields.");
        return;
    }

    const transaction = new DiamSdk.TransactionBuilder(parentAccount, {
        fee: DiamSdk.BASE_FEE,
        networkPassphrase: DiamSdk.Networks.TESTNET,
    })
        .addOperation("createAsset", {
            asset: {
                name: nftMetadata.name,
                description: nftMetadata.description,
                image: nftMetadata.image,
                attributes: nftMetadata.attributes,
            },
            owner: keypair.publicKey,
        })
        .setTimeout(150)
        .build();

    transaction.sign(keypair);

    try {
        const response = await diamante.submitTransaction(transaction);

        if (response.success) {
            console.log("NFT minted successfully!");
            console.log("Transaction ID:", response.transactionId);
        } else {
            console.error("Error minting NFT:", response.error);
        }
    } catch (error) {
        console.error("An error occurred while submitting the transaction:", error);
    }
}

module.exports = { mintNFT };
