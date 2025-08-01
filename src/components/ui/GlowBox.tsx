import { Box, type BoxProps } from "@mui/material";
import React from "react";

type GlowBoxProps = BoxProps & { children: React.ReactNode };

const GlowBox: React.FC<GlowBoxProps> = ({ children, sx = {}, ...rest }) => {
  return (
    <Box
      sx={{
        boxShadow: "inset 0 1px 32px rgba(0, 255, 233, 0.6)",
        backgroundColor: "primary.dark",
        borderRadius: 2,
        p: 2,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default GlowBox;
