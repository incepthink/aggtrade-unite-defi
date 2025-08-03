import React, { useState } from "react";
import { useSpotBalance } from "@/hooks/useSpotBalance";
import { useAccount } from "wagmi";
import GlowBox from "@/components/ui/GlowBox";

interface EstimatedBalanceCardProps {
  bal: number;
}

export default function EstimatedBalanceCard({
  bal,
}: EstimatedBalanceCardProps) {
  const { isConnected } = useAccount();
  const { data: spotData, isLoading } = useSpotBalance();

  const [showDetails, setShowDetails] = useState(false);

  // Calculate 24h change (mock for now)
  const dailyChange = Math.random() * 10 - 5; // Random between -5% and +5%
  const dailyChangeAmount = (bal * dailyChange) / 100;

  return (
    <GlowBox sx={{ p: 3 }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Balance Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm text-white/60">Estimated Balance</p>
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

          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-white/40">
              ~
              {bal.toLocaleString("en-US", {
                minimumFractionDigits: 6,
                maximumFractionDigits: 6,
              })}{" "}
              USD
            </p>

            {spotData && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline transition-colors"
              >
                {showDetails ? "Hide" : "Show"} Details
              </button>
            )}
          </div>

          {/* Token Breakdown */}
          {showDetails && spotData && (
            <div className="mt-4 p-4 bg-black/20 rounded-lg border border-cyan-400/20">
              <h4 className="text-sm font-medium text-white mb-3">
                Token Breakdown
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {/* ETH Balance */}
                {/* {spotData.ethBalance.usdValue > 0.01 && (
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                        Ξ
                      </div>
                      <span className="text-white">ETH</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white">
                        {spotData.ethBalance.balance.toFixed(4)} ETH
                      </div>
                      <div className="text-gray-400">
                        ${spotData.ethBalance.usdValue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )} */}

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

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
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
        </div>
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
