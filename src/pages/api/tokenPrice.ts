// src/pages/api/tokenPrice.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ethers } from "ethers";

interface TokenPriceResponse {
  status: string;
  data?: {
    tokenOne: number;
    tokenTwo: number;
    ratio: number;
  };
  msg?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenPriceResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", msg: "Method not allowed" });
  }

  try {
    let { addressOne, addressTwo, chainId = "1" } = req.query;

    // Validate presence
    if (!addressOne || !addressTwo) {
      return res.status(400).json({
        status: "error",
        msg: "Both `addressOne` and `addressTwo` must be provided",
      });
    }

    // Validate address format
    if (
      !ethers.isAddress(addressOne as string) ||
      !ethers.isAddress(addressTwo as string)
    ) {
      return res.status(422).json({
        status: "error",
        msg: "One or both addresses are not valid EVM addresses",
      });
    }

    // Get prices from 1inch Spot Price API
    // Both tokens will return their price in the chain's native currency (ETH for Ethereum)
    const [responseOne, responseTwo] = await Promise.all([
      fetch(`https://api.1inch.dev/price/v1.1/${chainId}/${addressOne}`, {
        headers: { Authorization: `Bearer ${process.env.ONEINCH_KEY}` },
      }),
      fetch(`https://api.1inch.dev/price/v1.1/${chainId}/${addressTwo}`, {
        headers: { Authorization: `Bearer ${process.env.ONEINCH_KEY}` },
      }),
    ]);

    if (!responseOne.ok || !responseTwo.ok) {
      throw new Error("Failed to fetch prices from 1inch API");
    }

    const [dataOne, dataTwo] = await Promise.all([
      responseOne.json(),
      responseTwo.json(),
    ]);

    // Extract prices - 1inch returns: { "0x...": "price_in_eth" }
    const priceOne = parseFloat(dataOne[addressOne as string]);
    const priceTwo = parseFloat(dataTwo[addressTwo as string]);

    // Calculate ratio: how many tokenTwo you get for 1 tokenOne
    // Since both prices are in ETH, ratio = priceOne / priceTwo
    const ratio = priceTwo > 0 ? priceOne / priceTwo : 0;

    const data = {
      tokenOne: priceOne, // Price of tokenOne in ETH
      tokenTwo: priceTwo, // Price of tokenTwo in ETH
      ratio: ratio, // How many tokenTwo per tokenOne
    };

    res.status(200).json({ status: "success", data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    res.status(500).json({ status: "error", msg: message });
  }
}
