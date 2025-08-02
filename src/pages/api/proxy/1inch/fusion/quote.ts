// pages/api/proxy/1inch/fusion/quote.ts
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
    const { fromTokenAddress, toTokenAddress, amount, walletAddress } =
      req.body;

    if (!fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
      return res.status(400).json({
        error:
          "Missing required parameters: fromTokenAddress, toTokenAddress, amount, walletAddress",
      });
    }

    // Convert native ETH to WETH for Fusion compatibility
    const NATIVE_ETH = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

    const adjustedFromToken =
      fromTokenAddress.toLowerCase() === NATIVE_ETH.toLowerCase()
        ? WETH
        : fromTokenAddress;
    const adjustedToToken =
      toTokenAddress.toLowerCase() === NATIVE_ETH.toLowerCase()
        ? WETH
        : toTokenAddress;

    const url = "https://api.1inch.dev/fusion/quoter/v2.0/1/quote/receive";

    const payload = {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        "Content-Type": "application/json",
      },
      params: {
        fromTokenAddress: adjustedFromToken,
        toTokenAddress: adjustedToToken,
        amount: amount,
        walletAddress: walletAddress,
        enableEstimate: true,
        source: "fusion-api",
      },
    };

    console.log("Fusion quote request:", payload);

    const response = await axios.get(url, payload);

    // if (!response.status) {
    //   // const errorText = await response.text();
    //   console.error("1inch Fusion quote error:", response.data);

    //   let errorMessage = "Failed to get fusion quote";
    //   if (response.status === 400) {
    //     errorMessage = "Invalid parameters or token pair not supported";
    //   } else if (response.status === 401) {
    //     errorMessage = "Invalid API key";
    //   } else if (response.status === 429) {
    //     errorMessage = "Rate limit exceeded";
    //   }

    //   return res.status(response.status).json({
    //     error: errorMessage,
    //     details: response.data,
    //   });
    // }

    const data = response.data;

    // Add token conversion info to response
    const result = {
      ...data,
      tokenConversion: {
        originalFromToken: fromTokenAddress,
        originalToToken: toTokenAddress,
        adjustedFromToken,
        adjustedToToken,
        convertedETHtoWETH:
          fromTokenAddress.toLowerCase() === NATIVE_ETH.toLowerCase() ||
          toTokenAddress.toLowerCase() === NATIVE_ETH.toLowerCase(),
      },
    };

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Fusion quote error:", error);
    res.status(500).json({
      error: "Failed to get fusion quote",
      details: error.message,
    });
  }
}
