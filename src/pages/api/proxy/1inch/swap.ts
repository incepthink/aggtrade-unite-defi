// src/pages/api/proxy/1inch/swap.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { src, dst, amount, from, slippage } = req.query;

    const url = new URL("https://api.1inch.dev/swap/v5.2/1/swap");
    url.searchParams.set("src", src as string);
    url.searchParams.set("dst", dst as string);
    url.searchParams.set("amount", amount as string);
    url.searchParams.set("from", from as string);
    url.searchParams.set("slippage", slippage as string);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("1inch swap error:", errorText);
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Swap error:", error);
    res.status(500).json({ error: "Failed to get swap data" });
  }
}
