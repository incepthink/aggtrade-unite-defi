import React, { useState, useMemo } from "react";
import { useSpotBalance } from "@/hooks/useSpotBalance";
import { useAccount, useChainId } from "wagmi";
import { LimitOrderStorage } from "@/utils/limitOrderUtils";
import GlowBox from "@/components/ui/GlowBox";

interface EstimatedBalanceCardProps {
  bal: number;
}

export default function EstimatedBalanceCard({
  bal,
}: EstimatedBalanceCardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId() || 1;
  const { data: spotData, isLoading } = useSpotBalance();

  const [showDetails, setShowDetails] = useState(false);

  // Calculate total USD value of active limit orders
  const limitOrdersValue = useMemo(() => {
    if (!address) return 0;

    const activeOrders = LimitOrderStorage.getOrdersByStatus(
      "active",
      address,
      chainId
    );

    let totalUSDValue = 0;
    console.log("ACTIVE ORDERS::", activeOrders);

    activeOrders.forEach((order) => {
      if (order.priceUSD && order.amountIn) {
        // For ETH orders, use the price directly
        if (
          order.orderType === "SELL" &&
          (order.tokenIn?.ticker === "ETH" || order.tokenIn?.ticker === "WETH")
        ) {
          totalUSDValue +=
            parseFloat(order.amountIn) * parseFloat(order.priceUSD);

          console.log(
            "VALUE DEBUG SELL::",
            totalUSDValue,
            parseFloat(order.amountIn),
            parseFloat(order.priceUSD),
            parseFloat(order.amountIn) * parseFloat(order.priceUSD)
          );
        }
        // For USDC orders, the amount is already in USD
        else if (
          order.orderType === "BUY" &&
          order.tokenIn?.ticker === "USDC"
        ) {
          totalUSDValue += parseFloat(order.amountIn);
          console.log(
            "VALUE DEBUG BUY::",
            totalUSDValue,
            parseFloat(order.amountIn)
          );
        }
        // For other tokens, try to estimate value
        else {
          // Simple estimation - you can enhance this with real price data
          const estimatedPrice =
            order.tokenIn?.ticker === "ETH"
              ? 3400
              : order.tokenIn?.ticker === "USDC"
              ? 1
              : parseFloat(order.priceUSD || "0");
          totalUSDValue += parseFloat(order.amountIn) * estimatedPrice;
        }
      }
    });

    return totalUSDValue;
  }, [address, chainId]);

  // Calculate available balance
  const availableBalance = bal - limitOrdersValue;
  const hasActiveLimitOrders = limitOrdersValue > 0;

  // Calculate 24h change (mock for now)
  const dailyChange = Math.random() * 10 - 5; // Random between -5% and +5%
  const dailyChangeAmount = (bal * dailyChange) / 100;

  // Get active limit orders for details
  const getActiveLimitOrders = () => {
    if (!address) return [];
    return LimitOrderStorage.getOrdersByStatus("active", address, chainId);
  };

  const activeLimitOrders = getActiveLimitOrders();

  return (
    <GlowBox sx={{ p: 3 }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Balance Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm text-white/60">Estimated Balance</p>
            {hasActiveLimitOrders && (
              <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded border border-purple-400/20">
                {activeLimitOrders.length} Active Order
                {activeLimitOrders.length !== 1 ? "s" : ""}
              </span>
            )}
            {isLoading && (
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-4xl md:text-5xl font-semibold text-white">
              {bal.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-lg text-white/60">USDT</span>
          </div>

          {/* Available Balance when limit orders exist */}
          {hasActiveLimitOrders && (
            <div className="mt-2 p-2 bg-orange-900/20 rounded-lg border border-orange-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-300">
                  Available Balance:
                </span>
                <div className="text-right">
                  <span className="text-lg font-medium text-orange-300">
                    {availableBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USDT
                  </span>
                  <div className="text-xs text-orange-400/80">
                    (
                    {limitOrdersValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    in orders)
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-white/40">
              ~
              {bal.toLocaleString("en-US", {
                minimumFractionDigits: 6,
                maximumFractionDigits: 6,
              })}{" "}
              USD
            </p>

            {(spotData || hasActiveLimitOrders) && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline transition-colors"
              >
                {showDetails ? "Hide" : "Show"} Details
              </button>
            )}
          </div>

          {/* Detailed Breakdown */}
          {showDetails && (
            <div className="mt-4 space-y-4">
              {/* Active Limit Orders Section */}
              {hasActiveLimitOrders && (
                <div className="p-4 bg-purple-900/10 rounded-lg border border-purple-500/20">
                  <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                    <span>📋</span>
                    Active Limit Orders ({activeLimitOrders.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {activeLimitOrders.map((order, index) => (
                      <div
                        key={order.id || order.orderHash}
                        className="flex justify-between items-center text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              order.orderType === "BUY"
                                ? "bg-green-400/20 text-green-400"
                                : "bg-red-400/20 text-red-400"
                            }`}
                          >
                            {order.orderType}
                          </span>
                          <span className="text-white/80">
                            {order.tokenIn?.ticker} → {order.tokenOut?.ticker}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-purple-300">
                            {parseFloat(order.amountIn || "0").toFixed(4)}{" "}
                            {order.tokenIn?.ticker}
                          </div>
                          <div className="text-purple-400/80 text-xs">
                            ~$
                            {order.priceUSD
                              ? (
                                  parseFloat(order.amountIn || "0") *
                                  parseFloat(order.priceUSD)
                                ).toFixed(2)
                              : "0.00"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-purple-500/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-300">Total in Orders:</span>
                      <span className="text-purple-300 font-medium">
                        $
                        {limitOrdersValue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Breakdown */}
              {spotData && (
                <div className="p-4 bg-black/20 rounded-lg border border-cyan-400/20">
                  <h4 className="text-sm font-medium text-white mb-3">
                    Token Breakdown
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {/* Top Tokens */}
                    {spotData.tokens.slice(0, 3).map((token, index) => (
                      <div
                        key={token.contractAddress}
                        className="flex justify-between items-center text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                            {token.symbol.charAt(0)}
                          </div>
                          <span className="text-white">{token.symbol}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white">
                            {token.balance.toFixed(2)} {token.symbol}
                          </div>
                          <div className="text-gray-400">
                            ${token.usdValue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {spotData.tokens.length > 3 && (
                      <div className="text-xs text-gray-400 pt-2">
                        +{spotData.tokens.length - 3} more tokens
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {/* <div className="flex flex-wrap gap-3">
          <button
            className="px-5 py-2 rounded bg-transparent text-cyan-400 hover:bg-cyan-400/10 text-sm font-medium transition-all duration-200 border border-cyan-400/40 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/20"
            disabled={!isConnected}
          >
            Deposit
          </button>
          <button
            className="px-5 py-2 rounded bg-transparent text-cyan-400 hover:bg-cyan-400/10 text-sm font-medium transition-all duration-200 border border-cyan-400/40 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/20"
            disabled={!isConnected}
          >
            Withdraw
          </button>
          <button
            className="px-5 py-2 rounded bg-transparent text-cyan-400 hover:bg-cyan-400/10 text-sm font-medium transition-all duration-200 border border-cyan-400/40 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-400/20"
            disabled={!isConnected}
          >
            Transfer
          </button>
        </div> */}
      </div>

      {!isConnected && (
        <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-lg">
          <p className="text-yellow-400 text-sm">
            Connect your wallet to view real-time portfolio data and enable
            trading actions.
          </p>
        </div>
      )}
    </GlowBox>
  );
}
