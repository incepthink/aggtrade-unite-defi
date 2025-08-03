// hooks/useSpotBalance.ts - Updated to use proxy routes
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface TokenBalance {
  symbol: string;
  balance: number;
  contractAddress: string;
  decimals: number;
  name: string;
  logo?: string;
  price: number;
  usdValue: number;
}

export interface SpotBalanceData {
  totalUsd: number;
  tokens: TokenBalance[];
}

// Type for token price mapping
type TokenPriceMap = Record<string, string | number>;

// Fetch portfolio overview from proxy
async function fetchPortfolioOverview(address: string) {
  try {
    const response = await fetch(
      `/api/proxy/1inch/portfolio-overview?addresses=${address}`
    );

    if (!response.ok) {
      throw new Error(`Portfolio overview API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching portfolio overview:", error);
    throw error;
  }
}

// Fetch detailed token balances from proxy
async function fetchDetailedBalances(address: string) {
  try {
    const response = await fetch(
      `/api/proxy/1inch/portfolio-detailed?addresses=${address}`
    );

    if (!response.ok) {
      throw new Error(`Detailed balances API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching detailed balances:", error);
    throw error;
  }
}

// Fetch current token prices from proxy
export async function fetchTokenPrices(
  tokenAddresses: string[]
): Promise<TokenPriceMap> {
  try {
    if (tokenAddresses.length === 0) return {};

    const addressesParam = tokenAddresses.join(",");
    const response = await fetch(
      `/api/proxy/1inch/token-prices?tokens=${addressesParam}`
    );

    if (!response.ok) {
      throw new Error(`Token prices API error: ${response.status}`);
    }

    const data: TokenPriceMap = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return {};
  }
}

// Main function to fetch spot balance data using proxy routes
async function fetchSpotBalance(address: string): Promise<SpotBalanceData> {
  if (!address) {
    throw new Error("Address is required");
  }

  try {
    // 1. Fetch portfolio overview and detailed balances in parallel
    const [overviewData, detailedData] = await Promise.allSettled([
      fetchPortfolioOverview(address),
      fetchDetailedBalances(address),
    ]);

    console.log("Portfolio Overview Result:", overviewData);
    console.log("Detailed Balances Result:", detailedData);

    const tokens: TokenBalance[] = [];
    let totalUsdValue = 0;

    // Process detailed balance data if successful
    if (detailedData.status === "fulfilled" && detailedData.value?.result) {
      const tokenList = detailedData.value.result;

      // Process each token balance
      tokenList.forEach((tokenData: any) => {
        if (tokenData.chain_id === 1) {
          const readableBalance = parseFloat(tokenData.amount);
          const usdValue = parseFloat(tokenData.value_usd) || 0;
          const currentPrice =
            readableBalance > 0 ? usdValue / readableBalance : 0;

          // Only include tokens with meaningful value (>$0.01)
          if (usdValue > 0.01) {
            tokens.push({
              symbol: tokenData.symbol || "UNKNOWN",
              balance: readableBalance,
              contractAddress: tokenData.contract_address,
              decimals: getTokenDecimals(
                tokenData.contract_address,
                tokenData.symbol
              ),
              name: tokenData.name || "Unknown Token",
              logo: tokenData.logo,
              price: currentPrice,
              usdValue: usdValue,
            });
          }

          totalUsdValue += usdValue;
        }
      });
    }

    // Helper function to get token decimals
    // function getTokenDecimals(contractAddress: string, symbol: string): number {
    //   const commonDecimals: { [key: string]: number } = {
    //     'USDC': 6,
    //     'USDT': 6,
    //     'DAI': 18,
    //     'WETH': 18,
    //     'ETH': 18,
    //   };
    //   return commonDecimals[symbol] || 18;
    // } = {
    //         balance: readableBalance,
    //         price: currentPrice,
    //         usdValue: usdValue,
    //       };
    //     } else {
    //       // Only include tokens with meaningful value (>$0.01)
    //       if (usdValue > 0.01) {
    //         tokens.push({
    //           symbol: tokenData.symbol || "UNKNOWN",
    //           balance: readableBalance,
    //           contractAddress: tokenData.contract_address,
    //           decimals: decimals,
    //           name: tokenData.name || "Unknown Token",
    //           logo: tokenData.logo,
    //           price: currentPrice,
    //           usdValue: usdValue,
    //         });
    //       }
    //     }

    //     totalUsdValue += usdValue;
    //   });
    // }

    // Helper function to get token decimals
    function getTokenDecimals(contractAddress: string, symbol: string): number {
      const commonDecimals: { [key: string]: number } = {
        USDC: 6,
        USDT: 6,
        DAI: 18,
        WETH: 18,
        ETH: 18,
      };
      return commonDecimals[symbol] || 18;
    }

    // If we have overview data, use it as a fallback for total value
    // if (
    //   overviewData.status === "fulfilled" &&
    //   overviewData.value?.result?.[address]?.absoluteUsdValue
    // ) {
    //   const overviewTotal = parseFloat(
    //     overviewData.value.result[address].absoluteUsdValue
    //   );
    //   // Use the higher value between calculated and overview (more accurate)
    //   totalUsdValue = Math.max(totalUsdValue, overviewTotal);
    // }

    // Sort tokens by USD value (descending)
    tokens.sort((a, b) => b.usdValue - a.usdValue);

    return {
      totalUsd: totalUsdValue,
      tokens,
    };
  } catch (error) {
    console.error("Error fetching spot balance from proxy:", error);
    throw error;
  }
}

// Custom hook with TanStack Query
export function useSpotBalance() {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["spotBalance", address],
    queryFn: () => fetchSpotBalance(address!),
    enabled: Boolean(isConnected && address),
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache time
    refetchOnWindowFocus: false, // Prevent unnecessary API calls
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (likely API key issues)
      if (error?.message?.includes("40")) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

// Additional hook for just the total balance (lighter weight)
export function useSpotBalanceTotal() {
  const { data, isLoading, error } = useSpotBalance();

  return {
    totalUsd: data?.totalUsd || 0,
    isLoading,
    error,
  };
}

// Hook for getting specific token data
export function useTokenBalance(tokenAddress: string) {
  const { data, isLoading, error } = useSpotBalance();

  const token = data?.tokens.find(
    (t) => t.contractAddress.toLowerCase() === tokenAddress.toLowerCase()
  );

  return {
    token: token || null,
    isLoading,
    error,
  };
}

// Hook for ETH balance specifically
export function useEthBalance() {
  const { data, isLoading, error } = useSpotBalance();

  return {
    ethBalance: 0 || { balance: 0, price: 0, usdValue: 0 },
    isLoading,
    error,
  };
}
