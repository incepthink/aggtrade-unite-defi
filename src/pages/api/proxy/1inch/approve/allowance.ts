// src/pages/api/proxy/1inch/approve/allowance.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tokenAddress, walletAddress } = req.query;

    const url = new URL("https://api.1inch.dev/swap/v5.2/1/approve/allowance");
    url.searchParams.set("tokenAddress", tokenAddress as string);
    url.searchParams.set("walletAddress", walletAddress as string);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Allowance check error:", error);
    res.status(500).json({ error: "Failed to check allowance" });
  }
}
