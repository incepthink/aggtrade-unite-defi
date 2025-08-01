"use client";

import { useSpotStore } from "@/store/spotStore";
import { BACKEND_URL } from "@/utils/constants";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { startOfMonth, addMonths, differenceInMonths } from "date-fns";
import type { TooltipProps } from "recharts";
import { CircularProgress, useMediaQuery, useTheme } from "@mui/material";

const formatTooltipLabel = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;

  const price = payload[0]?.value as number;

  return (
    <div className="rounded-xl bg-[#0d1117]/90 backdrop-blur-md p-3 border border-[#30363d] shadow-xl">
      <p className="text-xs text-[#58a6ff] mb-1">{formatTooltipLabel(label)}</p>
      <p className="text-sm font-semibold text-[#f0f6fc]">
        ${price.toLocaleString()}
      </p>
    </div>
  );
};

function formatUSDCompact(value: number) {
  if (value === null || value === undefined || isNaN(value)) return "$0.00";

  const abs = Math.abs(value);

  let formatted;
  if (abs >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(2) + "B";
  } else if (abs >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(2) + "M";
  } else if (abs >= 1_000) {
    formatted = (value / 1_000).toFixed(2) + "K";
  } else {
    formatted = value.toFixed(2);
  }

  return `$${formatted}`;
}

// Separate Chart Header Component
export const ChartHeader = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("xl"));

  const tokenOne = useSpotStore((state) => state.tokenOne);
  const [fdv, setFdv] = useState(0);
  const [vol, setVol] = useState(0);

  useEffect(() => {
    // This would be better to share state with ChartSpot, but for now we'll fetch separately
    // In a real app, you'd want to lift this state up or use a shared store
    const fetchMetadata = async () => {
      if (!tokenOne) return;
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/chart/price`, {
          params: { tokenAddress: tokenOne.address },
        });
        setFdv(data.metadata.fdv);
        setVol(data.metadata.vol);
      } catch (error) {
        console.error("ERROR FETCHING METADATA:: ", error);
      }
    };

    fetchMetadata();
  }, [tokenOne]);

  if (!tokenOne) return null;

  return (
    <div className="flex lg:flex-col justify-between flex-row gap-2 p-4 px-6">
      {/* Token Info */}
      <div className="flex items-center gap-2 md:gap-4">
        <div
          className={`${
            isMobile ? "w-8" : isLargeScreen ? "w-16" : "w-12"
          } rounded-full overflow-hidden flex-shrink-0`}
        >
          <img
            src={tokenOne.img}
            alt={tokenOne.ticker}
            className="w-full object-cover"
          />
        </div>
        <p
          className={`${
            isMobile
              ? "text-md"
              : isTablet
              ? "text-lg"
              : isLargeScreen
              ? "text-2xl"
              : "text-xl"
          } font-semibold truncate text-white`}
        >
          {tokenOne.name}
        </p>
      </div>

      {/* Metrics */}
      <div className="flex gap-6 justify-start">
        <div className="flex flex-col gap-1 items-start">
          <p
            className={`${
              isMobile ? "text-xs" : isLargeScreen ? "text-sm" : "text-xs"
            } opacity-80 text-gray-300`}
          >
            FDV
          </p>
          <p
            className={`${
              isMobile ? "text-sm" : isLargeScreen ? "text-base" : "text-sm"
            } font-medium text-white`}
          >
            {formatUSDCompact(fdv)}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-start">
          <p
            className={`${
              isMobile ? "text-xs" : isLargeScreen ? "text-sm" : "text-xs"
            } opacity-80 text-gray-300`}
          >
            24H VOL
          </p>
          <p
            className={`${
              isMobile ? "text-sm" : isLargeScreen ? "text-base" : "text-sm"
            } font-medium text-white`}
          >
            {formatUSDCompact(vol)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Clean Chart Component with conditional header
const ChartSpot = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("xl"));
  const showInternalHeader = useMediaQuery(theme.breakpoints.up("md")); // Show header inside on medium screens and up

  const tokenOne = useSpotStore((state) => state.tokenOne);
  const [chartData, setChartData] = useState<any>([]);
  const [fdv, setFdv] = useState(0);
  const [vol, setVol] = useState(0);

  function buildMonthTicks(from: number, to: number) {
    const first = startOfMonth(new Date(from)).getTime();
    const months = differenceInMonths(new Date(to), new Date(first));
    const ticks: number[] = [];
    for (let i = 0; i <= months - 1; i++) {
      ticks.push(addMonths(first, i).getTime());
    }
    return ticks;
  }

  const monthTicks = useMemo(() => {
    if (chartData.length === 0) return [];

    const first = chartData[0].ts;
    const last = chartData[chartData.length - 1].ts;
    return buildMonthTicks(first, last);
  }, [chartData]);

  async function fetchOhlcData() {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/chart/price`, {
        params: {
          tokenAddress: tokenOne.address,
        },
      });
      setChartData(data.chart);
      setFdv(data.metadata.fdv);
      setVol(data.metadata.vol);
    } catch (error) {
      console.error("ERROR FETCHING OHLC:: ", error);
      setChartData([]);
    }
  }

  useEffect(() => {
    if (tokenOne) {
      fetchOhlcData();
    }
  }, [tokenOne]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Header inside chart container - only on large screens */}
      {showInternalHeader && tokenOne && (
        <div
          className={`absolute ${
            isMobile
              ? "top-2 left-2 right-2"
              : isTablet
              ? "top-3 left-4 right-4"
              : "top-3 left-4 right-4"
          } ${
            isMobile
              ? "flex-col gap-3"
              : isTablet
              ? "flex-col gap-2"
              : "flex justify-between"
          } flex ${isMobile ? "items-start" : "items-center"} z-10`}
        >
          {/* Token Info */}
          <div className="flex items-center gap-2 md:gap-4">
            <div
              className={`${
                isMobile ? "w-8" : isLargeScreen ? "w-12" : "w-12"
              } rounded-full overflow-hidden flex-shrink-0`}
            >
              <img
                src={tokenOne.img}
                alt={tokenOne.ticker}
                className="w-full object-cover"
              />
            </div>
            <p
              className={`${
                isMobile
                  ? "text-lg"
                  : isTablet
                  ? "text-xl"
                  : isLargeScreen
                  ? "text-2xl"
                  : "text-2xl"
              } font-semibold truncate text-white`}
            >
              {tokenOne.name}
            </p>
          </div>

          {/* Metrics */}
          <div
            className={`flex ${
              isMobile ? "gap-4" : isLargeScreen ? "gap-8" : "gap-6"
            } ${isMobile || isTablet ? "justify-start" : "justify-end"}`}
          >
            <div className="flex flex-col gap-1 items-center">
              <p
                className={`${
                  isMobile ? "text-xs" : isLargeScreen ? "text-base" : "text-sm"
                } opacity-80 text-gray-300`}
              >
                FDV
              </p>
              <p
                className={`${
                  isMobile ? "text-sm" : isLargeScreen ? "text-md" : "text-base"
                } font-medium text-white`}
              >
                {formatUSDCompact(fdv)}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <p
                className={`${
                  isMobile ? "text-xs" : isLargeScreen ? "text-base" : "text-sm"
                } opacity-80 text-gray-300`}
              >
                24H VOL
              </p>
              <p
                className={`${
                  isMobile ? "text-sm" : isLargeScreen ? "text-md" : "text-base"
                } font-medium text-white`}
              >
                {formatUSDCompact(vol)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={`w-full h-full ${showInternalHeader ? "pt-16" : "pt-2"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: isMobile ? 10 : isLargeScreen ? 20 : 15,
              right: isMobile ? 10 : isLargeScreen ? 20 : 15,
              left: isMobile ? 10 : isLargeScreen ? 20 : 15,
              bottom: isMobile ? 10 : isLargeScreen ? 20 : 15,
            }}
          >
            <XAxis
              scale="time"
              dataKey="ts"
              domain={["dataMin", "dataMax"]}
              type="number"
              ticks={monthTicks}
              tickFormatter={(ts) =>
                new Date(ts).toLocaleDateString(undefined, {
                  month: "short",
                  day: isMobile ? undefined : "numeric",
                })
              }
              tick={{
                fontSize: isMobile ? 10 : isLargeScreen ? 14 : 12,
                fill: "#888",
              }}
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
            />
            <YAxis
              dataKey="price"
              tickFormatter={(v) =>
                isMobile ? `${(v / 1000).toFixed(1)}K` : `${v.toLocaleString()}`
              }
              width={isMobile ? 40 : isLargeScreen ? 40 : 30}
              orientation="right"
              tickCount={isMobile ? 4 : isLargeScreen ? 6 : 5}
              tick={{
                fontSize: isMobile ? 10 : isLargeScreen ? 14 : 12,
                fill: "#888",
              }}
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#00b4ff"
              dot={false}
              strokeWidth={isMobile ? 1.5 : isLargeScreen ? 2.5 : 2}
              activeDot={{
                r: isMobile ? 3 : isLargeScreen ? 5 : 4,
                stroke: "#00b4ff",
                strokeWidth: isLargeScreen ? 3 : 2,
                fill: "#fff",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartSpot;
