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

  const { addresses } = req.query;

  if (!addresses) {
    return res.status(400).json({ error: "addresses parameter is required" });
  }

  if (!ONEINCH_KEY) {
    return res.status(500).json({ error: "1inch API key not configured" });
  }

  try {
    const response = await fetch(
      `${ONEINCH_BASE_URL}/portfolio/portfolio/v4/overview/erc20/current_value?addresses=${addresses}`,
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
    console.error("Portfolio overview API error:", error);
    res.status(500).json({ error: "Failed to fetch portfolio overview" });
  }
}
