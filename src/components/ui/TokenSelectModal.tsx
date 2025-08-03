// components/swap/TokenSelectModal.tsx
"use client";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Typography,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon, Search as SearchIcon } from "@mui/icons-material";
import { useState, useEffect } from "react";
import {
  useTokens,
  usePopularTokens,
  Token,
  SUPPORTED_CHAINS,
} from "@/hooks/useTokens";
import { useSpotStore, CrossChainToken } from "@/store/spotStore";
import { TOKENS } from "@/utils/TokenList";
import GlowBox from "./GlowBox";

export const TokenSelectModal = () => {
  const tokenOne = useSpotStore((s) => s.tokenOne);
  const tokenTwo = useSpotStore((s) => s.tokenTwo);
  const {
    modalOpen,
    modalTarget,
    modalChainId,
    isCrossChainMode,
    closeModal,
    setTokenOne,
    setTokenTwo,
  } = useSpotStore();

  // State for search and tab
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"popular" | "all">("popular");
  const [selectedChainId, setSelectedChainId] = useState<number>(1);

  // Update selected chain when modal opens with chain info
  useEffect(() => {
    if (modalChainId && isCrossChainMode) {
      setSelectedChainId(modalChainId);
    }
  }, [modalChainId, isCrossChainMode]);

  // Hooks for fetching tokens
  const chainIdToUse = isCrossChainMode ? selectedChainId : 1;
  const { data: allTokens, isLoading, error } = useTokens(chainIdToUse);
  const { data: popularTokens } = usePopularTokens(chainIdToUse);

  // Check if we have tokens from API
  const hasApiTokens = allTokens && allTokens.length > 0;

  // Determine which tokens to show
  const tokensToUse = (() => {
    if (activeTab === "popular") {
      return hasApiTokens ? popularTokens : TOKENS.slice(0, 8);
    } else {
      return hasApiTokens ? allTokens : TOKENS;
    }
  })();

  // Filter tokens based on search query
  const filteredTokens =
    tokensToUse?.filter(
      (token) =>
        token.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleTokenSelect = (token: Token) => {
    // Get the other token to avoid selecting the same token
    const otherToken = modalTarget === "tokenOne" ? tokenTwo : tokenOne;

    // For cross-chain, allow same token on different chains
    const isSameToken = isCrossChainMode
      ? otherToken.address === token.address &&
        otherToken.chainId === selectedChainId
      : otherToken.address === token.address;

    if (isSameToken) {
      return; // Don't allow selecting the exact same token
    }

    // Create cross-chain token with chainId
    const crossChainToken: CrossChainToken = isCrossChainMode
      ? { ...token, chainId: selectedChainId }
      : token;

    // Update the correct token based on modalTarget
    if (modalTarget === "tokenOne") {
      setTokenOne(crossChainToken);
    } else {
      setTokenTwo(crossChainToken);
    }

    closeModal();
    setSearchQuery(""); // Reset search on close
  };

  const handleModalClose = () => {
    closeModal();
    setSearchQuery(""); // Reset search on close
  };

  const handleChainChange = (event: any) => {
    setSelectedChainId(event.target.value);
  };

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: "popular" | "all"
  ) => {
    setActiveTab(newValue);
  };

  // Get the modal title
  const getModalTitle = () => {
    if (isCrossChainMode) {
      const chainName =
        SUPPORTED_CHAINS[selectedChainId]?.name || `Chain ${selectedChainId}`;
      const action = modalTarget === "tokenOne" ? "send" : "receive";
      return `Select ${action} token on ${chainName}`;
    }
    return modalTarget === "tokenOne"
      ? "Select sell token"
      : "Select buy token";
  };

  return (
    <Dialog
      open={modalOpen}
      onClose={handleModalClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "transparent",
          borderRadius: "16px",
          border: "1px solid #333",
          color: "white",
          minHeight: "600px",
          maxHeight: "80vh",
        },
      }}
    >
      <GlowBox>
        <DialogTitle
          sx={{
            backgroundColor: "transparent",
            color: "white",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 2,
          }}
        >
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {getModalTitle()}
          </Typography>
          <IconButton
            onClick={handleModalClose}
            sx={{
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            backgroundColor: "transparent",
            color: "white",
            p: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Chain Selector for Cross-Chain Mode */}
            {isCrossChainMode && (
              <FormControl fullWidth variant="outlined">
                <InputLabel
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&.Mui-focused": {
                      color: "#00F5E0",
                    },
                  }}
                >
                  Select Network
                </InputLabel>
                <Select
                  value={selectedChainId}
                  onChange={handleChainChange}
                  label="Select Network"
                  sx={{
                    backgroundColor: "#2a2a2a",
                    color: "white",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#444",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#666",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#00F5E0",
                    },
                    "& .MuiSvgIcon-root": {
                      color: "white",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: "primary.light",
                        border: "1px solid #444",
                        "& .MuiMenuItem-root": {
                          color: "white",
                          "&:hover": {
                            backgroundColor: "rgba(0, 245, 224, 0.1)",
                          },
                          "&.Mui-selected": {
                            backgroundColor: "rgba(0, 245, 224, 0.2)",
                          },
                        },
                      },
                    },
                  }}
                >
                  {Object.entries(SUPPORTED_CHAINS).map(([chainId, chain]) => (
                    <MenuItem key={chainId} value={Number(chainId)}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <span>{chain.icon}</span>
                        <span>{chain.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Search Input */}
            <TextField
              fullWidth
              placeholder="Search by name or symbol"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: "primary.light",
                  color: "white",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#444",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#666",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#00F5E0",
                  },
                },
              }}
              sx={{
                "& .MuiInputBase-input::placeholder": {
                  color: "rgba(255, 255, 255, 0.5)",
                  opacity: 1,
                },
              }}
            />

            {/* Token Type Tabs */}
            <Box
              sx={{
                backgroundColor: "primary.light",
                borderRadius: "12px",
                p: 0.5,
                "& .MuiTabs-root": {
                  minHeight: "auto",
                },
                "& .MuiTab-root": {
                  minHeight: "auto",
                  padding: "8px 16px",
                  margin: 0,
                  borderRadius: "8px",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "14px",
                  fontWeight: 500,
                  textTransform: "none",
                  transition: "all 0.2s",
                  "&:hover": {
                    color: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                  },
                  "&.Mui-selected": {
                    backgroundColor: "#00F5E0",
                    color: "#000",
                    "&:hover": {
                      backgroundColor: "#00F5E0",
                      color: "#000",
                    },
                  },
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
              >
                <Tab value="popular" label="Popular" />
                <Tab
                  value="all"
                  label={`All Tokens (${
                    hasApiTokens ? allTokens?.length || 0 : TOKENS.length
                  })`}
                />
              </Tabs>
            </Box>

            {/* Status Messages */}
            {isLoading && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 4,
                  gap: 2,
                }}
              >
                <CircularProgress size={20} sx={{ color: "#00F5E0" }} />
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                >
                  {isCrossChainMode
                    ? `Loading tokens from ${SUPPORTED_CHAINS[selectedChainId]?.name}...`
                    : "Loading tokens from 1inch..."}
                </Typography>
              </Box>
            )}

            {error && !hasApiTokens && (
              <Alert
                severity="warning"
                sx={{
                  backgroundColor: "rgba(255, 193, 7, 0.1)",
                  border: "1px solid rgba(255, 193, 7, 0.3)",
                  color: "#FFB800",
                  "& .MuiAlert-icon": {
                    color: "#FFB800",
                  },
                }}
              >
                {isCrossChainMode
                  ? `Using fallback tokens for ${SUPPORTED_CHAINS[selectedChainId]?.name}`
                  : "Using fallback tokens. Failed to load from 1inch API."}
              </Alert>
            )}

            {hasApiTokens && !isLoading && (
              <Alert
                severity="success"
                sx={{
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  border: "1px solid rgba(76, 175, 80, 0.3)",
                  color: "#4CAF50",
                  "& .MuiAlert-icon": {
                    color: "#4CAF50",
                  },
                }}
              >
                ✅ Loaded {allTokens?.length || 0} tokens
                {isCrossChainMode &&
                  ` from ${SUPPORTED_CHAINS[selectedChainId]?.name}`}
              </Alert>
            )}
          </Box>

          {/* Token List */}
          {!isLoading && (
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                maxHeight: "300px",
                borderTop: "1px solid #333",
              }}
            >
              {filteredTokens.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                  >
                    {searchQuery ? "No tokens found" : "No tokens available"}
                  </Typography>
                </Box>
              ) : (
                filteredTokens.map((token, i) => {
                  // Check if this token is already selected
                  const otherToken =
                    modalTarget === "tokenOne" ? tokenTwo : tokenOne;
                  const isAlreadySelected = isCrossChainMode
                    ? otherToken.address === token.address &&
                      otherToken.chainId === selectedChainId
                    : otherToken.address === token.address;

                  return (
                    <Box
                      key={`${token.address}-${selectedChainId}-${i}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 2,
                        cursor: isAlreadySelected ? "not-allowed" : "pointer",
                        opacity: isAlreadySelected ? 0.5 : 1,
                        borderBottom: "1px solid #333",
                        transition: "background-color 0.2s",
                        "&:hover": {
                          backgroundColor: isAlreadySelected
                            ? "transparent"
                            : "rgba(255, 255, 255, 0.05)",
                        },
                        "&:last-child": {
                          borderBottom: "none",
                        },
                      }}
                      onClick={() =>
                        !isAlreadySelected && handleTokenSelect(token)
                      }
                    >
                      <Avatar
                        src={token.img}
                        alt={token.ticker}
                        sx={{ width: 32, height: 32, mr: 2 }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://token-icons.1inch.io/${token.address}.png`;
                        }}
                      />

                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: "white",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          {token.name}
                          {isCrossChainMode && (
                            <Typography
                              variant="caption"
                              sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                            >
                              {SUPPORTED_CHAINS[selectedChainId]?.icon}
                            </Typography>
                          )}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                        >
                          {token.ticker}
                          {isCrossChainMode && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1 }}
                            >
                              on {SUPPORTED_CHAINS[selectedChainId]?.name}
                            </Typography>
                          )}
                        </Typography>
                      </Box>

                      {/* Show if already selected */}
                      {isAlreadySelected && (
                        <Chip
                          label="Selected"
                          size="small"
                          sx={{
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "11px",
                          }}
                        />
                      )}

                      {/* Show chain badge for cross-chain */}
                      {isCrossChainMode && !isAlreadySelected && (
                        <Chip
                          label={SUPPORTED_CHAINS[selectedChainId]?.symbol}
                          size="small"
                          sx={{
                            backgroundColor: "rgba(33, 150, 243, 0.1)",
                            color: "#2196F3",
                            fontSize: "11px",
                          }}
                        />
                      )}

                      {/* Show source badge for regular tokens */}
                      {!isCrossChainMode &&
                        hasApiTokens &&
                        !isAlreadySelected && (
                          <Chip
                            label="1inch"
                            size="small"
                            sx={{
                              backgroundColor: "rgba(76, 175, 80, 0.1)",
                              color: "#4CAF50",
                              fontSize: "11px",
                            }}
                          />
                        )}
                    </Box>
                  );
                })
              )}
            </Box>
          )}

          {/* Footer info */}
          <Box
            sx={{
              p: 2,
              borderTop: "1px solid #333",
              backgroundColor: "primary.dark",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              {isCrossChainMode
                ? `${filteredTokens.length} tokens on ${SUPPORTED_CHAINS[selectedChainId]?.name}`
                : hasApiTokens
                ? `✅ ${allTokens?.length || 0} tokens loaded from 1inch API`
                : `Using ${TOKENS.length} fallback tokens`}
            </Typography>
          </Box>
        </DialogContent>
      </GlowBox>
    </Dialog>
  );
};
