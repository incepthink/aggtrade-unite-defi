// utils/limitOrderUtils.ts

export interface LimitOrderData {
  orderHash: string;
  signature: string;
  data?: {
    salt: string;
    makerAsset: string;
    takerAsset: string;
    maker: string;
    receiver: string;
    makingAmount: string;
    takingAmount: string;
    makerTraits: string;
  };
  // Core order data
  id?: string;
  tokenIn?: {
    address: string;
    ticker: string;
    img: string;
    decimals: number;
    name?: string;
  };
  tokenOut?: {
    address: string;
    ticker: string;
    img: string;
    decimals: number;
    name?: string;
  };
  amountIn?: string;
  amountOut?: string;
  rate?: string;
  expiryDate?: string;
  status?: "active" | "filled" | "expired" | "cancelled";
  createdAt?: string;
  fillPercentage?: number;
  source?: "local" | "api";
  chainId?: number;
  maker?: string;

  // ETH/USDC specific fields
  orderType?: "BUY" | "SELL";
  priceUSD?: string;
  sellToken?: string;
  buyToken?: string;
  network?: string;
  blockNumber?: number | null;
  transactionHash?: string | null;
  createdTimestamp?: number;
  userAgent?: string;
  executedAt?: string | null;
  executedPrice?: string | null;
  executedAmount?: string | null;
  gasUsed?: string | null;
  isPrivate?: boolean;
  orderBookSource?: string;
  expiryDays?: number;
  makingAmountWei?: string;
  takingAmountWei?: string;
}

export class LimitOrderStorage {
  private static STORAGE_KEY = "limitOrders";

  // Get all orders
  static getAllOrders(): LimitOrderData[] {
    try {
      const orders = localStorage.getItem(this.STORAGE_KEY);
      return orders ? JSON.parse(orders) : [];
    } catch (error) {
      console.error("Error getting orders from localStorage:", error);
      return [];
    }
  }

  // Get orders by wallet address
  static getOrdersByAddress(
    address: string,
    chainId?: number
  ): LimitOrderData[] {
    const allOrders = this.getAllOrders();
    return allOrders.filter((order) => {
      const addressMatch = order.maker?.toLowerCase() === address.toLowerCase();
      const chainMatch = chainId ? order.chainId === chainId : true;
      return addressMatch && chainMatch;
    });
  }

  // Get orders by status
  static getOrdersByStatus(
    status: string,
    address?: string,
    chainId?: number
  ): LimitOrderData[] {
    let orders = this.getAllOrders();

    if (address) {
      orders = orders.filter(
        (order) => order.maker?.toLowerCase() === address.toLowerCase()
      );
    }

    if (chainId) {
      orders = orders.filter((order) => order.chainId === chainId);
    }

    return orders.filter((order) => order.status === status);
  }

  // Get orders by type (BUY/SELL)
  static getOrdersByType(
    orderType: "BUY" | "SELL",
    address?: string,
    chainId?: number
  ): LimitOrderData[] {
    let orders = this.getAllOrders();

    if (address) {
      orders = orders.filter(
        (order) => order.maker?.toLowerCase() === address.toLowerCase()
      );
    }

    if (chainId) {
      orders = orders.filter((order) => order.chainId === chainId);
    }

    return orders.filter((order) => order.orderType === orderType);
  }

  // Add new order
  static addOrder(order: LimitOrderData): void {
    try {
      const orders = this.getAllOrders();
      orders.push(order);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error("Error adding order to localStorage:", error);
    }
  }

  // Update order
  static updateOrder(
    orderIdentifier: string,
    updates: Partial<LimitOrderData>
  ): boolean {
    try {
      const orders = this.getAllOrders();
      const orderIndex = orders.findIndex(
        (order) =>
          order.id === orderIdentifier || order.orderHash === orderIdentifier
      );

      if (orderIndex !== -1) {
        orders[orderIndex] = { ...orders[orderIndex], ...updates };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating order in localStorage:", error);
      return false;
    }
  }

  // Delete order
  static deleteOrder(orderIdentifier: string): boolean {
    try {
      const orders = this.getAllOrders();
      const filteredOrders = orders.filter(
        (order) =>
          order.id !== orderIdentifier && order.orderHash !== orderIdentifier
      );

      if (filteredOrders.length !== orders.length) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredOrders));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting order from localStorage:", error);
      return false;
    }
  }

  // Get order statistics
  static getOrderStats(
    address?: string,
    chainId?: number
  ): {
    total: number;
    active: number;
    filled: number;
    cancelled: number;
    expired: number;
    totalVolumeUSD: number;
    avgOrderSizeUSD: number;
  } {
    let orders = this.getAllOrders();

    if (address) {
      orders = orders.filter(
        (order) => order.maker?.toLowerCase() === address.toLowerCase()
      );
    }

    if (chainId) {
      orders = orders.filter((order) => order.chainId === chainId);
    }

    const active = orders.filter((order) => order.status === "active").length;
    const filled = orders.filter((order) => order.status === "filled").length;
    const cancelled = orders.filter(
      (order) => order.status === "cancelled"
    ).length;
    const expired = orders.filter((order) => order.status === "expired").length;

    // Calculate volume (for orders with priceUSD and amounts)
    const totalVolumeUSD = orders.reduce((sum, order) => {
      if (order.priceUSD && order.amountIn) {
        const volume = parseFloat(order.amountIn) * parseFloat(order.priceUSD);
        return sum + (isNaN(volume) ? 0 : volume);
      }
      return sum;
    }, 0);

    const avgOrderSizeUSD =
      orders.length > 0 ? totalVolumeUSD / orders.length : 0;

    return {
      total: orders.length,
      active,
      filled,
      cancelled,
      expired,
      totalVolumeUSD,
      avgOrderSizeUSD,
    };
  }

  // Export orders (for analytics or backup)
  static exportOrders(address?: string, chainId?: number): string {
    let orders = this.getAllOrders();

    if (address) {
      orders = orders.filter(
        (order) => order.maker?.toLowerCase() === address.toLowerCase()
      );
    }

    if (chainId) {
      orders = orders.filter((order) => order.chainId === chainId);
    }

    return JSON.stringify(orders, null, 2);
  }

  // Import orders (for restore)
  static importOrders(ordersJson: string): boolean {
    try {
      const newOrders = JSON.parse(ordersJson);
      if (Array.isArray(newOrders)) {
        const existingOrders = this.getAllOrders();
        const allOrders = [...existingOrders, ...newOrders];

        // Remove duplicates based on orderHash or id
        const uniqueOrders = allOrders.filter(
          (order, index, self) =>
            index ===
            self.findIndex(
              (o) =>
                (o.orderHash && o.orderHash === order.orderHash) ||
                (o.id && o.id === order.id)
            )
        );

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(uniqueOrders));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error importing orders:", error);
      return false;
    }
  }

  // Clear all orders (with optional filters)
  static clearOrders(address?: string, chainId?: number): void {
    try {
      if (!address && !chainId) {
        // Clear all orders
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        // Clear filtered orders
        let orders = this.getAllOrders();

        orders = orders.filter((order) => {
          const addressMatch = address
            ? order.maker?.toLowerCase() !== address.toLowerCase()
            : true;
          const chainMatch = chainId ? order.chainId !== chainId : true;
          return addressMatch || chainMatch;
        });

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
      }
    } catch (error) {
      console.error("Error clearing orders:", error);
    }
  }
}

// Helper functions for formatting and display
export const formatOrderAmount = (
  amount: string | number,
  decimals: number = 18
): string => {
  try {
    if (typeof amount === "string" && amount.includes(".")) {
      return parseFloat(amount).toFixed(4);
    }
    const value = BigInt(amount) / BigInt(10 ** decimals);
    return Number(value).toFixed(4);
  } catch {
    return "0.0000";
  }
};

export const getOrderTypeFromTokens = (
  tokenIn: string,
  tokenOut: string
): "BUY" | "SELL" => {
  const sellToken = tokenIn.toUpperCase();
  const buyToken = tokenOut.toUpperCase();

  if (sellToken === "ETH" || sellToken === "WETH") {
    return "SELL"; // Selling ETH for USDC
  } else if (buyToken === "ETH" || buyToken === "WETH") {
    return "BUY"; // Buying ETH with USDC
  }

  return "SELL"; // Default
};

export const isOrderExpired = (expiryDate: string): boolean => {
  try {
    return new Date() > new Date(expiryDate);
  } catch {
    return false;
  }
};

export const getTimeUntilExpiry = (expiryDate: string): string => {
  try {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  } catch {
    return "Unknown";
  }
};
