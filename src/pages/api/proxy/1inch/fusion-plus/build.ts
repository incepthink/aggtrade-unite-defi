// pages/api/proxy/1inch/fusion-plus/build.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      quote,
      srcChain,
      dstChain,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress,
    } = req.body;

    // Validate required parameters
    if (
      !quote ||
      !srcChain ||
      !dstChain ||
      !srcTokenAddress ||
      !dstTokenAddress ||
      !amount ||
      !walletAddress
    ) {
      return res.status(400).json({
        error:
          "Missing required parameters: quote, srcChain, dstChain, srcTokenAddress, dstTokenAddress, amount, walletAddress",
      });
    }

    // Validate quote structure
    if (!quote.quoteId) {
      return res.status(400).json({
        error: "Invalid quote object - missing quoteId",
      });
    }

    const url = new URL(
      "https://api.1inch.dev/fusion-plus/quoter/v1.0/quote/build"
    );

    // Add ALL required parameters as query params (per documentation)
    url.searchParams.append("srcChain", srcChain.toString());
    url.searchParams.append("dstChain", dstChain.toString());
    url.searchParams.append("srcTokenAddress", srcTokenAddress);
    url.searchParams.append("dstTokenAddress", dstTokenAddress);
    url.searchParams.append("amount", amount.toString());
    url.searchParams.append("walletAddress", walletAddress);

    // Generate a simple secretsHashList (you might need to adjust this based on your needs)
    const secretsHashList = [
      "0x315b47a8c3780434b153667588db4ca628526e20000000000000000000000000",
    ];

    // Body should contain the quote object and secretsHashList
    const body = {
      quote: quote,
      secretsHashList: secretsHashList,
    };

    console.log("Fusion+ build request:", {
      url: url.toString(),
      params: {
        srcChain,
        dstChain,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        walletAddress,
      },
      bodyKeys: Object.keys(body),
      quoteId: quote.quoteId,
    });

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ONEINCH_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log("1inch Fusion+ build API response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    if (!response.ok) {
      console.error("1inch Fusion+ build error:", responseText);

      let errorMessage = "Failed to build Fusion+ order";
      if (response.status === 400) {
        errorMessage = "Invalid build parameters";

        // Log the exact error for debugging
        console.log("Build error details:", {
          requestParams: {
            srcChain,
            dstChain,
            srcTokenAddress,
            dstTokenAddress,
            amount,
            walletAddress,
          },
          requestBody: body,
          responseBody: responseText,
        });
      } else if (response.status === 401) {
        errorMessage = "Invalid API key";
      } else if (response.status === 404) {
        errorMessage = "Quote not found or expired";
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
      console.error("Failed to parse build response:", parseError);
      return res.status(500).json({
        error: "Invalid response from 1inch Fusion+ build API",
        details: responseText,
      });
    }

    console.log("Fusion+ order built successfully:", {
      hasOrder: !!data.order,
      hasExtension: !!data.extension,
      orderFields: data.order ? Object.keys(data.order) : [],
      extensionLength: data.extension ? data.extension.length : 0,
    });

    res.status(200).json(data);
  } catch (error: any) {
    console.error("Fusion+ build error:", error);
    res.status(500).json({
      error: "Failed to build Fusion+ order",
      details: error.message,
    });
  }
}
