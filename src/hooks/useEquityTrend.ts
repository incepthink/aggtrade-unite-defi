// hooks/useEquityTrend.ts - Updated to use proxy routes
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export interface EquityDataPoint {
  t: string; // formatted date
  v: number; // USD value
  timestamp: number; // raw timestamp
}

// Fetch historical portfolio values from proxy
async function fetchHistoricalPortfolio(
  address: string,
  timeRange: "7" | "30"
): Promise<EquityDataPoint[]> {
  if (!address) {
    throw new Error("Address is required");
  }

  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));

    // Format dates for API (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    console.log(
      `Fetching historical data from ${startDateStr} to ${endDateStr}`
    );

    // Fetch historical portfolio values via proxy
    const response = await fetch(
      `/api/proxy/1inch/portfolio-history?addresses=${address}&start=${startDateStr}&end=${endDateStr}`
    );

    if (!response.ok) {
      throw new Error(`Historical portfolio API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Historical Portfolio Data:", data);

    // Process the response data
    const historyData: EquityDataPoint[] = [];

    if (data?.result) {
      const history = data.result;

      // Convert the history data to our format
      history.forEach((point: any) => {
        const timestamp = new Date(point.timestamp).getTime();
        const date = new Date(timestamp);

        // Format date based on time range
        let formattedDate: string;
        if (timeRange === "7") {
          // For 7 days, show day name (e.g., "Mon", "Tue")
          formattedDate = date.toLocaleDateString("en-US", {
            weekday: "short",
          });
        } else {
          // For 30 days, show month/day (e.g., "Jan 15")
          formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }

        historyData.push({
          t: formattedDate,
          v: parseFloat(point.value_usd) || 0,
          timestamp: timestamp,
        });
      });
    }

    // If no historical data, try to get current portfolio value as fallback
    if (historyData.length === 0) {
      try {
        const currentResponse = await fetch(
          `/api/proxy/1inch/portfolio-overview?addresses=${address}`
        );

        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          const currentValue =
            parseFloat(currentData?.result?.[address]?.absoluteUsdValue) || 0;

          historyData.push({
            t: "Today",
            v: currentValue,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error fetching current portfolio value:", error);
      }
    }

    // Sort by timestamp to ensure proper order
    historyData.sort((a, b) => a.timestamp - b.timestamp);

    console.log("Processed equity data:", historyData);
    return historyData;
  } catch (error) {
    console.error(
      "Error fetching historical portfolio data from proxy:",
      error
    );
    throw error;
  }
}

// Generate mock data as fallback
function generateMockEquityData(timeRange: "7" | "30"): EquityDataPoint[] {
  const days = parseInt(timeRange);
  const mockData: EquityDataPoint[] = [];
  const baseValue = Math.random() * 5000 + 1000; // Random base between $1k-$6k

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    let formattedDate: string;
    if (timeRange === "7") {
      formattedDate = date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    // Generate realistic portfolio fluctuation (±5% daily)
    const dayProgress = (days - i) / days;
    const trend = Math.sin(dayProgress * Math.PI) * 0.2; // Some upward trend
    const noise = (Math.random() - 0.5) * 0.1; // ±5% random noise
    const value = baseValue * (1 + trend + noise);

    mockData.push({
      t: formattedDate,
      v: Math.max(0, value), // Ensure non-negative
      timestamp: date.getTime(),
    });
  }

  return mockData;
}

// Custom hook for equity trend
export function useEquityTrend({
  timeRange = "7",
  enabled = true,
}: {
  timeRange?: "7" | "30";
  enabled?: boolean;
}) {
  const { address, isConnected } = useAccount();

  return useQuery({
    queryKey: ["equityTrend", address, timeRange],
    queryFn: async () => {
      try {
        return await fetchHistoricalPortfolio(address!, timeRange);
      } catch (error) {
        console.warn(
          "Failed to fetch real historical data, using mock data:",
          error
        );
        // Return mock data as fallback
        return generateMockEquityData(timeRange);
      }
    },
    enabled: Boolean(enabled && isConnected && address),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on API key errors
      if (error?.message?.includes("40")) {
        return false;
      }
      return failureCount < 1; // Only retry once
    },
    retryDelay: 2000,
  });
}
