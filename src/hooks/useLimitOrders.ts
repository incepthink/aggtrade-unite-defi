// hooks/useLimitOrders.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface LimitOrder {
  orderHash: string;
  signature: string;
  data: {
    maker: string;
    receiver: string;
    makerAsset: string;
    takerAsset: string;
    makingAmount: string;
    takingAmount: string;
    salt: string;
    makerTraits: string;
  };
  extension: string;
  interactions: string;
  createdAt: string;
  fills: Array<{
    txHash: string;
    filledMakingAmount: string;
    filledTakingAmount: string;
  }>;
  remainingMakerAmount: string;
  makerBalance: string;
  makerAllowance: string;
}

export interface CreateOrderData {
  signature: string;
  data: {
    maker: string;
    receiver: string;
    makerAsset: string;
    takerAsset: string;
    makingAmount: string;
    takingAmount: string;
    salt: string;
    makerTraits: string;
  };
  extension?: string;
  interactions?: string;
}

// Create a new limit order
export function useCreateLimitOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chainId,
      orderData,
    }: {
      chainId: number;
      orderData: CreateOrderData;
    }) => {
      const response = await fetch("/api/proxy/1inch/orderbook/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainId,
          orderData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create limit order");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch user orders
      queryClient.invalidateQueries({ queryKey: ["limitOrders"] });
    },
  });
}

// Get user's limit orders
export function useLimitOrders(chainId: number = 1) {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["limitOrders", chainId, address],
    queryFn: async () => {
      if (!address) throw new Error("No wallet connected");

      const response = await fetch(
        `/api/proxy/1inch/orderbook/get-orders?chainId=${chainId}&maker=${address}&limit=50&offset=0`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch limit orders");
      }

      return response.json();
    },
    enabled: Boolean(isConnected && address),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Cancel a limit order
export function useCancelLimitOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chainId,
      orderHash,
    }: {
      chainId: number;
      orderHash: string;
    }) => {
      const response = await fetch(
        `/api/proxy/1inch/orderbook/cancel-order?chainId=${chainId}&orderHash=${orderHash}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel order");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch user orders
      queryClient.invalidateQueries({ queryKey: ["limitOrders"] });
    },
  });
}

// Get order status
export function useOrderStatus(chainId: number, orderHash: string) {
  return useQuery({
    queryKey: ["orderStatus", chainId, orderHash],
    queryFn: async () => {
      const response = await fetch(
        `/api/proxy/1inch/orderbook/get-order-status?chainId=${chainId}&orderHash=${orderHash}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch order status");
      }

      return response.json();
    },
    enabled: Boolean(orderHash),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

// Build order data helper
export function useBuildOrderData() {
  return useMutation({
    mutationFn: async ({
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      maker,
      receiver,
      expiry,
      allowPartialFill = true,
      allowMultipleFill = true,
    }: {
      makerAsset: string;
      takerAsset: string;
      makingAmount: string;
      takingAmount: string;
      maker: string;
      receiver?: string;
      expiry: number;
      allowPartialFill?: boolean;
      allowMultipleFill?: boolean;
    }) => {
      // Generate salt (random number)
      const salt = Math.floor(Math.random() * 1000000000000000000).toString();

      // Build maker traits
      let makerTraits = "0";

      // Set expiry if provided
      if (expiry > 0) {
        makerTraits = (BigInt(expiry) << BigInt(160)).toString();
      }

      // Set partial fill flag
      if (allowPartialFill) {
        makerTraits = (BigInt(makerTraits) | BigInt(1)).toString();
      }

      // Set multiple fill flag
      if (allowMultipleFill) {
        makerTraits = (BigInt(makerTraits) | BigInt(2)).toString();
      }

      const orderData = {
        maker,
        receiver: receiver || maker,
        makerAsset,
        takerAsset,
        makingAmount,
        takingAmount,
        salt,
        makerTraits,
      };

      return orderData;
    },
  });
}
