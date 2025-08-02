// src/pages/api/proxy/1inch/approve/transaction.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tokenAddress } = req.query;

    const url = new URL(
      "https://api.1inch.dev/swap/v5.2/1/approve/transaction"
    );
    url.searchParams.set("tokenAddress", tokenAddress as string);

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
    console.error("Approve transaction error:", error);
    res.status(500).json({ error: "Failed to get approve transaction" });
  }
}
