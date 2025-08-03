// pages/api/proxy/1inch/portfolio-history.ts
import { NextApiRequest, NextApiResponse } from "next";

const ONEINCH_KEY = process.env.ONEINCH_KEY;
const ONEINCH_BASE_URL = "https://api.1inch.dev";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { addresses, start, end } = req.query;

  if (!addresses || !start || !end) {
    return res
      .status(400)
      .json({ error: "addresses, start, and end parameters are required" });
  }

  if (!ONEINCH_KEY) {
    return res.status(500).json({ error: "1inch API key not configured" });
  }

  try {
    const response = await fetch(
      `${ONEINCH_BASE_URL}/portfolio/portfolio/v4/general/value_chart?addresses=${addresses}&timerange=1week&chain_id=1&use_cache=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ONEINCH_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`1inch API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Portfolio history API error:", error);
    res.status(500).json({ error: "Failed to fetch portfolio history" });
  }
}
