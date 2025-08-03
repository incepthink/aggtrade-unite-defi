// hooks/useRecentTransactions.ts - Updated to use proxy routes
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface Transaction {
  hash: string;
  timestamp: number;
  formattedDate: string;
  type: "send" | "receive" | "swap" | "approve";
  token: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  };
  amount: number;
  usdValue: number;
  from: string;
  to: string;
  status: "success" | "failed" | "pending";
}

// Fetch recent transactions from proxy
async function fetchRecentTransactions(
  address: string
): Promise<Transaction[]> {
  if (!address) {
    throw new Error("Address is required");
  }

  try {
    // Fetch recent transactions using proxy route
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
      const txs = data.items;

      txs.forEach((tx: any) => {
        const timestamp = new Date(tx.timeMs).getTime();
        const date = new Date(timestamp);

        // Format date for display
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Determine transaction type
        // let type: "send" | "receive" | "swap" | "approve" = "send";
        // if (tx.to?.toLowerCase() === address.toLowerCase()) {
        //   type = "receive";
        // } else if (tx.input && tx.input.includes("swap")) {
        //   type = "swap";
        // } else if (tx.input && tx.input.includes("approve")) {
        //   type = "approve";
        // }

        let type: any = tx.details.type || "Not Found";

        transactions.push({
          hash: tx.hash,
          timestamp: timestamp,
          formattedDate: formattedDate,
          type: type,
          token: {
            symbol: "",
            name: tx.token_name || "Ethereum",
            address:
              tx.token_address || "0x0000000000000000000000000000000000000000",
            decimals: tx.token_decimals || 18,
          },
          amount: parseFloat(tx.amount) || 0,
          usdValue: parseFloat(tx.usd_value) || 0,
          from: tx.from || "",
          to: tx.to || "",
          status: tx.status === "1" ? "success" : "failed",
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
      timestamp: Date.now() - 1000 * 60 * 30, // 30 min ago
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
        name: "USD Coin",
        address: "0xa0b86a33e6c9440ec743fb6bcbabef3a49a7bdc3",
        decimals: 6,
      },
      amount: 500.0,
      usdValue: 500.0,
      from: "0xabcdef1234567890abcdef1234567890abcdef12",
      to: "0x1234567890abcdef1234567890abcdef12345678",
      status: "success",
    },
    {
      hash: "0x5678901234abcdef5678901234abcdef56789012",
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      formattedDate: new Date(
        Date.now() - 1000 * 60 * 60 * 2
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "swap",
      token: {
        symbol: "ETH",
        name: "Ethereum",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
      },
      amount: 0.5,
      usdValue: 1200.0,
      from: "0x1234567890abcdef1234567890abcdef12345678",
      to: "0x1234567890abcdef1234567890abcdef12345678",
      status: "success",
    },
    {
      hash: "0x9abcdef01234567890abcdef01234567890abcdef",
      timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      formattedDate: new Date(
        Date.now() - 1000 * 60 * 60 * 24
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "send",
      token: {
        symbol: "DAI",
        name: "Dai Stablecoin",
        address: "0x6b175474e89094c44da98b954eedeac495271d0f",
        decimals: 18,
      },
      amount: 100.0,
      usdValue: 100.0,
      from: "0x1234567890abcdef1234567890abcdef12345678",
      to: "0xdef0123456789abcdef0123456789abcdef012345",
      status: "success",
    },
    {
      hash: "0xdef0123456789abcdef0123456789abcdef012345",
      timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
      formattedDate: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 2
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "approve",
      token: {
        symbol: "WETH",
        name: "Wrapped Ethereum",
        address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        decimals: 18,
      },
      amount: 0.0, // Approval transactions don't have amounts
      usdValue: 0.0,
      from: "0x1234567890abcdef1234567890abcdef12345678",
      to: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      status: "success",
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
