// src/components/RecentTransactionCard.tsx - Styled with transparent glow
import React from "react";
import { useAccount } from "wagmi";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import GlowBox from "@/components/ui/GlowBox";

interface RecentTransactionCardProps {
  /** Provide your own image URL or local import */
  placeholderSrc?: string;
}

export default function RecentTransactionCard({
  placeholderSrc = "/assets/no-data-dark.svg",
}: RecentTransactionCardProps) {
  const { isConnected } = useAccount();
  const {
    data: transactions,
    isLoading,
    error,
  } = useRecentTransactions({
    enabled: isConnected,
  });

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
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K ${symbol}`;
    }
    return `${amount.toFixed(amount < 1 ? 6 : 2)} ${symbol}`;
  };

  const hasTransactions = transactions && transactions.length > 0;

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
        {hasTransactions && (
          <button className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
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

      {/* Transaction list or empty state */}
      {hasTransactions ? (
        <div className="space-y-3 max-h-[200px] overflow-y-auto">
          {transactions.slice(0, 3).map((tx, index) => {
            const typeInfo = getTransactionIcon(tx.type);

            return (
              <div
                key={tx.hash}
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
                      <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
                        {tx.token.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>{tx.formattedDate}</span>
                      <span>•</span>
                      <span className="group-hover:text-cyan-400 transition-colors">
                        {formatAddress(tx.hash)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side - Amount and USD value */}
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {formatAmount(tx.amount, tx.token.symbol)}
                  </div>
                  {tx.usdValue > 0 && (
                    <div className="text-xs text-white/40">
                      ${tx.usdValue.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            );
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
              {isLoading ? "Loading transactions..." : "No Data"}
            </p>
            {!isConnected && (
              <p className="text-white/40 text-xs">
                Connect your wallet to view transactions
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
