// Updated main page component - Spot Balance Only
"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { PieChartComp } from "@/components/ui/PieChartComp";
import EstimatedBalanceCard from "@/components/ui/EstimatedBalanceCard";
import EquityTrendChart from "@/components/ui/EquityTrendChart";
import RecentTransactionCard from "@/components/ui/RecentTransactionCard";
import { useSpotBalanceTotal } from "@/hooks/useSpotBalance";

const page = () => {
  const { address, isConnected } = useAccount();

  // Use the efficient spot balance hook
  const { totalUsd: spotTotal, isLoading: spotLoading } = useSpotBalanceTotal();

  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      setDataReady(true);
    } else {
      setDataReady(false);
    }
  }, [isConnected, address]);

  function getTotalBalance() {
    return spotTotal;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex justify-center w-full py-4 sm:py-6 lg:py-10 px-4 sm:px-6 lg:px-9">
        {isConnected ? (
          <div className="w-full">
            {/* Balance Card - Full width on mobile */}
            <div className="mb-6 lg:mb-8">
              <EstimatedBalanceCard bal={getTotalBalance()} />
            </div>

            {/* Charts Section - Stack on mobile, side by side on desktop */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 mb-6 lg:mb-8">
              <div className="w-full lg:w-2/3">
                <EquityTrendChart />
              </div>
              <div className="w-full lg:w-1/3">
                <RecentTransactionCard />
              </div>
            </div>

            {/* Pie Chart - Full width (Spot Balance Only) */}
            <div className="neon-panel relative">
              <PieChartComp
                spot={dataReady ? spotTotal : 0}
                perp={0} // No perp balance
                lending={0} // No lending balance
                balancer={0} // No yield balance
                isDydxFetched={false} // Not applicable
                isLoading={spotLoading}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-center px-4">
              Connect Your Wallet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default page;
