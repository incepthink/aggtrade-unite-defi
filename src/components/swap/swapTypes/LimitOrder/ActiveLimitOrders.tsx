"use client";

import React, { useState, useEffect } from "react";
import { Button, Tabs, Empty, Popconfirm, message } from "antd";
import { DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAccount, useChainId } from "wagmi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import axios from "axios";

dayjs.extend(relativeTime);

interface LimitOrderData {
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
  // Additional fields for display
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

const ActiveLimitOrders: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId() || 1;
  const [orders, setOrders] = useState<LimitOrderData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("active");
  const [loading, setLoading] = useState(false);
  const [msgApi, contextHolder] = message.useMessage();

  // Fetch orders from multiple sources
  const fetchOrders = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Load local orders first
      const localOrders = JSON.parse(
        localStorage.getItem("limitOrders") || "[]"
      )
        .filter(
          (order: any) =>
            order.maker?.toLowerCase() === address.toLowerCase() &&
            order.chainId === chainId
        )
        .map((order: any) => ({
          ...order,
          source: order.source || "local",
        }));

      // Try to fetch from 1inch API (may not work for private orders)
      let apiOrders: any[] = [];
      try {
        const { data } = await axios.get(
          `/api/proxy/1inch/orderbook/get-orders`,
          {
            params: {
              chainId,
              address,
              page: 1,
              limit: 100,
              statuses: "1,2", // Valid and temporarily invalid orders
            },
          }
        );

        apiOrders = (data.orders || []).map((order: any) => ({
          ...order,
          source: "api",
          // Transform API order data to match our interface
          tokenIn: order.tokenIn || {
            ticker: "TOKEN",
            img: "/placeholder.png",
          },
          tokenOut: order.tokenOut || {
            ticker: "TOKEN",
            img: "/placeholder.png",
          },
          status: order.status || "active",
          createdAt: order.createdAt || new Date().toISOString(),
        }));
      } catch (apiError) {
        console.log(
          "1inch API fetch failed (expected for private orders):",
          apiError
        );
      }

      // Combine and deduplicate orders
      const allOrders = [...localOrders, ...apiOrders];
      const uniqueOrders = allOrders.filter(
        (order, index, self) =>
          index ===
          self.findIndex(
            (o) =>
              (o.orderHash && o.orderHash === order.orderHash) ||
              (o.id && o.id === order.id)
          )
      );

      // Sort by creation date (newest first)
      uniqueOrders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

      setOrders(uniqueOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      msgApi.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Listen for new orders created
    const handleNewOrder = () => {
      fetchOrders();
    };

    window.addEventListener("limitOrderCreated", handleNewOrder);

    return () => {
      window.removeEventListener("limitOrderCreated", handleNewOrder);
    };
  }, [address, chainId]);

  // Cancel order (local or API)
  const cancelOrder = async (order: LimitOrderData) => {
    try {
      if (order.source === "local") {
        // Handle local orders
        const existingOrders = JSON.parse(
          localStorage.getItem("limitOrders") || "[]"
        );
        const updatedOrders = existingOrders.map((o: any) =>
          o.id === order.id || o.orderHash === order.orderHash
            ? { ...o, status: "cancelled" }
            : o
        );
        localStorage.setItem("limitOrders", JSON.stringify(updatedOrders));
        msgApi.success("Order cancelled successfully");
      } else {
        // Handle API orders
        await axios.delete(`/api/proxy/1inch/orderbook/cancel-order`, {
          params: {
            chainId,
            orderHash: order.orderHash,
          },
        });
        msgApi.success("Order cancelled successfully");
      }

      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      msgApi.error("Failed to cancel order");
    }
  };

  // Delete order from localStorage (for cancelled/expired orders)
  const deleteOrder = (order: LimitOrderData) => {
    const existingOrders = JSON.parse(
      localStorage.getItem("limitOrders") || "[]"
    );
    const updatedOrders = existingOrders.filter(
      (o: any) => o.id !== order.id && o.orderHash !== order.orderHash
    );
    localStorage.setItem("limitOrders", JSON.stringify(updatedOrders));
    msgApi.success("Order removed from list");
    fetchOrders();
  };

  // Filter orders by status
  const getFilteredOrders = () => {
    switch (activeTab) {
      case "active":
        return orders.filter((order) => order.status === "active");
      case "filled":
        return orders.filter((order) => order.status === "filled");
      case "history":
        return orders.filter((order) =>
          ["expired", "cancelled", "filled"].includes(order.status || "")
        );
      default:
        return orders;
    }
  };

  // Get status badge styling
  const getStatusStyle = (status: string) => {
    const statusConfig = {
      active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      filled: "bg-green-500/20 text-green-400 border-green-500/30",
      expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    );
  };

  // Get order type and price info for ETH/USDC pairs
  const getOrderDisplayInfo = (order: LimitOrderData) => {
    // Use the stored orderType if available, otherwise determine from tokens
    let orderType = order.orderType;

    if (!orderType) {
      // Fallback logic for older orders or API orders
      const sellToken =
        order.tokenIn?.ticker?.toUpperCase() ||
        order.sellToken?.toUpperCase() ||
        "";
      const buyToken =
        order.tokenOut?.ticker?.toUpperCase() ||
        order.buyToken?.toUpperCase() ||
        "";

      if (sellToken === "ETH" || sellToken === "WETH") {
        orderType = "SELL"; // Selling ETH for USDC
      } else if (buyToken === "ETH" || buyToken === "WETH") {
        orderType = "BUY"; // Buying ETH with USDC
      }
    }

    const isLocal = order.source === "local";

    return {
      type: orderType,
      typeColor:
        orderType === "BUY"
          ? "text-green-400"
          : orderType === "SELL"
          ? "text-red-400"
          : "text-blue-400",
      source: isLocal ? "📱 Local" : "🌐 API",
      sourceColor: isLocal ? "text-yellow-400" : "text-blue-400",
      priceUSD: order.priceUSD
        ? `${parseFloat(order.priceUSD).toLocaleString()}`
        : null,
    };
  };

  // Format amounts for display
  const formatAmount = (amount: string | number, decimals: number = 18) => {
    try {
      if (typeof amount === "string" && amount.includes(".")) {
        // Already formatted
        return parseFloat(amount).toFixed(4);
      }
      const value = BigInt(amount) / BigInt(10 ** decimals);
      return Number(value).toFixed(4);
    } catch {
      return "0.0000";
    }
  };

  // Get token symbol and image
  const getTokenInfo = (order: LimitOrderData, type: "in" | "out") => {
    if (type === "in" && order.tokenIn) {
      return {
        symbol: order.tokenIn.ticker || "TOKEN",
        image: order.tokenIn.img || "/placeholder-token.png",
      };
    }
    if (type === "out" && order.tokenOut) {
      return {
        symbol: order.tokenOut.ticker || "TOKEN",
        image: order.tokenOut.img || "/placeholder-token.png",
      };
    }
    return {
      symbol: "TOKEN",
      image: "/placeholder-token.png",
    };
  };

  const filteredOrders = getFilteredOrders();

  const tabItems = [
    {
      key: "active",
      label: (
        <div className="flex items-center gap-2">
          <span>Active</span>
          <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
            {orders.filter((o) => o.status === "active").length}
          </span>
        </div>
      ),
    },
    {
      key: "filled",
      label: (
        <div className="flex items-center gap-2">
          <span>Filled</span>
          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs">
            {orders.filter((o) => o.status === "filled").length}
          </span>
        </div>
      ),
    },
    {
      key: "history",
      label: (
        <div className="flex items-center gap-2">
          <span>History</span>
          <span className="bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded-full text-xs">
            {
              orders.filter((o) =>
                ["expired", "cancelled"].includes(o.status || "")
              ).length
            }
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 p-4 pb-0">
          <h3 className="text-xl font-semibold text-white">Limit Orders</h3>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={fetchOrders}
            loading={loading}
            className="bg-gray-800 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
          >
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="px-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="custom-tabs"
            size="small"
          />
        </div>

        {/* Orders List */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <Empty
              image={<div className="text-6xl mb-4">📋</div>}
              description={
                <div className="text-gray-400">
                  <div className="text-lg mb-2">
                    {activeTab === "active"
                      ? "No active limit orders"
                      : `No ${activeTab} orders`}
                  </div>
                  <div className="text-sm">
                    {activeTab === "active"
                      ? "Create your first limit order to get started"
                      : "Orders will appear here once executed"}
                  </div>
                </div>
              }
              className="py-12"
            />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.orderHash}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200"
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusStyle(
                          order.status || "active"
                        )}`}
                      >
                        {(order.status || "active").toUpperCase()}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          getOrderDisplayInfo(order).typeColor
                        }`}
                      >
                        {getOrderDisplayInfo(order).type}
                      </span>
                      {getOrderDisplayInfo(order).priceUSD && (
                        <span className="text-xs text-gray-300">
                          {getOrderDisplayInfo(order).priceUSD}
                        </span>
                      )}
                      {/* <span
                        className={`text-xs ${
                          getOrderDisplayInfo(order).sourceColor
                        }`}
                      >
                        {getOrderDisplayInfo(order).source}
                      </span> */}
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === "active" && (
                        <Popconfirm
                          title="Cancel this order?"
                          description="This action cannot be undone."
                          onConfirm={() => cancelOrder(order)}
                          okText="Yes"
                          cancelText="No"
                          okButtonProps={{
                            className:
                              "bg-red-600 hover:bg-red-700 border-red-600",
                          }}
                          cancelButtonProps={{
                            className:
                              "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white",
                          }}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30 hover:border-red-500/50"
                          >
                            Cancel
                          </Button>
                        </Popconfirm>
                      )}

                      {order.status !== "active" && (
                        <Popconfirm
                          title="Remove this order from list?"
                          onConfirm={() => deleteOrder(order)}
                          okText="Yes"
                          cancelText="No"
                          okButtonProps={{
                            className:
                              "bg-gray-600 hover:bg-gray-700 border-gray-600",
                          }}
                          cancelButtonProps={{
                            className:
                              "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-white",
                          }}
                        >
                          <Button
                            size="small"
                            icon={<DeleteOutlined />}
                            className="bg-gray-600/20 border-gray-500/30 text-gray-400 hover:bg-gray-600/30 hover:border-gray-500/50"
                          >
                            Remove
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </div>

                  {/* Rate and Expiry */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Rate
                      </div>
                      <div className="text-white font-medium">
                        {order.rate
                          ? parseFloat(order.rate).toFixed(6)
                          : "0.000000"}
                        <span className="text-gray-400 ml-1 text-sm">
                          {getTokenInfo(order, "out").symbol}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        {order.status === "active" ? "Expires" : "Expired"}
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          order.status === "active"
                            ? dayjs()
                                .add(1, "day")
                                .isAfter(dayjs(order.expiryDate))
                              ? "text-yellow-400"
                              : "text-white"
                            : order.status === "expired"
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
                        {order.status === "active" && order.expiryDate
                          ? dayjs(order.expiryDate).fromNow()
                          : order.expiryDate
                          ? dayjs(order.expiryDate).format("MMM DD, YYYY")
                          : "Unknown"}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for partially filled orders */}
                  {order.fillPercentage &&
                    order.fillPercentage > 0 &&
                    order.fillPercentage < 100 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>Filled</span>
                          <span>{order.fillPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${order.fillPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                  {/* Order Footer */}
                  <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-700/50">
                    <span>
                      Created {dayjs(order.createdAt).format("MMM DD, HH:mm")}
                    </span>
                    <span className="font-mono">
                      ID: {order.orderHash.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-tabs .ant-tabs-nav {
          background: rgba(55, 65, 81, 0.5);
          border-radius: 0.75rem;
          margin-bottom: 1rem;
          padding: 0.25rem;
        }

        .custom-tabs .ant-tabs-tab {
          background: transparent;
          border: none;
          color: #9ca3af;
          margin: 0;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .custom-tabs .ant-tabs-tab:hover {
          color: #f3f4f6;
        }

        .custom-tabs .ant-tabs-tab-active {
          background: #00f5e0;
          color: #000;
        }

        .custom-tabs .ant-tabs-tab-active:hover {
          color: #000;
        }

        .custom-tabs .ant-tabs-ink-bar {
          display: none;
        }

        .custom-tabs .ant-tabs-content-holder {
          display: none;
        }
      `}</style>
    </>
  );
};

export default ActiveLimitOrders;
