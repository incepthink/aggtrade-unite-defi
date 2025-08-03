import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from "recharts";
import React, { useState, useEffect } from "react";
import GlowBox from "@/components/ui/GlowBox";
import { useSpotBalance } from "@/hooks/useSpotBalance";

type PropType = {
  spot: number;
  perp: number;
  lending: number;
  balancer: number;
  isDydxFetched: boolean;
  isLoading?: boolean;
};

// Explicit pie data item type
interface PieDataItem {
  name: string;
  value: number;
  color: string;
  balance: number;
  symbol: string;
}

export function PieChartComp({
  spot,
  perp,
  lending,
  balancer,
  isDydxFetched,
  isLoading = false,
}: PropType) {
  const { data: spotData } = useSpotBalance();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on client side
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Generate colors for tokens
  const generateColors = (count: number) => {
    const colors = [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#8884D8",
      "#82CA9D",
      "#FFC658",
      "#FF7C7C",
      "#8DD1E1",
      "#D084D0",
      "#87D068",
      "#FFA500",
    ];
    return colors.slice(0, count);
  };

  // Pie chart data, fully typed!
  const createPieData = (): PieDataItem[] => {
    if (!spotData || !spotData.tokens.length) {
      // Placeholder, all fields included!
      return [
        {
          name: "No Data",
          value: 0,
          color: "#666666",
          balance: 0,
          symbol: "",
        },
      ];
    }
    console.log("SPOTDATAPIE::", spotData);

    // Add tokens
    const colorList = generateColors(spotData.tokens.length + 1);
    const symbolMap = new Map<string, PieDataItem>();

    spotData.tokens.forEach((token, index) => {
      if (token.usdValue > 0.01) {
        if (symbolMap.has(token.symbol)) {
          // Add to existing
          const existing = symbolMap.get(token.symbol)!;
          existing.balance += token.balance;
          existing.value += token.usdValue;
        } else {
          // Add new
          symbolMap.set(token.symbol, {
            name: token.symbol,
            value: token.usdValue,
            color: colorList[index + 1],
            balance: token.balance,
            symbol: token.symbol,
          });
        }
      }
    });

    const pieData: PieDataItem[] = Array.from(symbolMap.values());

    return pieData.length > 0
      ? pieData
      : [
          {
            name: "No Data",
            value: 0,
            color: "#666666",
            balance: 0,
            symbol: "",
          },
        ];
  };

  const data: PieDataItem[] = createPieData();
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const handleMouseEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(undefined);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
      props;
    return (
      <g>
        <Sector
          {...props}
          stroke="#00FAFF"
          strokeWidth={isMobile ? 2 : 3}
          outerRadius={outerRadius + (isMobile ? 6 : 8)}
          style={{
            filter: "drop-shadow(0 0 12px rgba(0, 250, 255, 0.6))",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={innerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="#00FAFF"
          opacity={0.3}
          style={{
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </g>
    );
  };

  // Responsive chart dimensions
  const chartSize = isMobile ? 280 : 400;
  const innerRadius = isMobile ? 70 : 100;
  const outerRadius = isMobile ? 90 : 120;

  return (
    <GlowBox sx={{ p: 3 }}>
      <div
        className={`flex ${
          isMobile ? "flex-col" : "flex-row"
        } items-stretch w-full ${isMobile ? "gap-4" : "gap-5"}`}
      >
        {/* Chart Container */}
        <div
          className={`relative ${
            isMobile ? "w-full flex justify-center" : "inline-block"
          }`}
        >
          <ResponsiveContainer width={chartSize} height={chartSize}>
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`gradient-${index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={entry.color}
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor={entry.color}
                      stopOpacity={1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                stroke="none"
                animationBegin={0}
                animationDuration={1200}
                animationEasing="ease-out"
              >
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={`url(#gradient-${i})`}
                    style={{
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                cursor={true}
                offset={-50}
                formatter={(value: number, name: string) => [
                  `$${(value as number).toFixed(2)}`,
                  name,
                ]}
                wrapperStyle={{
                  padding: "0px",
                  borderRadius: "8px",
                  backgroundColor: "transparent",
                  border: "none",
                  outline: "none",
                  pointerEvents: "none",
                }}
                contentStyle={{
                  padding: "0px",
                  backgroundColor: "transparent",
                  border: "none",
                  pointerEvents: "none",
                }}
                itemStyle={{
                  backgroundColor: "#00FAFF",
                  paddingBlock: "4px",
                  paddingInline: "8px",
                  borderRadius: "6px",
                  border: "none",
                  pointerEvents: "none",
                  fontWeight: "500",
                  fontSize: isMobile ? "12px" : "14px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Content */}
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            {isLoading ? (
              <span
                className={`text-cyan-400 ${
                  isMobile ? "text-base" : "text-lg"
                } animate-pulse`}
              >
                Loading...
              </span>
            ) : activeIndex !== undefined && data[activeIndex] ? (
              <>
                <span
                  className={`block ${
                    isMobile ? "text-xl" : "text-2xl"
                  } font-bold text-[#00FAFF] mt-1`}
                >
                  {totalValue > 0
                    ? ((data[activeIndex].value / totalValue) * 100).toFixed(1)
                    : "0.0"}
                  %
                </span>
                <span
                  className={`block ${
                    isMobile ? "text-xs" : "text-sm"
                  } text-gray-300 mt-1`}
                >
                  ${data[activeIndex].value.toFixed(2)}
                </span>
              </>
            ) : (
              <>
                <span
                  className={`block ${
                    isMobile ? "text-xs" : "text-sm"
                  } text-gray-400`}
                >
                  Total Portfolio
                </span>
                <span
                  className={`block ${
                    isMobile ? "text-base" : "text-lg"
                  } font-semibold text-white mt-1`}
                >
                  ${totalValue.toFixed(2)}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Legend Container - Token Breakdown */}
        <div
          className={`flex ${
            isMobile ? "flex-row flex-wrap gap-2" : "flex-1 flex-col"
          } justify-between`}
        >
          {data.map((dataItem: PieDataItem, i: number) => {
            const percentage =
              totalValue > 0 ? (dataItem.value / totalValue) * 100 : 0;

            return (
              <div
                key={i}
                onMouseEnter={() => handleMouseEnter(null, i)}
                onMouseLeave={handleMouseLeave}
                className={`flex ${
                  isMobile
                    ? "flex-1 min-w-[calc(50%-4px)] flex-col"
                    : "flex-1 flex-row"
                } justify-between items-center text-center ${
                  isMobile ? "text-sm" : "text-lg"
                } rounded-lg ${
                  isMobile ? "p-3" : "px-4 py-3"
                } cursor-pointer transition-all duration-300 ease-out ${
                  activeIndex === i
                    ? "bg-black/30 border-l-2 border-[#00FAFF] transform scale-[1.02] shadow-lg"
                    : "hover:bg-black/20 border-l-2 border-transparent hover:border-cyan-400/40"
                } border border-white/5 hover:border-cyan-400/20`}
                style={{
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div
                  className={`flex items-center ${
                    isMobile ? "justify-center mb-2" : ""
                  } gap-3`}
                >
                  <div
                    style={{
                      backgroundColor: dataItem.color,
                      boxShadow:
                        activeIndex === i
                          ? `0 0 8px ${dataItem.color}`
                          : "none",
                    }}
                    className={`h-3 w-3 rounded-full transition-all duration-300 ${
                      activeIndex === i ? "scale-125" : ""
                    }`}
                  ></div>
                  <div className="flex flex-col items-start">
                    <p
                      className={`transition-colors duration-300 font-medium ${
                        activeIndex === i ? "text-[#00FAFF]" : "text-white"
                      } ${isMobile ? "text-sm" : "text-base"}`}
                    >
                      {dataItem.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {dataItem.balance.toFixed(4)} {dataItem.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`transition-colors duration-300 font-medium ${
                      activeIndex === i ? "text-[#00FAFF]" : "text-white"
                    } ${isMobile ? "text-sm" : "text-base"}`}
                  >
                    ${dataItem.value.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}

          {/* Info text */}
          <div className={`${isMobile ? "mt-4" : "mt-6"} text-center`}>
            <p className={`text-gray-500 ${isMobile ? "text-xs" : "text-sm"}`}>
              Real-time portfolio breakdown via 1inch API
            </p>
          </div>
        </div>
      </div>
    </GlowBox>
  );
}
