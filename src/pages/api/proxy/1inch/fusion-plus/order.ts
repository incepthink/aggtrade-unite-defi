// pages/api/proxy/1inch/fusion-plus/order.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { order, signature, extension, quoteId, srcChain, dstChain } =
      req.body;

    console.log("Received Fusion+ order submission request:", {
      order,
      signature,
      extension,
      quoteId,
      srcChain,
      dstChain,
    });

    // Validate required parameters
    if (!order || !signature || !quoteId) {
      return res.status(400).json({
        error: "Missing required parameters: order, signature, quoteId",
      });
    }

    // Validate order structure for Fusion+
    // const requiredOrderFields = [
    //   "salt",
    //   "makerAsset",
    //   "takerAsset",
    //   "maker",
    //   "receiver",
    //   "makingAmount",
    //   "takingAmount",
    //   "makerTraits",
    // ];

    // for (const field of requiredOrderFields) {
    //   if (!(field in order)) {
    //     return res.status(400).json({
    //       error: `Missing required order field: ${field}`,
    //     });
    //   }
    // }

    // Validate addresses are not empty or just "0x"
    // const addressFields = ["makerAsset", "takerAsset", "maker", "receiver"];
    // for (const field of addressFields) {
    //   if (
    //     !order[field] ||
    //     order[field] === "0x" ||
    //     order[field].length !== 42
    //   ) {
    //     return res.status(400).json({
    //       error: `Invalid address for field ${field}: ${order[field]}`,
    //     });
    //   }
    // }

    const url = "https://api.1inch.dev/fusion-plus/relayer/v1.0/submit";

    // Prepare payload for Fusion+ cross-chain order
    const payload = {
      order: {
        salt: order.message.salt,
        makerAsset: order.message.makerAsset,
        takerAsset: order.message.takerAsset,
        maker: order.message.maker,
        receiver: order.message.receiver,
        makingAmount: order.message.makingAmount,
        takingAmount: order.message.takingAmount,
        makerTraits: order.message.makerTraits,
      },
      signature: signature,
      quoteId: quoteId,
      extension,
      srcChainId: srcChain,
    };

    console.log(
      "Fusion+ order submission payload:",
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
    console.log("1inch Fusion+ API response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    if (!response.ok) {
      console.error("1inch Fusion+ order error:", responseText);

      let errorMessage = "Failed to submit Fusion+ order";
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
        error: "Invalid response from 1inch Fusion+ API",
        details: responseText,
      });
    }

    // Add cross-chain specific metadata
    const result = {
      ...data,
      crossChainInfo: {
        srcChain,
        dstChain,
        swapType: "fusion-plus",
        gasless: true,
        mevProtection: true,
      },
      metadata: {
        submittedAt: new Date().toISOString(),
        apiVersion: "v1.0",
      },
    };

    console.log("Fusion+ order submitted successfully:", result);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Fusion+ order submission error:", error);
    res.status(500).json({
      error: "Failed to submit Fusion+ order",
      details: error.message,
    });
  }
}
