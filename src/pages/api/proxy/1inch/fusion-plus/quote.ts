// pages/api/proxy/1inch/fusion-plus/quote.ts
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      srcChain,
      dstChain,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress,
      enableEstimate = true,
      fee,
      permit,
      source = "fusion-plus-api",
    } = req.body;

    // Validate required parameters
    if (
      !srcChain ||
      !dstChain ||
      !srcTokenAddress ||
      !dstTokenAddress ||
      !amount ||
      !walletAddress
    ) {
      return res.status(400).json({
        error:
          "Missing required parameters: srcChain, dstChain, srcTokenAddress, dstTokenAddress, amount, walletAddress",
      });
    }

    // Validate chain IDs are different for cross-chain
    if (srcChain === dstChain) {
      return res.status(400).json({
        error:
          "Source and destination chain IDs must be different for cross-chain swaps",
      });
    }

    // Validate amount is a valid number string
    if (!amount || amount === "0") {
      return res.status(400).json({
        error: "Amount must be greater than 0",
      });
    }

    const url = "https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/receive";

    const params = {
      srcChain: srcChain,
      dstChain: dstChain,
      srcTokenAddress: srcTokenAddress,
      dstTokenAddress: dstTokenAddress,
      amount: amount,
      walletAddress: walletAddress,
      enableEstimate: enableEstimate,
    };

    // Add optional parameters if provided
    // if (fee !== undefined) {
    //   params.fee = fee;
    // }
    // if (permit !== undefined) {
    //   params.permit = permit;
    // }

    console.log("Fusion+ quote request:", { url, params });

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
      },
      params: params,
    });

    if (response.status !== 200) {
      console.error("1inch Fusion+ quote error:", response.data);

      let errorMessage = "Failed to get Fusion+ quote";
      if (response.status === 400) {
        errorMessage = "Invalid parameters or cross-chain route not available";
      } else if (response.status === 401) {
        errorMessage = "Invalid API key";
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded";
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: response.data,
      });
    }

    const data = response.data;

    // Add cross-chain specific info to response
    const result = {
      ...data,
      crossChainInfo: {
        srcChain,
        dstChain,
        estimatedTime: "2-5 minutes", // Typical cross-chain time
        swapType: "fusion-plus",
        gasless: true,
        mevProtection: true,
      },
      metadata: {
        requestTime: new Date().toISOString(),
        apiVersion: "v1.0",
        enableEstimate,
      },
    };

    console.log("Fusion+ quote successful:", {
      srcChain,
      dstChain,
      quoteId: data.quoteId,
      estimatedAmount: data.dstTokenAmount,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Fusion+ quote error:", error);

    // Handle specific error cases
    if (error.response?.status === 400) {
      return res.status(400).json({
        error:
          "Cross-chain route not available for this token pair or insufficient liquidity",
        details: error.response.data,
      });
    } else if (error.response?.status === 404) {
      return res.status(404).json({
        error: "Token pair not supported for cross-chain swaps",
        details: error.response.data,
      });
    }

    res.status(500).json({
      error: "Failed to get Fusion+ quote",
      details: error.message,
    });
  }
}
