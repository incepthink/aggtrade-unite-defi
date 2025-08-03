"use client";

import GlowBox from "@/components/ui/GlowBox";
import ChartSpot, { ChartHeader } from "@/components/chart/ChartSpot";
import SwapContainer, { SwapType } from "@/components/swap/SwapContainer";
import TokenSelect from "@/components/ui/TokenSelect";
import { TokenSelectModal } from "@/components/ui/TokenSelectModal";
import ActiveLimitOrders from "@/components/swap/swapTypes/LimitOrder/ActiveLimitOrders";
import { Box, Container, Stack } from "@mui/material";
import React, { useState } from "react";

const page = () => {
  const [activeSwapTab, setActiveSwapTab] = useState<SwapType>("classic");

  const handleTabChange = (tab: SwapType) => {
    setActiveSwapTab(tab);
  };
  return (
    <Container
      maxWidth="xl"
      sx={{
        px: { xs: 1, sm: 2, md: 3 },
        py: { xs: 1, sm: 2 },
        maxWidth: { xs: "100%", lg: "1400px", xl: "1800px" }, // Increased for wider layout
      }}
    >
      <TokenSelectModal />
      <Stack spacing={{ xs: 2, sm: 2 }}>
        <Box>
          <TokenSelect />
        </Box>

        {/* Main Content Area - Responsive Layout */}
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems="stretch"
        >
          {/* Chart Section */}
          <Box
            sx={{
              flex: { lg: 1.2 }, // Adjusted ratio
              order: { xs: 2, lg: 1 },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, sm: 2 },
            }}
          >
            {/* Chart Header - Only show outside on mobile/tablet */}
            <Box
              sx={{
                display: { md: "block", lg: "none" },
                mb: { xs: 0, md: 1, lg: 0 },
              }}
            >
              <Box sx={{ display: { xs: "block", md: "none" }, mt: 2, mb: 1 }}>
                <GlowBox
                  sx={{
                    p: 0,
                    overflow: "hidden",
                  }}
                >
                  <ChartHeader />
                </GlowBox>
              </Box>
            </Box>

            {/* Chart Container */}
            <Box
              sx={{
                maxHeight: {
                  xs: "400px",
                  sm: "500px",
                  md: "600px",
                  lg: "600px",
                  xl: "700px",
                },
                height: {
                  xs: "350px",
                  sm: "450px",
                  md: "550px",
                  lg: "550px",
                  xl: "560px",
                },
                overflow: "hidden",
              }}
            >
              <GlowBox
                sx={{
                  height: "100%",
                  maxHeight: "100%",
                  position: "relative",
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
                  backgroundSize: { xs: "20px 20px", sm: "30px 30px" },
                  overflow: "hidden",
                  p: { xs: 0, md: 2 },
                }}
              >
                <ChartSpot />
              </GlowBox>
            </Box>
            {activeSwapTab === "limit" && (
              <Box
                sx={{
                  flex: { lg: 1.2 },
                  order: { xs: 3, lg: 3 },
                  minWidth: { xs: "auto", lg: "500px" },
                  overflow: "hidden",
                }}
              >
                <GlowBox
                  sx={{
                    height: "100%",
                    maxHeight: "100%",
                    minHeight: { xs: "400px", md: "500px" },
                    overflow: "hidden",
                    "& .MuiBox-root": {
                      overflow: "auto",
                    },
                  }}
                >
                  <ActiveLimitOrders />
                </GlowBox>
              </Box>
            )}
          </Box>

          {/* Swap Section */}
          <Box
            sx={{
              flex: { lg: activeSwapTab === "limit" ? 1 : 1.8 }, // Adjust flex based on active tab
              order: { xs: 1, lg: 2 },
              minWidth: { xs: "auto", lg: "550px" }, // Responsive height
              maxWidth: { lg: "400px", xl: "450px" }, // Limit max width of swap panel
              overflow: "hidden",
            }}
          >
            <GlowBox
              sx={{
                height: "100%",
                maxHeight: "100%",
                minHeight: { xs: "400px", sm: "450px" },
                overflow: "hidden",
                p: { xs: 2, md: 3 },
              }}
            >
              <SwapContainer onTabChange={handleTabChange} />
            </GlowBox>
          </Box>

          {/* Active Limit Orders - Only show when limit tab is active */}
        </Stack>

        {/* Active Limit Orders Section - Mobile Full Width */}
        {activeSwapTab === "limit" && (
          <Box sx={{ display: { xs: "block", lg: "none" } }}>
            <GlowBox
              sx={{
                minHeight: { xs: "400px" },
                "& .MuiBox-root": {
                  overflow: "auto",
                },
              }}
            >
              <ActiveLimitOrders />
            </GlowBox>
          </Box>
        )}
      </Stack>
    </Container>
  );
};

export default page;
