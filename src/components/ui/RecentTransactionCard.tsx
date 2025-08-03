// src/components/RecentTransactionCard.tsx - Updated to show transactions and limit orders
import React from "react";
import { useAccount } from "wagmi";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import { LimitOrderStorage } from "@/utils/limitOrderUtils";
import GlowBox from "@/components/ui/GlowBox";

interface RecentTransactionCardProps {
  /** Provide your own image URL or local import */
  placeholderSrc?: string;
  /** Callback when "View All" is clicked */
  onViewAll?: () => void;
}

interface CombinedActivity {
  id: string;
  type: "transaction" | "limit_order";
  timestamp: number;
  formattedDate: string;
  data: any; // Will contain either transaction or limit order data
}

export default function RecentTransactionCard({
  placeholderSrc = "/assets/no-data-dark.svg",
  onViewAll,
}: RecentTransactionCardProps) {
  const { address, isConnected } = useAccount();
  const {
    data: transactions,
    isLoading,
    error,
  } = useRecentTransactions({
    enabled: isConnected,
  });

  console.log("RECENT TRANS::", transactions);

  // Get active limit orders
  const getActiveLimitOrders = () => {
    if (!address) return [];
    return LimitOrderStorage.getOrdersByStatus("active", address, 1);
  };

  // Combine transactions and limit orders
  const getCombinedActivity = (): CombinedActivity[] => {
    const activities: CombinedActivity[] = [];

    // Add active limit orders FIRST (at the start)
    const limitOrders = getActiveLimitOrders();
    limitOrders.forEach((order) => {
      activities.push({
        id: order.id || order.orderHash,
        type: "limit_order",
        timestamp:
          order.createdTimestamp || new Date(order.createdAt || 0).getTime(),
        formattedDate: new Date(order.createdAt || 0).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        data: order,
      });
    });

    // Add transactions AFTER limit orders
    if (transactions) {
      transactions.forEach((tx) => {
        activities.push({
          id: tx.hash,
          type: "transaction",
          timestamp: tx.timestamp,
          formattedDate: tx.formattedDate,
          data: tx,
        });
      });
    }

    // Sort by timestamp (most recent first) but keep limit orders at top
    activities.sort((a, b) => {
      // If one is limit order and other is transaction, limit order comes first
      if (a.type === "limit_order" && b.type === "transaction") return -1;
      if (a.type === "transaction" && b.type === "limit_order") return 1;

      // If both are same type, sort by timestamp
      return b.timestamp - a.timestamp;
    });

    return activities;
  };

  const combinedActivity = getCombinedActivity();

  // Get transaction type icon and color
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "receive":
        return {
          icon: "↓",
          color: "text-green-400",
          bg: "bg-green-400/20 border-green-400/30",
        };
      case "send":
        return {
          icon: "↑",
          color: "text-red-400",
          bg: "bg-red-400/20 border-red-400/30",
        };
      case "swap":
        return {
          icon: "⇄",
          color: "text-blue-400",
          bg: "bg-blue-400/20 border-blue-400/30",
        };
      case "approve":
        return {
          icon: "✓",
          color: "text-yellow-400",
          bg: "bg-yellow-400/20 border-yellow-400/30",
        };
      case "limit_order":
        return {
          icon: "📋",
          color: "text-purple-400",
          bg: "bg-purple-400/20 border-purple-400/30",
        };
      default:
        return {
          icon: "•",
          color: "text-gray-400",
          bg: "bg-gray-400/20 border-gray-400/30",
        };
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return "Unknown";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format amount for display
  const formatAmount = (amount: number, symbol: string) => {
    if (amount === 0) return `0 ${symbol}`;

    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M ${symbol}`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K ${symbol}`;
    }
    if (amount < 0.0001) {
      return `${amount.toExponential(2)} ${symbol}`;
    }
    if (amount < 1) {
      return `${amount.toFixed(6)} ${symbol}`;
    }
    return `${amount.toFixed(4)} ${symbol}`;
  };

  // Format swap amounts for display
  const formatSwapAmounts = (swapDetails: any) => {
    if (!swapDetails) return null;

    const tokenOutAmount =
      parseFloat(swapDetails.tokenOut.amount) /
      Math.pow(10, swapDetails.tokenOut.decimals);
    const tokenInAmount =
      parseFloat(swapDetails.tokenIn.amount) /
      Math.pow(10, swapDetails.tokenIn.decimals);

    return {
      tokenOut: formatAmount(tokenOutAmount, swapDetails.tokenOut.symbol),
      tokenIn: formatAmount(tokenInAmount, swapDetails.tokenIn.symbol),
    };
  };

  // Get network name from chain ID
  const getNetworkName = (chainId: number) => {
    const networks: { [key: number]: string } = {
      1: "ETH",
      137: "MATIC",
      56: "BSC",
      43114: "AVAX",
      250: "FTM",
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  const hasActivity = combinedActivity && combinedActivity.length > 0;

  return (
    <GlowBox sx={{ p: 3 }}>
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">
            Recent Transaction
          </h3>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>
        {hasActivity && (
          <button
            onClick={onViewAll}
            className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
          >
            View All
          </button>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="text-yellow-400 text-sm mb-4 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded">
          Failed to load transactions
        </div>
      )}

      {/* Info pill */}
      <div className="mb-4 w-max rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-400 border border-cyan-400/20">
        Lowest Withdrawal Fees Globally
      </div>

      {/* Activity list or empty state */}
      {hasActivity ? (
        <div className="space-y-3 max-h-[280px] overflow-y-auto">
          {combinedActivity.slice(0, 5).map((activity, index) => {
            if (activity.type === "limit_order") {
              // Render limit order
              const order = activity.data;
              const typeInfo = getTransactionIcon("limit_order");

              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-purple-900/10 hover:bg-purple-900/20 transition-all duration-200 cursor-pointer group border border-purple-500/20 hover:border-purple-400/30"
                >
                  {/* Left side - Icon and details */}
                  <div className="flex items-center gap-3">
                    {/* Limit order icon */}
                    <div
                      className={`w-8 h-8 rounded-full ${typeInfo.bg} border flex items-center justify-center`}
                    >
                      <span className={`text-sm ${typeInfo.color}`}>
                        {typeInfo.icon}
                      </span>
                    </div>

                    {/* Order details */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">
                          Limit Order
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            order.orderType === "BUY"
                              ? "bg-green-400/20 text-green-400"
                              : "bg-red-400/20 text-red-400"
                          }`}
                        >
                          {order.orderType}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                            {order.tokenIn?.ticker}
                          </span>
                          <span className="text-xs text-white/40">→</span>
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                            {order.tokenOut?.ticker}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{activity.formattedDate}</span>
                        <span>•</span>
                        <span className="text-purple-400">Active</span>
                        <span>•</span>
                        <span>
                          Rate: {parseFloat(order.rate || "0").toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Amount */}
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {parseFloat(order.amountIn || "0").toFixed(4)}{" "}
                      {order.tokenIn?.ticker}
                    </div>
                    <div className="text-xs text-purple-400">Limit Order</div>
                  </div>
                </div>
              );
            } else {
              // Render transaction
              const tx = activity.data;
              const typeInfo = getTransactionIcon(tx.type);
              const swapAmounts = formatSwapAmounts(tx.swapDetails);

              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-all duration-200 cursor-pointer group border border-white/5 hover:border-cyan-400/20"
                >
                  {/* Left side - Icon and details */}
                  <div className="flex items-center gap-3">
                    {/* Transaction type icon */}
                    <div
                      className={`w-8 h-8 rounded-full ${typeInfo.bg} border flex items-center justify-center`}
                    >
                      <span className={`text-sm font-bold ${typeInfo.color}`}>
                        {typeInfo.icon}
                      </span>
                    </div>

                    {/* Transaction details */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium capitalize">
                          {tx.type}
                        </span>
                        {tx.swapDetails ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                              {tx.swapDetails.tokenOut.symbol}
                            </span>
                            <span className="text-xs text-white/40">→</span>
                            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                              {tx.swapDetails.tokenIn.symbol}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                            {tx.token.symbol}
                          </span>
                        )}
                        <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                          {getNetworkName(tx.chainId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{tx.formattedDate}</span>
                        <span>•</span>
                        <span className="group-hover:text-cyan-400 transition-colors">
                          {formatAddress(tx.hash)}
                        </span>
                        <span>•</span>
                        <span
                          className={`px-1 py-0.5 rounded text-xs ${
                            tx.status === "success"
                              ? "bg-green-400/20 text-green-400"
                              : tx.status === "failed"
                              ? "bg-red-400/20 text-red-400"
                              : "bg-yellow-400/20 text-yellow-400"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Amount */}
                  <div className="text-right">
                    {tx.swapDetails && swapAmounts ? (
                      <div className="text-sm font-medium text-white">
                        <div className="text-red-400">
                          -{swapAmounts.tokenOut}
                        </div>
                        <div className="text-green-400">
                          +{swapAmounts.tokenIn}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`text-sm font-medium ${
                          tx.direction === "in"
                            ? "text-green-400"
                            : "text-white"
                        }`}
                      >
                        {tx.direction === "in" ? "+" : "-"}
                        {formatAmount(tx.amount, tx.token.symbol)}
                      </div>
                    )}
                    <div className="text-xs text-white/40">
                      Block #{tx.blockNumber.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex h-[180px] flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center">
            <span className="text-2xl text-white/20">📄</span>
          </div>
          <div>
            <p className="text-white/60 text-sm mb-1">
              {isLoading ? "Loading activity..." : "No activity found"}
            </p>
            {!isConnected && (
              <p className="text-white/40 text-xs">
                Connect your wallet to view transactions and orders
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading shimmer effect */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-pulse rounded-lg pointer-events-none"></div>
      )}
    </GlowBox>
  );
}
