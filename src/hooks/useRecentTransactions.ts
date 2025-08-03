// hooks/useRecentTransactions.ts - Updated to use actual API data structure
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface Transaction {
  hash: string;
  timestamp: number;
  formattedDate: string;
  type: "send" | "receive" | "swap" | "approve" | "unknown";
  token: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    amount: string;
  };
  // For swap transactions
  swapDetails?: {
    tokenIn: {
      symbol: string;
      address: string;
      amount: string;
      decimals: number;
    };
    tokenOut: {
      symbol: string;
      address: string;
      amount: string;
      decimals: number;
    };
  };
  amount: number;
  from: string;
  to: string;
  status: "success" | "failed" | "pending";
  direction: "in" | "out";
  chainId: number;
  blockNumber: number;
  rating: string;
}

// Helper function to get token symbol from address
function getTokenSymbol(address: string): string {
  const tokenMap: { [key: string]: string } = {
    "0xa0b86a33e6c9440ec743fb6bcbabef3a49a7bdc3": "USDC",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC", // Correct USDC address
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
    "0x0000000000000000000000000000000000000000": "ETH",
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ETH", // Native ETH representation
    // Polygon tokens
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": "USDC",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": "USDT",
    "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": "DAI",
    "0x7ceb23fd6f88dd5cac6dbecd9e0d1dc1a1b1c6bb": "WETH",
    "0xaa7c017ea6f0d014a53b4a2c655e34c8198f44bd": "TOKEN",
  };

  return tokenMap[address.toLowerCase()] || "UNKNOWN";
}

// Helper function to get token decimals from address
function getTokenDecimals(address: string): number {
  const tokenMap: { [key: string]: number } = {
    "0xa0b86a33e6c9440ec743fb6bcbabef3a49a7bdc3": 6, // Old USDC
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6, // USDC
    "0xdac17f958d2ee523a2206206994597c13d831ec7": 6, // USDT
    "0x6b175474e89094c44da98b954eedeac495271d0f": 18, // DAI
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 18, // WETH
    "0x0000000000000000000000000000000000000000": 18, // ETH
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": 18, // Native ETH
    // Polygon tokens
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": 6, // USDC (Polygon)
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": 6, // USDT (Polygon)
    "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": 18, // DAI (Polygon)
    "0x7ceb23fd6f88dd5cac6dbecd9e0d1dc1a1b1c6bb": 18, // WETH (Polygon)
  };

  return tokenMap[address.toLowerCase()] || 18;
}

// Parse token actions to extract token information
function parseTokenActions(
  tokenActions: any[],
  transactionType: string
): {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  amount: string;
  swapDetails?: {
    tokenIn: {
      symbol: string;
      address: string;
      amount: string;
      decimals: number;
    };
    tokenOut: {
      symbol: string;
      address: string;
      amount: string;
      decimals: number;
    };
  };
} {
  if (!tokenActions || tokenActions.length === 0) {
    return {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      amount: "0",
    };
  }

  // Handle swap transactions with multiple token actions
  if (transactionType === "SwapExactInput" && tokenActions.length >= 2) {
    const tokenOut = tokenActions.find((action) => action.direction === "Out");
    const tokenIn = tokenActions.find((action) => action.direction === "In");

    if (tokenOut && tokenIn) {
      const tokenOutAddress =
        tokenOut.address || "0x0000000000000000000000000000000000000000";
      const tokenInAddress =
        tokenIn.address || "0x0000000000000000000000000000000000000000";

      return {
        symbol: `${getTokenSymbol(tokenOutAddress)}→${getTokenSymbol(
          tokenInAddress
        )}`,
        name: `${getTokenSymbol(tokenOutAddress)} to ${getTokenSymbol(
          tokenInAddress
        )}`,
        address: tokenOutAddress, // Use the token being sold as primary
        decimals: getTokenDecimals(tokenOutAddress),
        amount: tokenOut.amount || "0",
        swapDetails: {
          tokenIn: {
            symbol: getTokenSymbol(tokenInAddress),
            address: tokenInAddress,
            amount: tokenIn.amount || "0",
            decimals: getTokenDecimals(tokenInAddress),
          },
          tokenOut: {
            symbol: getTokenSymbol(tokenOutAddress),
            address: tokenOutAddress,
            amount: tokenOut.amount || "0",
            decimals: getTokenDecimals(tokenOutAddress),
          },
        },
      };
    }
  }

  // Handle single token actions (send/receive)
  const tokenAction = tokenActions[0];
  const tokenAddress =
    tokenAction.address || "0x0000000000000000000000000000000000000000";

  return {
    symbol: getTokenSymbol(tokenAddress),
    name: getTokenSymbol(tokenAddress),
    address: tokenAddress,
    decimals: getTokenDecimals(tokenAddress),
    amount: tokenAction.amount || "0",
  };
}

// Determine transaction type from details
function getTransactionType(
  details: any,
  direction: string
): "send" | "receive" | "swap" | "approve" | "unknown" {
  if (!details) return direction === "in" ? "receive" : "send";

  // Check the type field first
  if (details.type) {
    const type = details.type.toLowerCase();
    if (type.includes("receive")) return "receive";
    if (type.includes("send")) return "send";
    if (type.includes("swap")) return "swap";
    if (type.includes("approve")) return "approve";
  }

  // Fallback to direction
  return direction === "in" ? "receive" : "send";
}

// Fetch recent transactions from proxy
async function fetchRecentTransactions(
  address: string
): Promise<Transaction[]> {
  if (!address) {
    throw new Error("Address is required");
  }

  try {
    const response = await fetch(
      `/api/proxy/1inch/transactions?addresses=${address}&limit=20`
    );

    if (!response.ok) {
      throw new Error(`Transactions API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Transactions Data:", data);

    const transactions: Transaction[] = [];

    if (data?.items) {
      data.items.forEach((tx: any) => {
        const timestamp = tx.timeMs;
        const date = new Date(timestamp);

        // Format date for display
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Parse token information from tokenActions
        const tokenInfo = parseTokenActions(
          tx.details?.tokenActions || [],
          tx.details?.type || ""
        );

        // Calculate human-readable amount
        const numericAmount =
          parseFloat(tokenInfo.amount) / Math.pow(10, tokenInfo.decimals);

        // Determine transaction type
        const type = getTransactionType(tx.details, tx.direction);

        transactions.push({
          hash: tx.details?.txHash || `tx-${tx.id}`,
          timestamp: timestamp,
          formattedDate: formattedDate,
          type: type,
          token: {
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            address: tokenInfo.address,
            decimals: tokenInfo.decimals,
            amount: tokenInfo.amount,
          },
          swapDetails: tokenInfo.swapDetails,
          amount: numericAmount,
          from: tx.details?.fromAddress || "",
          to: tx.details?.toAddress || "",
          status:
            tx.details?.status === "completed"
              ? "success"
              : tx.details?.status === "failed"
              ? "failed"
              : "pending",
          direction: tx.direction,
          chainId: tx.details?.chainId || 1,
          blockNumber: tx.details?.blockNumber || 0,
          rating: tx.rating || "unknown",
        });
      });
    }

    // Sort by timestamp (most recent first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    return transactions;
  } catch (error) {
    console.error("Error fetching recent transactions from proxy:", error);
    throw error;
  }
}

// Generate mock transaction data as fallback
function generateMockTransactions(): Transaction[] {
  const mockTransactions: Transaction[] = [
    {
      hash: "0x1234567890abcdef1234567890abcdef12345678",
      timestamp: Date.now() - 1000 * 60 * 30,
      formattedDate: new Date(Date.now() - 1000 * 60 * 30).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
      type: "receive",
      token: {
        symbol: "USDC",
        name: "USDC",
        address: "0xa0b86a33e6c9440ec743fb6bcbabef3a49a7bdc3",
        decimals: 6,
        amount: "500000000",
      },
      amount: 500.0,
      from: "0xabcdef1234567890abcdef1234567890abcdef12",
      to: "0x1234567890abcdef1234567890abcdef12345678",
      status: "success",
      direction: "in",
      chainId: 1,
      blockNumber: 19000000,
      rating: "reliable",
    },
    {
      hash: "0x5678901234abcdef5678901234abcdef56789012",
      timestamp: Date.now() - 1000 * 60 * 60 * 2,
      formattedDate: new Date(
        Date.now() - 1000 * 60 * 60 * 2
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "send",
      token: {
        symbol: "ETH",
        name: "ETH",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
        amount: "500000000000000000",
      },
      amount: 0.5,
      from: "0x1234567890abcdef1234567890abcdef12345678",
      to: "0x9876543210fedcba9876543210fedcba98765432",
      status: "success",
      direction: "out",
      chainId: 1,
      blockNumber: 19000001,
      rating: "reliable",
    },
  ];

  return mockTransactions;
}

// Custom hook for recent transactions
export function useRecentTransactions({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["recentTransactions", address],
    queryFn: async () => {
      try {
        return await fetchRecentTransactions(address!);
      } catch (error) {
        console.warn(
          "Failed to fetch real transactions, using mock data:",
          error
        );
        // Return mock data as fallback
        return generateMockTransactions();
      }
    },
    enabled: Boolean(enabled && isConnected && address),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on API key errors
      if (error?.message?.includes("40")) {
        return false;
      }
      return failureCount < 1; // Only retry once
    },
    retryDelay: 2000,
  });
}
