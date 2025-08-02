// pages/api/proxy/1inch/fusion/order.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { order, signature, extension, quoteId } = req.body;

    console.log("Received order submission request:", {
      order,
      signature,
      extension,
      quoteId,
    });

    // Validate required parameters
    if (!order || !signature || !quoteId) {
      return res.status(400).json({
        error: "Missing required parameters: order, signature, quoteId",
      });
    }

    // Validate order structure
    const requiredOrderFields = [
      "salt",
      "makerAsset",
      "takerAsset",
      "maker",
      "receiver",
      "makingAmount",
      "takingAmount",
      "makerTraits",
    ];
    for (const field of requiredOrderFields) {
      if (!(field in order)) {
        return res.status(400).json({
          error: `Missing required order field: ${field}`,
        });
      }
    }

    // Validate addresses are not empty or just "0x"
    const addressFields = ["makerAsset", "takerAsset", "maker", "receiver"];
    for (const field of addressFields) {
      if (
        !order[field] ||
        order[field] === "0x" ||
        order[field].length !== 42
      ) {
        return res.status(400).json({
          error: `Invalid address for field ${field}: ${order[field]}`,
        });
      }
    }

    // Convert native ETH to WETH for Fusion compatibility (if needed)
    const NATIVE_ETH = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

    const adjustedOrder = {
      ...order,
      makerAsset:
        order.makerAsset.toLowerCase() === NATIVE_ETH.toLowerCase()
          ? WETH
          : order.makerAsset,
      takerAsset:
        order.takerAsset.toLowerCase() === NATIVE_ETH.toLowerCase()
          ? WETH
          : order.takerAsset,
    };

    const url = "https://api.1inch.dev/fusion/relayer/v2.0/1/order/submit";

    // Prepare payload - for basic orders, extension should contain encoded empty data
    // Using simpler empty bytes encoding
    const payload = {
      order: {
        salt: adjustedOrder.salt as `0x${string}`,
        makerAsset: adjustedOrder.makerAsset as `0x${string}`,
        takerAsset: adjustedOrder.takerAsset as `0x${string}`,
        maker: adjustedOrder.maker as `0x${string}`,
        receiver: adjustedOrder.receiver as `0x${string}`,
        makingAmount: adjustedOrder.makingAmount,
        takingAmount: adjustedOrder.takingAmount,
        makerTraits: adjustedOrder.makerTraits,
      },
      signature: signature as `0x${string}`,
      quoteId: quoteId,
      extension:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
    };

    console.log(
      "Fusion order submission payload:",
      JSON.stringify(payload, null, 2)
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log("1inch API response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    if (!response.ok) {
      console.error("1inch Fusion order error:", responseText);

      let errorMessage = "Failed to submit fusion order";
      if (response.status === 400) {
        errorMessage = "Invalid order parameters or signature";
      } else if (response.status === 401) {
        errorMessage = "Invalid API key";
      } else if (response.status === 403) {
        errorMessage = "Order rejected by 1inch";
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded";
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: responseText,
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response:", parseError);
      return res.status(500).json({
        error: "Invalid response from 1inch API",
        details: responseText,
      });
    }

    console.log("Fusion order submitted successfully:", data);
    res.status(200).json(data);
  } catch (error: any) {
    console.error("Fusion order submission error:", error);
    res.status(500).json({
      error: "Failed to submit fusion order",
      details: error.message,
    });
  }
}
