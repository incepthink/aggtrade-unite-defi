// pages/api/proxy/1inch/fusion-plus/secret.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderHash, secret, srcChain, dstChain } = req.body;

    console.log("Received Fusion+ secret submission request:", {
      orderHash,
      secret: secret ? "***REDACTED***" : undefined,
      srcChain,
      dstChain,
    });

    // Validate required parameters
    if (!orderHash || !secret) {
      return res.status(400).json({
        error: "Missing required parameters: orderHash, secret",
      });
    }

    // Validate orderHash format
    if (
      typeof orderHash !== "string" ||
      orderHash.length !== 66 ||
      !orderHash.startsWith("0x")
    ) {
      return res.status(400).json({
        error:
          "Invalid orderHash format. Must be a 66-character hex string starting with 0x",
      });
    }

    // Validate secret format (should be 32-byte hex string)
    if (
      typeof secret !== "string" ||
      secret.length !== 66 ||
      !secret.startsWith("0x")
    ) {
      return res.status(400).json({
        error:
          "Invalid secret format. Must be a 66-character hex string starting with 0x",
      });
    }

    const url = "https://api.1inch.dev/fusion-plus/relayer/v1.0/order/secret";

    // Prepare payload for secret submission
    const payload = {
      orderHash: orderHash as `0x${string}`,
      secret: secret as `0x${string}`,
    };

    console.log("Fusion+ secret submission payload:", {
      orderHash: payload.orderHash,
      secret: "***REDACTED***",
    });

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
    console.log("1inch Fusion+ secret API response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText.length > 0 ? "Response received" : "Empty response",
    });

    if (!response.ok) {
      console.error("1inch Fusion+ secret submission error:", responseText);

      let errorMessage = "Failed to submit secret";
      if (response.status === 400) {
        errorMessage = "Invalid secret or orderHash";
      } else if (response.status === 401) {
        errorMessage = "Invalid API key";
      } else if (response.status === 403) {
        errorMessage = "Secret submission not allowed for this order";
      } else if (response.status === 404) {
        errorMessage = "Order not found";
      } else if (response.status === 429) {
        errorMessage = "Rate limit exceeded";
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: responseText,
      });
    }

    let data = {};
    if (responseText.length > 0) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        // For secret submission, empty response might be valid
        data = { success: true };
      }
    } else {
      // Empty response is often success for secret submissions
      data = { success: true };
    }

    // Add cross-chain specific metadata
    const result = {
      ...data,
      crossChainInfo: {
        srcChain,
        dstChain,
        orderHash,
        swapType: "fusion-plus",
        secretSubmitted: true,
      },
      metadata: {
        submittedAt: new Date().toISOString(),
        apiVersion: "v1.0",
      },
    };

    console.log("Fusion+ secret submitted successfully for order:", orderHash);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Fusion+ secret submission error:", error);
    res.status(500).json({
      error: "Failed to submit secret",
      details: error.message,
    });
  }
}
