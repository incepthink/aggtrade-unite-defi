// src/components/RecentTransactionsTable.tsx
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useRecentTransactions } from "@/hooks/useRecentTransactions";
import { LimitOrderStorage } from "@/utils/limitOrderUtils";
import GlowBox from "@/components/ui/GlowBox";

interface RecentTransactionsTableProps {
  onBack?: () => void;
}

interface CombinedActivity {
  id: string;
  type: "transaction" | "limit_order";
  timestamp: number;
  formattedDate: string;
  data: any;
}

const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  onBack,
}) => {
  const { address, isConnected } = useAccount();
  const {
    data: transactions,
    isLoading,
    error,
  } = useRecentTransactions({
    enabled: isConnected,
  });

  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState("all");
  const itemsPerPage = 10;

  // Get active limit orders
  const getActiveLimitOrders = () => {
    if (!address) return [];
    return LimitOrderStorage.getOrdersByStatus("active", address, 1);
  };

  // Combine transactions and limit orders
  const getCombinedActivity = (): CombinedActivity[] => {
    const activities: CombinedActivity[] = [];

    // Add active limit orders FIRST
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

    // Sort: limit orders first, then by timestamp
    activities.sort((a, b) => {
      if (a.type === "limit_order" && b.type === "transaction") return -1;
      if (a.type === "transaction" && b.type === "limit_order") return 1;
      return b.timestamp - a.timestamp;
    });

    return activities;
  };

  const combinedActivity = getCombinedActivity();

  // Filter activities based on selected type
  const filteredActivity = combinedActivity.filter((activity) => {
    if (selectedType === "all") return true;

    if (selectedType === "limit_order") {
      return activity.type === "limit_order";
    }

    // For regular transactions
    if (activity.type === "transaction") {
      return activity.data.type === selectedType;
    }

    return false;
  });

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedType]);

  // Pagination calculations
  const totalItems = filteredActivity.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredActivity.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get transaction type details
  const getTypeInfo = (type: string, orderType?: string) => {
    switch (type) {
      case "receive":
        return { icon: "↓", color: "text-green-400", label: "Receive" };
      case "send":
        return { icon: "↑", color: "text-red-400", label: "Send" };
      case "swap":
        return { icon: "⇄", color: "text-blue-400", label: "Swap" };
      case "approve":
        return { icon: "✓", color: "text-yellow-400", label: "Approve" };
      case "limit_order":
        return {
          icon: "📋",
          color: orderType === "BUY" ? "text-green-400" : "text-red-400",
          label: `Limit ${orderType}`,
        };
      default:
        return { icon: "•", color: "text-gray-400", label: "Unknown" };
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
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M ${symbol}`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K ${symbol}`;
    if (amount < 0.0001) return `${amount.toExponential(2)} ${symbol}`;
    if (amount < 1) return `${amount.toFixed(6)} ${symbol}`;
    return `${amount.toFixed(4)} ${symbol}`;
  };

  // Get network name from chain ID
  const getNetworkName = (chainId: number) => {
    const networks: { [key: number]: string } = {
      1: "Ethereum",
      137: "Polygon",
      56: "BSC",
      43114: "Avalanche",
      250: "Fantom",
    };
    return networks[chainId] || `Chain ${chainId}`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-400/20 text-green-400 border-green-400/30";
      case "failed":
        return "bg-red-400/20 text-red-400 border-red-400/30";
      case "pending":
        return "bg-yellow-400/20 text-yellow-400 border-yellow-400/30";
      default:
        return "bg-purple-400/20 text-purple-400 border-purple-400/30";
    }
  };

  return (
    <div className="w-full">
      <GlowBox sx={{ p: 3 }}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span className="text-lg">←</span>
                <span className="text-sm">Back</span>
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              Transaction History
            </h2>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded px-3 py-1 hover:border-gray-500 focus:border-cyan-400 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="swap">Swap</option>
              <option value="send">Send</option>
              <option value="receive">Receive</option>
              <option value="approve">Approve</option>
              <option value="limit_order">Limit Orders</option>
            </select>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="text-yellow-400 text-sm mb-4 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded">
            Failed to load transactions: {error.message}
          </div>
        )}

        {/* Table */}
        {totalItems > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Asset
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Network
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">
                    Hash
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {currentItems.map((activity) => {
                  if (activity.type === "limit_order") {
                    const order = activity.data;
                    const typeInfo = getTypeInfo(
                      "limit_order",
                      order.orderType
                    );

                    return (
                      <tr
                        key={activity.id}
                        className="border-b border-gray-800 hover:bg-purple-900/10 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {activity.formattedDate}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </span>
                            <span className="text-sm text-white font-medium">
                              {typeInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-white bg-white/10 px-2 py-1 rounded">
                              {order.tokenIn?.ticker}
                            </span>
                            <span className="text-xs text-gray-400">→</span>
                            <span className="text-sm text-white bg-white/10 px-2 py-1 rounded">
                              {order.tokenOut?.ticker}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-white">
                          {parseFloat(order.amountIn || "0").toFixed(4)}{" "}
                          {order.tokenIn?.ticker}
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-full text-xs border bg-purple-400/20 text-purple-400 border-purple-400/30">
                            Active
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {order.chainId
                            ? getNetworkName(order.chainId)
                            : "N/A"}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-cyan-400 hover:text-cyan-300 cursor-pointer">
                            {formatAddress(order.orderHash || order.id)}
                          </span>
                        </td>
                      </tr>
                    );
                  } else {
                    const tx = activity.data;
                    const typeInfo = getTypeInfo(tx.type);

                    return (
                      <tr
                        key={activity.id}
                        className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {tx.formattedDate}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-lg ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </span>
                            <span className="text-sm text-white font-medium capitalize">
                              {typeInfo.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {tx.swapDetails ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-white bg-white/10 px-2 py-1 rounded">
                                {tx.swapDetails.tokenOut.symbol}
                              </span>
                              <span className="text-xs text-gray-400">→</span>
                              <span className="text-sm text-white bg-white/10 px-2 py-1 rounded">
                                {tx.swapDetails.tokenIn.symbol}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-white bg-white/10 px-2 py-1 rounded">
                              {tx.token.symbol}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {tx.swapDetails ? (
                            <div className="text-sm">
                              <div className="text-red-400">
                                -
                                {formatAmount(
                                  parseFloat(tx.swapDetails.tokenOut.amount) /
                                    Math.pow(
                                      10,
                                      tx.swapDetails.tokenOut.decimals
                                    ),
                                  tx.swapDetails.tokenOut.symbol
                                )}
                              </div>
                              <div className="text-green-400">
                                +
                                {formatAmount(
                                  parseFloat(tx.swapDetails.tokenIn.amount) /
                                    Math.pow(
                                      10,
                                      tx.swapDetails.tokenIn.decimals
                                    ),
                                  tx.swapDetails.tokenIn.symbol
                                )}
                              </div>
                            </div>
                          ) : (
                            <span
                              className={`text-sm ${
                                tx.direction === "in"
                                  ? "text-green-400"
                                  : "text-white"
                              }`}
                            >
                              {tx.direction === "in" ? "+" : "-"}
                              {formatAmount(tx.amount, tx.token.symbol)}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs border ${getStatusBadge(
                              tx.status
                            )}`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-300">
                          {getNetworkName(tx.chainId)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-cyan-400 hover:text-cyan-300 cursor-pointer">
                            {formatAddress(tx.hash)}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl text-white/20">📄</span>
            </div>
            <p className="text-white/60 text-sm mb-1">
              {isLoading ? "Loading transactions..." : "No transactions found"}
            </p>
            {!isConnected && (
              <p className="text-white/40 text-xs">
                Connect your wallet to view transaction history
              </p>
            )}
          </div>
        )}

        {/* Pagination - show only if we have data */}
        {totalItems > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {totalItems > 0 ? (
                <>
                  Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of{" "}
                  {totalItems}
                  {selectedType !== "all" && (
                    <span className="ml-1">
                      (
                      {selectedType === "limit_order"
                        ? "limit orders"
                        : `${selectedType} transactions`}
                      )
                    </span>
                  )}
                </>
              ) : (
                `No ${
                  selectedType === "all"
                    ? ""
                    : selectedType === "limit_order"
                    ? "limit orders"
                    : `${selectedType} transactions`
                } found`
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevious}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-800 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        currentPage === pageNumber
                          ? "bg-cyan-400/20 border border-cyan-400/30 text-cyan-400"
                          : "bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goToNext}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-800 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </GlowBox>
    </div>
  );
};

export default RecentTransactionsTable;
