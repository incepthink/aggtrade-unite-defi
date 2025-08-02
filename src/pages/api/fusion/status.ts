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
  return typeof value === "bigint" ? value.toString() : value;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { orderHash } = req.query;

  // Debug: log incoming query
  console.log("🔹 [Fusion Status] Query:", req.query);

  if (!orderHash || typeof orderHash !== "string") {
    console.warn("❗ [Fusion Status] Missing or invalid orderHash:", orderHash);
    return res
      .status(400)
      .json({ success: false, error: "Missing or invalid orderHash" });
  }

  try {
    const status = await sdk.getOrderStatus(orderHash);

    // Debug: log fetched status
    console.log("✅ [Fusion Status] Fetched order status:", status);

    const safeStatus = JSON.parse(JSON.stringify(status, replacer));
    return res.status(200).json({ success: true, status: safeStatus });
  } catch (error: any) {
    console.error("❌ [Fusion Status] Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to get order status",
      stack: error.stack,
    });
  }
}
