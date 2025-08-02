// src/hooks/useTokens.ts
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Address } from "viem";

// Enhanced Token interface with chainId
export interface Token {
  ticker: string;
  img: string;
  name: string;
  address: Address;
  decimals: number;
  chainId?: number; // Optional for backward compatibility
}

// 1inch API response type
interface OneInchToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
}

interface OneInchTokensResponse {
  tokens: Record<string, OneInchToken>;
}

// Chain configuration type
export interface ChainConfig {
  name: string;
  symbol: string;
  icon: string;
  rpc: string;
}

// Chain configurations for cross-chain support
export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    name: "Ethereum",
    symbol: "ETH",
    icon: "🔷",
    rpc: "https://ethereum-rpc.publicnode.com",
  },
  10: {
    name: "Optimism",
    symbol: "OP",
    icon: "🔴",
    rpc: "https://optimism-rpc.publicnode.com",
  },
  56: {
    name: "BNB Chain",
    symbol: "BNB",
    icon: "🟡",
    rpc: "https://bsc-rpc.publicnode.com",
  },
  137: {
    name: "Polygon",
    symbol: "MATIC",
    icon: "🟣",
    rpc: "https://polygon-rpc.publicnode.com",
  },
  8453: {
    name: "Base",
    symbol: "BASE",
    icon: "🔵",
    rpc: "https://base-rpc.publicnode.com",
  },
  42161: {
    name: "Arbitrum",
    symbol: "ARB",
    icon: "🔶",
    rpc: "https://arbitrum-rpc.publicnode.com",
  },
  43114: {
    name: "Avalanche",
    symbol: "AVAX",
    icon: "🔺",
    rpc: "https://avalanche-rpc.publicnode.com",
  },
} as const;

// Convert 1inch token to your Token interface
const convertOneInchToken = (
  oneInchToken: OneInchToken,
  chainId?: number
): Token => ({
  ticker: oneInchToken.symbol,
  img:
    oneInchToken.logoURI ||
    `https://token-icons.1inch.io/${oneInchToken.address}.png`,
  name: oneInchToken.name,
  address: oneInchToken.address as Address,
  decimals: oneInchToken.decimals,
  chainId: chainId,
});

// Fetch tokens from your Next.js API route (backward compatible - defaults to Ethereum)
const fetchTokens = async (chainId: number = 1): Promise<Token[]> => {
  try {
    const { data } = await axios.get<OneInchTokensResponse>(
      `/api/tokens${chainId !== 1 ? `?chainId=${chainId}` : ""}`
    );
    console.log(`Tokens loaded for chain ${chainId}:`, data);

    return Object.values(data).map((token) =>
      convertOneInchToken(token, chainId)
    );
  } catch (error) {
    console.error(`Failed to fetch tokens for chain ${chainId}:`, error);
    throw error;
  }
};

// Main hook to get all tokens (backward compatible)
export const useTokens = (chainId: number = 1) => {
  return useQuery({
    queryKey: ["tokens", chainId],
    queryFn: () => fetchTokens(chainId),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 3,
    refetchOnWindowFocus: false,
    enabled: !!chainId && chainId in SUPPORTED_CHAINS,
  });
};

// Hook to get popular tokens for a specific chain
export const usePopularTokens = (chainId: number = 1) => {
  const { data: tokens, ...rest } = useTokens(chainId);

  // Chain-specific popular tokens
  const getPopularSymbolsForChain = (chainId: number): string[] => {
    switch (chainId) {
      case 1: // Ethereum
        return ["ETH", "WETH", "USDC", "USDT", "WBTC", "DAI", "UNI", "LINK"];
      case 56: // BNB Chain
        return ["BNB", "WBNB", "USDC", "USDT", "BUSD", "CAKE", "XVS", "ADA"];
      case 137: // Polygon
        return [
          "MATIC",
          "WMATIC",
          "USDC",
          "USDT",
          "DAI",
          "WETH",
          "WBTC",
          "QUICK",
        ];
      case 42161: // Arbitrum
        return ["ETH", "WETH", "USDC", "USDT", "ARB", "GMX", "MAGIC", "DPX"];
      case 10: // Optimism
        return ["ETH", "WETH", "USDC", "USDT", "OP", "SNX", "VELO", "THALES"];
      case 8453: // Base
        return [
          "ETH",
          "WETH",
          "USDC",
          "USDbC",
          "DAI",
          "cbBTC",
          "AERO",
          "PRIME",
        ];
      case 43114: // Avalanche
        return ["AVAX", "WAVAX", "USDC", "USDT", "DAI", "WETH", "JOE", "PNG"];
      default:
        return ["ETH", "WETH", "USDC", "USDT", "WBTC", "DAI"];
    }
  };

  const popularSymbols = getPopularSymbolsForChain(chainId);

  const popularTokens = tokens
    ?.filter((token) => popularSymbols.includes(token.ticker.toUpperCase()))
    .sort((a, b) => {
      const aIndex = popularSymbols.indexOf(a.ticker.toUpperCase());
      const bIndex = popularSymbols.indexOf(b.ticker.toUpperCase());
      return aIndex - bIndex;
    });

  return {
    ...rest,
    data: popularTokens || [],
  };
};

// New hook specifically for cross-chain token lists
export const useCrossChainTokens = () => {
  const chainIds = Object.keys(SUPPORTED_CHAINS).map(Number);

  const queries = useQuery({
    queryKey: ["crossChainTokens"],
    queryFn: async () => {
      const allChainTokens: Record<number, Token[]> = {};

      // Fetch tokens for all supported chains
      const promises = chainIds.map(async (chainId) => {
        try {
          const tokens = await fetchTokens(chainId);
          allChainTokens[chainId] = tokens;
        } catch (error) {
          console.warn(`Failed to fetch tokens for chain ${chainId}:`, error);
          allChainTokens[chainId] = []; // Empty array for failed chains
        }
      });

      await Promise.allSettled(promises);
      return allChainTokens;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 45, // 45 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return queries;
};

// Hook to get tokens for multiple specific chains
export const useMultiChainTokens = (chainIds: number[]) => {
  return useQuery({
    queryKey: ["multiChainTokens", chainIds.sort()],
    queryFn: async () => {
      const chainTokens: Record<number, Token[]> = {};

      const promises = chainIds.map(async (chainId) => {
        try {
          const tokens = await fetchTokens(chainId);
          chainTokens[chainId] = tokens;
        } catch (error) {
          console.warn(`Failed to fetch tokens for chain ${chainId}:`, error);
          chainTokens[chainId] = [];
        }
      });

      await Promise.allSettled(promises);
      return chainTokens;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    enabled: chainIds.length > 0,
  });
};

// Helper function to get a token's display name with chain
export const getTokenDisplayName = (token: Token): string => {
  if (!token.chainId || token.chainId === 1) {
    return token.name;
  }

  const chain =
    SUPPORTED_CHAINS[token.chainId as keyof typeof SUPPORTED_CHAINS];
  return `${token.name} (${chain?.name || `Chain ${token.chainId}`})`;
};

// Helper function to get chain info (now type-safe)
export const getChainInfo = (chainId: number): ChainConfig | undefined => {
  return SUPPORTED_CHAINS[chainId];
};

// Helper function to check if a chain is supported (now type-safe)
export const isSupportedChain = (
  chainId: number
): chainId is keyof typeof SUPPORTED_CHAINS => {
  return chainId in SUPPORTED_CHAINS;
};
