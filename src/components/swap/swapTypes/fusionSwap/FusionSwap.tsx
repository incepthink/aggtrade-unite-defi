// components/swap/FusionSwap.tsx
"use client";

import crypto from "crypto";
import {
  DownOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import {
  Input,
  Popover,
  Radio,
  message,
  Select,
  Slider,
  Badge,
  Progress,
} from "antd";
import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { formatUnits, type Address } from "viem";
import { useAccount, useSignTypedData } from "wagmi";
import { TOKENS } from "@/utils/TokenList";
import MaxButton from "../../MaxButton";
import "../../index.css";
import { useSpotStore } from "@/store/spotStore";
import { GradientConnectButton } from "@/components/ui/Navbar";

const { Option } = Select;

/* ---------- interfaces ---------- */
interface Token {
  address: Address;
  name: string;
  ticker: string;
  img: string;
  decimals: number;
}

interface FusionQuote {
  quoteId: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  marketAmount: string;
  feeToken: string;
  recommended_preset: string;
  presets: {
    [key: string]: {
      auctionDuration: number;
      auctionStartAmount: string;
      auctionEndAmount: string;
      startAmount: string;
      startAuctionIn: number;
      initialRateBump: number;
      tokenFee: string;
      bankFee: string;
      allowPartialFills: boolean;
      allowMultipleFills: boolean;
      estP: number;
      exclusiveResolver: string | null;
      gasCost: {
        gasBumpEstimate: number;
        gasPriceEstimate: string;
      };
      points: Array<{
        coefficient: number;
        delay: number;
      }>;
    };
  };
  settlementAddress: string;
  gas: number;
  priceImpactPercent: number;
  prices: {
    usd: {
      fromToken: string;
      toToken: string;
    };
  };
  volume: {
    usd: {
      fromToken: string;
      toToken: string;
    };
  };
  whitelist: string[];
  tokenConversion?: {
    originalFromToken: string;
    originalToToken: string;
    adjustedFromToken: string;
    adjustedToToken: string;
    convertedETHtoWETH: boolean;
  };
}

interface FusionOrder {
  orderHash: string;
  quoteId?: string;
  status: string;
}

enum OrderStatus {
  Created = "created",
  Pending = "pending",
  PartiallyFilled = "partially-filled",
  Filled = "filled",
  Expired = "expired",
  Cancelled = "cancelled",
}

interface OrderStatusData {
  status: OrderStatus;
  orderHash: string;
  fills?: Array<{
    txHash: string;
    filledMakingAmount: string;
    filledTakingAmount: string;
  }>;
  createdAt: number;
}

// Helper function to transform BigInts to strings for JSON serialization
function transformBigInts(obj: any): any {
  if (typeof obj === "bigint") {
    return obj.toString();
  } else if (Array.isArray(obj)) {
    return obj.map(transformBigInts);
  } else if (obj !== null && typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = transformBigInts(value);
    }
    return result;
  }
  return obj;
}

function FusionSwap() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  /* --------- global token selection --------- */
  const tokenOne = useSpotStore((s) => s.tokenOne);
  const tokenTwo = useSpotStore((s) => s.tokenTwo);
  const setTokenOne = useSpotStore((s) => s.setTokenOne);
  const setTokenTwo = useSpotStore((s) => s.setTokenTwo);
  const openModal = useSpotStore((s) => s.openModal);
  const openTokenTwoModal = useSpotStore((s) => s.openModalForTokenTwo);

  /* --------- local component state --------- */
  const [tokenOneAmount, setT1Amount] = useState("");
  const [tokenTwoAmount, setT2Amount] = useState("");
  const [quote, setQuote] = useState<FusionQuote | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("fast");
  const [msgApi, contextHolder] = message.useMessage();
  const [isQuoting, setIsQuoting] = useState(false);

  /* --------- fusion order tracking --------- */
  const [currentOrder, setCurrentOrder] = useState<FusionOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderPollingInterval, setOrderPollingInterval] =
    useState<NodeJS.Timeout | null>(null);

  /* --------- preset options --------- */
  const presetOptions = [
    {
      value: "fast",
      label: "Fast",
      description: "Quick execution, higher gas cost",
    },
    {
      value: "medium",
      label: "Medium",
      description: "Balanced speed and gas cost",
    },
    {
      value: "slow",
      label: "Slow",
      description: "Lower gas cost, longer execution time",
    },
  ];

  /* --------- debounced quote fetch --------- */
  const debouncedFetchQuote = useCallback(
    debounce((amount: string) => {
      if (amount && parseFloat(amount) > 0) {
        fetchFusionQuote(amount);
      }
    }, 500),
    [tokenOne.address, tokenTwo.address, address]
  );

  /* --------- amount change handlers --------- */
  const changeBuyAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT2Amount(v);
    if (v && quote) {
      const ratio =
        parseFloat(
          formatUnits(BigInt(quote.toTokenAmount), tokenTwo.decimals)
        ) /
        parseFloat(
          formatUnits(BigInt(quote.fromTokenAmount), tokenOne.decimals)
        );
      setT1Amount((parseFloat(v) / ratio).toFixed(6));
    } else {
      setT1Amount("");
    }
  };

  const changeSellAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT1Amount(v);

    if (v && parseFloat(v) > 0) {
      setT2Amount("");
      debouncedFetchQuote(v);
    } else {
      setT2Amount("");
      setQuote(null);
    }
  };

  const setMaxBal = (bal: string) => {
    setT1Amount(bal);
    if (bal && parseFloat(bal) > 0) {
      setT2Amount("");
      debouncedFetchQuote(bal);
    }
  };

  /* --------- switch tokens --------- */
  const switchTokens = () => {
    setQuote(null);
    setT1Amount("");
    setT2Amount("");
    const one = tokenOne,
      two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
  };

  /* --------- fetch fusion quote --------- */
  const fetchFusionQuote = async (amount: string) => {
    if (!amount || !address || !isConnected) return;

    setIsQuoting(true);
    try {
      const amountWei = BigInt(
        (parseFloat(amount) * 10 ** tokenOne.decimals).toFixed(0)
      );

      const { data } = await axios.post(`/api/proxy/1inch/fusion/quote`, {
        fromTokenAddress: tokenOne.address,
        toTokenAddress: tokenTwo.address,
        amount: amountWei.toString(),
        walletAddress: address,
      });

      if (data && !data.error) {
        setQuote(data);
        console.log("Fusion Quote:", data);

        // Use recommended preset from API
        if (data.recommended_preset) {
          setSelectedPreset(data.recommended_preset);
        }

        // Set tokenTwo amount based on toTokenAmount
        const estimatedAmount = data.toTokenAmount;
        setT2Amount(formatUnits(BigInt(estimatedAmount), tokenTwo.decimals));
      } else {
        throw new Error(data.error || "Failed to get quote");
      }
    } catch (err: any) {
      console.error("Quote error:", err);

      if (err.response?.data?.error?.includes("minimum")) {
        msgApi.warning(
          "Amount too small for Fusion swap. Try Classic swap instead."
        );
      } else if (err.response?.data?.error?.includes("not supported")) {
        msgApi.warning(
          "Token pair not supported for Fusion. Try Classic swap instead."
        );
      } else {
        msgApi.error("Failed to fetch Fusion quote");
      }
      setQuote(null);
    } finally {
      setIsQuoting(false);
    }
  };

  /* --------- preset change handler --------- */
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    if (quote && quote.presets[preset]) {
      const newPreset = quote.presets[preset];
      const estimatedAmount = newPreset.auctionStartAmount;
      setT2Amount(formatUnits(BigInt(estimatedAmount), tokenTwo.decimals));
    }
  };

  /* --------- create fusion order with EIP-712 signature --------- */
  const createFusionOrder = async () => {
    if (!tokenOneAmount || !address || !isConnected || !quote) {
      msgApi.warning(
        "Connect wallet, enter an amount, and get a valid quote before swapping."
      );
      return;
    }

    setIsCreatingOrder(true);
    try {
      const selectedPresetData = quote.presets[selectedPreset];

      // Generate a random salt (32-byte hex string)
      const salt = "0x" + crypto.randomBytes(32).toString("hex");

      // Create the order structure matching SDK output
      const order = {
        salt: salt as `0x${string}`,
        makerAsset: tokenOne.address as `0x${string}`,
        takerAsset: tokenTwo.address as `0x${string}`,
        maker: address as `0x${string}`,
        receiver: address as `0x${string}`,
        makingAmount: quote.fromTokenAmount,
        takingAmount: selectedPresetData.auctionEndAmount, // Minimum amount from preset
        makerTraits: "0", // Default traits
      };

      // EIP-712 domain and types for 1inch Fusion
      const domain = {
        name: "1inch Fusion",
        version: "1",
        chainId: 1, // Ethereum mainnet
        verifyingContract: quote.settlementAddress as `0x${string}`,
      };

      const types = {
        Order: [
          { name: "salt", type: "uint256" },
          { name: "makerAsset", type: "address" },
          { name: "takerAsset", type: "address" },
          { name: "maker", type: "address" },
          { name: "receiver", type: "address" },
          { name: "makingAmount", type: "uint256" },
          { name: "takingAmount", type: "uint256" },
          { name: "makerTraits", type: "uint256" },
        ],
      };

      console.log("Order to sign:", order);
      console.log("Domain:", domain);
      console.log("Types:", types);

      // Sign the order using EIP-712
      const orderSignature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "Order",
        message: order,
      });

      console.log("Order signed, submitting to API...");

      // Create proper extension for basic Fusion order
      // This matches what the SDK would generate for a basic order
      const extension =
        "0x" +
        "0000000000000000000000000000000000000000000000000000000000000040" + // offset to auction bytes
        "0000000000000000000000000000000000000000000000000000000000000080" + // offset to interactions bytes
        "0000000000000000000000000000000000000000000000000000000000000000" + // auction bytes length (0)
        "0000000000000000000000000000000000000000000000000000000000000000"; // interactions bytes length (0)

      // Submit the signed order to 1inch with correct structure
      const { data: submitData } = await axios.post(
        `/api/proxy/1inch/fusion/order`,
        {
          order: order, // Use the order structure directly
          signature: orderSignature,
          quoteId: quote.quoteId,
          extension: extension, // Provide proper extension
        }
      );

      if (submitData && !submitData.error) {
        const fusionOrder: FusionOrder = {
          orderHash: submitData.orderHash,
          quoteId: quote.quoteId,
          status: submitData.status || "created",
        };

        setCurrentOrder(fusionOrder);
        msgApi.success(
          "Fusion order created successfully! Monitoring execution..."
        );
        startOrderPolling(submitData.orderHash);

        setT1Amount("");
        setT2Amount("");
        setQuote(null);
      } else {
        throw new Error(submitData.error || "Failed to submit order");
      }
    } catch (error: any) {
      console.error("Order creation error:", error);
      if (error.message?.includes("User rejected")) {
        msgApi.warning("Order signature was rejected");
      } else {
        msgApi.error(
          `Failed to create Fusion order: ${
            error.response?.data?.error || error.message
          }`
        );
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  /* --------- order status polling --------- */
  const startOrderPolling = (orderHash: string) => {
    if (orderPollingInterval) {
      clearInterval(orderPollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(
          `/api/proxy/1inch/fusion/status?orderHash=${orderHash}`
        );

        if (data && !data.error) {
          setOrderStatus(data);

          if (
            [
              OrderStatus.Filled,
              OrderStatus.Expired,
              OrderStatus.Cancelled,
            ].includes(data.status)
          ) {
            clearInterval(interval);
            setOrderPollingInterval(null);

            if (data.status === OrderStatus.Filled) {
              msgApi.success("🎉 Fusion swap completed successfully!");
            } else if (data.status === OrderStatus.Expired) {
              msgApi.warning(
                "Order expired. You can try again with different settings."
              );
            } else if (data.status === OrderStatus.Cancelled) {
              msgApi.info("Order was cancelled.");
            }
          }
        }
      } catch (err: any) {
        console.error("Status polling error:", err);
      }
    }, 3000); // Poll every 3 seconds

    setOrderPollingInterval(interval);
  };

  /* --------- cleanup on unmount --------- */
  useEffect(() => {
    return () => {
      if (orderPollingInterval) {
        clearInterval(orderPollingInterval);
      }
    };
  }, [orderPollingInterval]);

  /* --------- settings popover --------- */
  const settings = (
    <div className="space-y-4 w-64">
      <div>
        <div className="mb-2">Execution Preset</div>
        <Select
          value={selectedPreset}
          onChange={handlePresetChange}
          className="w-full"
          disabled={isQuoting}
        >
          {presetOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              <div>
                <div>{option.label}</div>
                <div className="text-xs text-gray-500">
                  {option.description}
                </div>
              </div>
            </Option>
          ))}
        </Select>
      </div>

      <div className="text-xs text-gray-400 border-t pt-2">
        💡 Fusion swaps are gas-free and MEV-protected
      </div>
    </div>
  );

  const isSwapDisabled =
    !tokenOneAmount || !isConnected || !quote || isCreatingOrder || isQuoting;

  /* --------- get status color --------- */
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Filled:
        return "green";
      case OrderStatus.PartiallyFilled:
        return "blue";
      case OrderStatus.Pending:
        return "orange";
      case OrderStatus.Expired:
        return "red";
      case OrderStatus.Cancelled:
        return "gray";
      default:
        return "blue";
    }
  };

  /* ---------- render ---------- */
  return (
    <>
      {contextHolder}
      <div className="tradeBox p-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <h4 className="text-xl">Fusion Swap</h4>
            <Badge
              count="GAS-FREE"
              style={{
                backgroundColor: "#00F5E0",
                color: "#000",
                fontSize: "10px",
                height: "18px",
                lineHeight: "18px",
              }}
            />
          </div>
          <Popover
            content={settings}
            title="Fusion Settings"
            trigger="click"
            placement="bottomRight"
          >
            <SettingOutlined className="text-white text-xl hover:rotate-90 transition duration-300 hover:text-[#00F5E0]" />
          </Popover>
        </div>

        {/* Current Order Status */}
        {currentOrder && orderStatus && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Badge color={getStatusColor(orderStatus.status)} />
                <span className="text-sm text-white capitalize">
                  {orderStatus.status.replace("-", " ")}
                </span>
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Order: {currentOrder.orderHash.slice(0, 10)}...
              {currentOrder.orderHash.slice(-8)}
            </div>
          </div>
        )}

        {/* amounts */}
        <div className="inputs">
          <div className="input-container">
            <Input
              placeholder="0"
              value={tokenOneAmount}
              onChange={changeSellAmount}
              disabled={isQuoting || isCreatingOrder}
            />
            <span className="input-tag">Sell</span>
          </div>

          <div className="switch-container">
            <div className="line" />
            <div className="switchButton" onClick={switchTokens}>
              <SwapVertIcon sx={{ fontSize: 28 }} />
            </div>
            <div className="line" />
          </div>

          <div className="input-container">
            <Input
              placeholder="0"
              value={isQuoting ? "Calculating..." : tokenTwoAmount}
              onChange={changeBuyAmount}
              disabled={isQuoting || isCreatingOrder}
            />
            <span className="input-tag">Buy</span>
          </div>

          {/* token selectors */}
          <div className="assetOneContainer">
            <div className="assetOne" onClick={openModal}>
              <img
                src={tokenOne.img}
                alt="assetOneLogo"
                className="assetLogo"
              />
              <p className="text-white">{tokenOne.ticker}</p> <DownOutlined />
            </div>
            <div className="max-btn-container">
              <MaxButton token={tokenOne.address} setToken={setMaxBal} />
            </div>
          </div>

          <div className="assetTowContainer">
            <div className="assetTwo" onClick={openTokenTwoModal}>
              <img
                src={tokenTwo.img}
                alt="assetTwoLogo"
                className="assetLogo"
              />
              <p className="text-white">{tokenTwo.ticker}</p> <DownOutlined />
            </div>
          </div>
        </div>

        {/* Quote Information */}
        {quote && !isQuoting && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Est. Receive:</span>
              <span className="text-white">
                {quote.presets[selectedPreset]
                  ? formatUnits(
                      BigInt(quote.presets[selectedPreset].auctionStartAmount),
                      tokenTwo.decimals
                    )
                  : formatUnits(
                      BigInt(quote.toTokenAmount),
                      tokenTwo.decimals
                    )}{" "}
                {tokenTwo.ticker}
              </span>
            </div>
            {quote.presets[selectedPreset] && (
              <>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-400">Min. Receive:</span>
                  <span className="text-white">
                    {formatUnits(
                      BigInt(quote.presets[selectedPreset].auctionEndAmount),
                      tokenTwo.decimals
                    )}{" "}
                    {tokenTwo.ticker}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-400">Auction Duration:</span>
                  <span className="text-white">
                    {Math.floor(
                      quote.presets[selectedPreset].auctionDuration / 60
                    )}
                    m {quote.presets[selectedPreset].auctionDuration % 60}s
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-400">Price Impact:</span>
                  <span className="text-white">
                    {quote.priceImpactPercent.toFixed(2)}%
                  </span>
                </div>
                {quote.presets[selectedPreset].tokenFee !== "0" && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-400">Fee:</span>
                    <span className="text-white">
                      {formatUnits(
                        BigInt(quote.presets[selectedPreset].tokenFee),
                        tokenTwo.decimals
                      )}{" "}
                      {tokenTwo.ticker}
                    </span>
                  </div>
                )}
              </>
            )}
            {quote.tokenConversion?.convertedETHtoWETH && (
              <div className="mt-2 p-2 bg-blue-900/30 rounded text-xs text-blue-300">
                ℹ️ Using WETH instead of ETH for Fusion compatibility
              </div>
            )}
            <div className="mt-2 p-2 bg-green-900/30 rounded text-xs text-green-300">
              ✨ Recommended: {quote.recommended_preset.toUpperCase()} preset
            </div>
          </div>
        )}

        {/* swap button */}
        {isConnected ? (
          <div
            className={`swapButton ${isSwapDisabled ? "disabled" : ""}`}
            onClick={isSwapDisabled ? undefined : createFusionOrder}
            style={{
              opacity: isSwapDisabled ? 0.6 : 1,
              cursor: isSwapDisabled ? "not-allowed" : "pointer",
            }}
          >
            {isCreatingOrder
              ? "Creating Order..."
              : isQuoting
              ? "Getting Quote..."
              : "Create Fusion Order"}
          </div>
        ) : (
          <GradientConnectButton />
        )}

        {/* Info banner */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="flex items-start gap-2">
            <InfoCircleOutlined className="text-blue-400 mt-0.5" />
            <div className="text-xs text-blue-300">
              <div className="font-medium mb-1">About Fusion Swaps:</div>
              <ul className="space-y-1 text-blue-200">
                <li>
                  • <strong>Zero gas fees</strong> - resolvers pay for execution
                </li>
                <li>
                  • <strong>Better prices</strong> (~9.5% savings) via Dutch
                  auction
                </li>
                <li>
                  • <strong>MEV protection</strong> against sandwich attacks
                </li>
                <li>
                  • <strong>Cross-DEX liquidity</strong> access
                </li>
                <li>
                  • <strong>Partial fills</strong> for large orders
                </li>
              </ul>
              <div className="mt-2 text-yellow-300">
                <strong>Requirements:</strong> Min 0.01 ETH, $50 stablecoins
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default FusionSwap;
