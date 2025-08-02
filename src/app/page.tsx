import GlowBox from "@/components/ui/GlowBox";
import ChartSpot, { ChartHeader } from "@/components/chart/ChartSpot";
import SwapContainer from "@/components/swap/SwapContainer";
// import TokenBalancesCard from "@/components/spot/TokenBalancesCard";
import TokenSelect from "@/components/ui/TokenSelect";
import { TokenSelectModal } from "@/components/ui/TokenSelectModal";
import { Box, Container, Stack } from "@mui/material";
import React from "react";

const page = () => {
  return (
    <Container
      maxWidth="xl"
      sx={{
        px: { xs: 1, sm: 2, md: 3 }, // Responsive padding
        py: { xs: 1, sm: 2 }, // Responsive vertical padding
        maxWidth: { xs: "100%", lg: "1400px", xl: "1600px" }, // Limit max width on large screens
      }}
    >
      <TokenSelectModal />
      <Stack spacing={{ xs: 2, sm: 2 }}>
        {" "}
        {/* Responsive spacing */}
        <Box>
          <TokenSelect />
        </Box>
        {/* Main Content Area - Responsive Layout */}
        <Stack
          direction={{ xs: "column", lg: "row" }} // Stack vertically on mobile, horizontally on large screens
          spacing={{ xs: 1, sm: 2 }}
          alignItems="stretch"
        >
          {/* Chart Section */}
          <Box
            sx={{
              flex: { lg: 2 },
              order: { xs: 2, lg: 1 }, // Chart comes second on mobile, first on desktop
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
                    p: 0, // Remove default padding
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
                  p: { xs: 0, md: 2 }, // No padding on mobile, normal padding on medium screens and up
                }}
              >
                <ChartSpot />
              </GlowBox>
            </Box>
          </Box>

          {/* Swap Section */}
          <Box
            sx={{
              flex: { lg: 1 },
              order: { xs: 1, lg: 2 }, // Swap comes first on mobile, second on desktop
              minWidth: { xs: "auto", lg: "550px" }, // Responsive height
              maxWidth: { lg: "400px", xl: "450px" }, // Limit max width of swap panel
              overflow: "hidden", // Prevent content from spilling out
            }}
          >
            <GlowBox
              sx={{
                height: "100%",
                maxHeight: "100%", // Ensure GlowBox respects parent height
                minHeight: { xs: "400px", sm: "450px" }, // Ensure adequate height on mobile
                overflow: "hidden", // Prevent overflow
              }}
            >
              <SwapContainer />
            </GlowBox>
          </Box>
        </Stack>
        {/* Token Balances Section */}
        {/* <Box>
          <GlowBox
            sx={{
              minHeight: { xs: "200px", sm: "250px" }, // Responsive minimum height
              "& .MuiBox-root": {
                // Style nested boxes if needed
                overflow: "auto", // Handle overflow on small screens
              },
            }}
          >
            <TokenBalancesCard />
          </GlowBox>
        </Box> */}
      </Stack>
    </Container>
  );
};

export default page;
