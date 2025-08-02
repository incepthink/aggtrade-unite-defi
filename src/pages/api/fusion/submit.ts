import { NextApiRequest, NextApiResponse } from "next";
import {
  FusionSDK,
  NetworkEnum,
  PrivateKeyProviderConnector,
  Web3Like,
} from "@1inch/fusion-sdk";
import { JsonRpcProvider } from "ethers";

// --- ENV CONFIG ---
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
  `0x${PRIVATE_KEY}` ||
    "0x0000000000000000000000000000000000000000000000000000000000000001",
  web3Provider
);
const sdk = new FusionSDK({
  url: "https://api.1inch.dev/fusion",
  network: NETWORK,
  blockchainProvider: connector,
  authKey: DEV_PORTAL_API_TOKEN,
});

// --- BigInt-safe replacer ---
function replacer(key: string, value: any) {
  return typeof value === "bigint" ? value.toString() : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  // Debug: log raw body
  console.log(
    "🔹 [Fusion Submit] Raw body:",
    JSON.stringify(req.body, null, 2)
  );

  try {
    const { orderParams, quoteId } = req.body;

    if (!orderParams || !quoteId) {
      console.warn("❗ [Fusion Submit] Missing params", {
        orderParams,
        quoteId,
      });
      //   return res.status(400).json({
      //     success: false,
      //     error: "Missing orderParams or quoteId",
      //     received: { orderParams, quoteId },
      //   });
    }

    // Debug: Show received order params and quoteId
    console.log("🔹 [Fusion Submit] Received orderParams:", orderParams);
    console.log("🔹 [Fusion Submit] Received quoteId:", quoteId);

    // 1. Create order
    const preparedOrder = await sdk.createOrder(orderParams);

    // Debug: log prepared order object
    console.log("✅ [Fusion Submit] Prepared order object:", preparedOrder);
    console.log("PVTKEY::", PRIVATE_KEY);
    // 2. Submit order
    const result = await sdk.submitOrder(
      preparedOrder.order,
      preparedOrder.quoteId
    );

    // Debug: log submission result
    console.log("✅ [Fusion Submit] Order submitted, result:", result);

    const safeResult = JSON.parse(JSON.stringify(result, replacer));
    return res.status(200).json({
      success: true,
      orderHash: safeResult.orderHash,
      message: "Order submitted successfully to Fusion network",
    });
  } catch (error: any) {
    console.error("❌ [Fusion Submit] Error:", error);

    let errorMessage = "Failed to submit fusion order";
    if (error.message?.includes("insufficient balance")) {
      errorMessage = "Insufficient token balance for this swap";
    } else if (error.message?.includes("allowance")) {
      errorMessage = "Token allowance required before creating order";
    } else if (error.message?.includes("network")) {
      errorMessage = "Network error. Please try again";
    } else if (error.message?.includes("expired")) {
      errorMessage = "Quote expired. Please get a new quote";
    }
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message || "Unknown error occurred",
      stack: error.stack,
    });
  }
}
