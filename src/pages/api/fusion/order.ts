// pages/api/fusion/order.ts
import { NextApiRequest, NextApiResponse } from "next";
import {
  FusionSDK,
  NetworkEnum,
  PrivateKeyProviderConnector,
  Web3Like,
} from "@1inch/fusion-sdk";
import { JsonRpcProvider } from "ethers";

const NODE_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://eth.llamarpc.com";
const DEV_PORTAL_API_TOKEN = process.env.ONEINCH_KEY;
const NETWORK = NetworkEnum.ETHEREUM;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ethersRpcProvider = new JsonRpcProvider(NODE_URL);

const web3Provider: Web3Like = {
  eth: {
    call(transactionConfig: any): Promise<string> {
      return ethersRpcProvider.call(transactionConfig);
    },
  },
  extend(): void {},
};

const connector = new PrivateKeyProviderConnector(
  PRIVATE_KEY ||
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  web3Provider
);

const sdk = new FusionSDK({
  url: "https://api.1inch.dev/fusion",
  network: NETWORK,
  blockchainProvider: connector,
  authKey: DEV_PORTAL_API_TOKEN,
});

function replacer(key: string, value: any) {
  // Convert BigInt values to string
  return typeof value === "bigint" ? value.toString() : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("=== FUSION ORDER API DEBUG ===");
  console.log("Request method:", req.method);
  console.log("Environment check:", {
    NODE_URL: NODE_URL ? "✅ Set" : "❌ Missing",
    DEV_PORTAL_API_TOKEN: DEV_PORTAL_API_TOKEN ? "✅ Set" : "❌ Missing",
    NETWORK: NETWORK,
    PRIVATE_KEY: PRIVATE_KEY ? "✅ Set" : "❌ Missing (using dummy)",
  });

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const {
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      source,
      preset,
      quoteId,
      customAuctionDuration,
    } = req.body;

    console.log("Extracted params:", {
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      source,
      preset,
      quoteId,
      customAuctionDuration,
    });

    if (!fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
      console.log("❌ Missing required parameters");
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
      });
    }

    if (!DEV_PORTAL_API_TOKEN) {
      console.log("❌ Missing DEV_PORTAL_API_TOKEN environment variable");
      return res.status(500).json({
        success: false,
        error: "Server configuration error: Missing API token",
      });
    }

    if (!PRIVATE_KEY) {
      console.log(
        "⚠️ WARNING: PRIVATE_KEY not set. Using dummy key! Do not use in production."
      );
    }

    const params = {
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      source: source || "fusion-api",
      preset,
      ...(customAuctionDuration && { customAuctionDuration }),
    };

    console.log(
      "Calling sdk.createOrder with params:",
      JSON.stringify(params, null, 2)
    );
    const startTime = Date.now();

    const preparedOrder = await sdk.createOrder(params);

    const endTime = Date.now();
    console.log("✅ Order created in", endTime - startTime, "ms");
    console.log("Order structure:", {
      order: !!preparedOrder.order,
      quoteId: preparedOrder.quoteId,
      hash: preparedOrder.hash,
      orderPreview: preparedOrder.order
        ? Object.keys(preparedOrder.order)
        : "No order in response",
    });

    const safeOrder = JSON.parse(JSON.stringify(preparedOrder.order, replacer));

    return res.status(200).json({
      success: true,
      order: safeOrder,
      quoteId: preparedOrder.quoteId,
    });
  } catch (error: any) {
    console.log("❌ FUSION ORDER ERROR:");
    console.log("Error name:", error.name);
    console.log("Error message:", error.message);
    console.log("Error stack:", error.stack);
    console.log(
      "Full error object:",
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    );
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create fusion order",
      debugInfo: {
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
