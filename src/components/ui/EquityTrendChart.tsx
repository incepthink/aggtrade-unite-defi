// src/components/EquityTrendChart.tsx - With custom hardcoded X-axis
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useEquityTrend } from "@/hooks/useEquityTrend";
import GlowBox from "@/components/ui/GlowBox";

export default function EquityTrendChart() {
  const { isConnected } = useAccount();
  const [isMobile, setIsMobile] = useState(false);

  // Fixed timeRange to 7 days only
  const { data, isLoading, error, isSuccess } = useEquityTrend({
    timeRange: "7",
    enabled: isConnected,
  });

  console.log("EQUITYCHART::", data);

  // Check if mobile on client side
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-3 shadow-xl">
          <p className="text-cyan-300 font-bold text-lg">
            $
            {payload[0].value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasRealData = isSuccess && data && data.length > 0;

  // Calculate percentage change and stats
  const getPortfolioStats = () => {
    if (!hasRealData || data.length < 2) return null;

    const firstValue = data[0].v;
    const lastValue = data[data.length - 1].v;
    const maxValue = Math.max(...data.map((d) => d.v));
    const minValue = Math.min(...data.map((d) => d.v));

    if (firstValue === 0) return null;

    const change = ((lastValue - firstValue) / firstValue) * 100;
    const changeAmount = lastValue - firstValue;

    return {
      change,
      changeAmount,
      high: maxValue,
      low: minValue,
      current: lastValue,
    };
  };

  const stats = getPortfolioStats();

  // Generate hardcoded previous 7 days for custom X-axis
  const generateLast7Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const formattedDate = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });

      days.push(formattedDate);
    }

    return days;
  };

  const last7Days = generateLast7Days();

  return (
    <GlowBox sx={{ p: 3, height: 400 }}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Equity Trend</h3>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          )}

          {/* Show percentage change */}
          {stats && (
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                stats.change >= 0
                  ? "bg-green-400/20 text-green-400 border border-green-400/30"
                  : "bg-red-400/20 text-red-400 border border-red-400/30"
              }`}
            >
              {stats.change >= 0 ? "+" : ""}
              {stats.change.toFixed(2)}%
            </div>
          )}
        </div>

        <div className="text-xs text-white/40">7 day trend</div>
      </header>

      {error && (
        <div className="text-yellow-400 text-sm mb-4 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded">
          {error.message || "Failed to load portfolio data"}
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        {/* Chart without X-axis */}
        {hasRealData ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={data}
              margin={
                isMobile
                  ? { top: 10, right: 5, left: 5, bottom: 0 }
                  : { top: 10, right: 20, left: 20, bottom: 0 }
              }
            >
              <defs>
                {/* Enhanced gradient with cyan theme */}
                <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00FFE9" stopOpacity={0.6} />
                  <stop offset="50%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0099CC" stopOpacity={0.1} />
                </linearGradient>

                {/* Stroke gradient */}
                <linearGradient id="strokeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00FFE9" stopOpacity={1} />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.8} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#ffffff10"
                strokeDasharray="2 6"
                vertical={false}
                opacity={0.5}
              />

              {/* No XAxis component - we'll add custom one below */}

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "#ffffff80",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 500,
                }}
                tickMargin={8}
                domain={["dataMin * 0.95", "dataMax * 1.05"]}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                width={isMobile ? 40 : 60}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#00FFE9",
                  strokeWidth: 1,
                  strokeOpacity: 0.3,
                }}
              />

              <Area
                type="monotone"
                dataKey="v"
                stroke="url(#strokeGradient)"
                strokeWidth={2}
                fill="url(#equityGradient)"
                dot={false}
                activeDot={{
                  r: isMobile ? 4 : 6,
                  fill: "#00FFE9",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                  style: {
                    filter: "drop-shadow(0 0 8px rgba(0, 255, 233, 0.6))",
                  },
                }}
                animationDuration={2000}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* No data state */
          <div className="flex flex-col items-center justify-center h-[260px] text-center">
            <div className="w-16 h-16 mb-4 bg-white/5 rounded-lg flex items-center justify-center">
              <span className="text-2xl text-white/20">📊</span>
            </div>
            <div className="space-y-2">
              <p className="text-white/60 text-sm">
                {isLoading
                  ? "Loading portfolio data..."
                  : "No equity data available"}
              </p>
              {!isConnected && (
                <p className="text-white/40 text-xs">
                  Connect your wallet to view equity trends
                </p>
              )}
            </div>
          </div>
        )}

        {/* Custom Hardcoded X-Axis */}
        <div className="flex justify-between items-center mt-2 px-4 md:px-5">
          {last7Days.map((date, index) => (
            <div
              key={index}
              className="text-xs text-white/60 font-medium text-center flex-1"
            >
              {date}
            </div>
          ))}
        </div>
      </div>

      {/* Data points indicator */}
      {hasRealData && (
        <div className="absolute bottom-2 right-2 text-xs text-white/30">
          Data points: {data.length}
        </div>
      )}

      {/* Loading shimmer effect */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-pulse rounded-lg pointer-events-none"></div>
      )}
    </GlowBox>
  );
}
