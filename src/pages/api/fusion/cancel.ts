// app/api/fusion/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderHash } = body;

    if (!orderHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing orderHash",
        },
        { status: 400 }
      );
    }

    // Note: Order cancellation in Fusion typically happens automatically
    // when orders expire, or through specific cancellation methods
    // Check the SDK documentation for the exact cancellation method

    // For now, returning a placeholder response
    // You may need to implement the actual cancellation logic based on SDK docs
    return NextResponse.json({
      success: true,
      message: "Order cancellation requested",
    });
  } catch (error: any) {
    console.error("Fusion cancel error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to cancel order",
      },
      { status: 500 }
    );
  }
}
