// components/swap/swapTypes/LimitOrder/LimitOrder.tsx
"use client";

import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { Input, Select, message, Badge, Button } from "antd";
import React, { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useSignTypedData,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import MaxButton from "../../MaxButton";
import "../../index.css";
import { useSpotStore } from "@/store/spotStore";
import { GradientConnectButton } from "@/components/ui/Navbar";
import dayjs from "dayjs";
import { useCreateLimitOrder, useBuildOrderData } from "@/hooks/useLimitOrders";
import { fetchTokenPrices } from "@/hooks/useSpotBalance";
import axios from "axios";

const { Option } = Select;

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

function LimitOrder() {
  const { address, isConnected, chain } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [msgApi, contextHolder] = message.useMessage();

  /* --------- mutations --------- */
  const createOrderMutation = useCreateLimitOrder();
  const buildOrderMutation = useBuildOrderData();

  /* --------- wagmi tx hooks for approval --------- */
  const {
    data: txHash,
    sendTransaction,
    isPending: isSending,
    error: sendErr,
  } = useSendTransaction();
  const {
    isLoading: isConfirming,
    isSuccess: isDone,
    error: confirmErr,
  } = useWaitForTransactionReceipt({ hash: txHash });

  /* --------- global token selection --------- */
  const tokenOne = useSpotStore((s) => s.tokenOne);
  const tokenTwo = useSpotStore((s) => s.tokenTwo);
  const setTokenOne = useSpotStore((s) => s.setTokenOne);
  const setTokenTwo = useSpotStore((s) => s.setTokenTwo);

  /* --------- local component state --------- */
  const [tokenOneAmount, setT1Amount] = useState("");
  const [tokenTwoAmount, setT2Amount] = useState("");
  const [limitRate, setLimitRate] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [currentMarketPrice, setCurrentMarketPrice] = useState("");
  const [txDetails, setTxDetails] = useState<{
    to: `0x${string}` | null;
    data: `0x${string}` | null;
    value: bigint | null;
  }>({
    to: null,
    data: null,
    value: null,
  });

  const chainId = chain?.id || 1;

  /* --------- fetch market price --------- */
  const fetchMarketPrice = useCallback(async () => {
    try {
      setIsLoadingPrice(true);

      // Get prices for both tokens
      const prices = await fetchTokenPrices([
        tokenOne.address,
        tokenTwo.address,
      ]);

      console.log("Fetched prices:", prices);

      const tokenOnePrice =
        parseFloat(prices[tokenOne.address.toLowerCase()] as string) || 0;
      const tokenTwoPrice =
        parseFloat(prices[tokenTwo.address.toLowerCase()] as string) || 0;

      // Calculate the market rate (tokenTwo per tokenOne)
      if (tokenOnePrice > 0 && tokenTwoPrice > 0) {
        const marketRate = (tokenOnePrice / tokenTwoPrice).toFixed(6);
        setCurrentMarketPrice(marketRate);
      } else {
        setCurrentMarketPrice("0");
      }
    } catch (error) {
      console.error("Error fetching market price:", error);
      setCurrentMarketPrice("0");
    } finally {
      setIsLoadingPrice(false);
    }
  }, [tokenOne.address, tokenTwo.address]);

  /* --------- fetch price on token change --------- */
  useEffect(() => {
    if (
      tokenOne.address &&
      tokenTwo.address &&
      tokenOne.address !== tokenTwo.address
    ) {
      // Clear previous values when tokens change
      setCurrentMarketPrice("");
      setLimitRate("");
      setT1Amount("");
      setT2Amount("");

      // Fetch new market price
      fetchMarketPrice();
    }
  }, [tokenOne.address, tokenTwo.address, fetchMarketPrice]);

  /* --------- debounced price calculation --------- */
  const debouncedCalculateOutput = useCallback(
    debounce((inputAmount: string, rate: string) => {
      if (inputAmount && rate) {
        const outputAmount = parseFloat(inputAmount) * parseFloat(rate);
        setT2Amount(outputAmount.toFixed(6));
      }
    }, 300),
    []
  );

  const debouncedCalculateInput = useCallback(
    debounce((outputAmount: string, rate: string) => {
      if (outputAmount && rate) {
        const inputAmount = parseFloat(outputAmount) / parseFloat(rate);
        setT1Amount(inputAmount.toFixed(6));
      }
    }, 300),
    []
  );

  /* --------- amount change handlers --------- */
  const changeSellAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT1Amount(v);

    // Auto-calculate output if we have a rate
    if (v && limitRate) {
      debouncedCalculateOutput(v, limitRate);
    } else if (v && currentMarketPrice) {
      // Use market price if no custom rate set
      const outputAmount = parseFloat(v) * parseFloat(currentMarketPrice);
      setT2Amount(outputAmount.toFixed(6));
      setLimitRate(currentMarketPrice);
    } else {
      setT2Amount("");
    }
  };

  const changeBuyAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT2Amount(v);

    // Auto-calculate input if we have a rate
    if (v && limitRate) {
      debouncedCalculateInput(v, limitRate);
    } else if (v && currentMarketPrice) {
      // Use market price if no custom rate set
      const inputAmount = parseFloat(v) / parseFloat(currentMarketPrice);
      setT1Amount(inputAmount.toFixed(6));
      setLimitRate(currentMarketPrice);
    } else {
      setT1Amount("");
    }
  };

  const changeLimitRate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLimitRate(v);

    if (tokenOneAmount && v) {
      debouncedCalculateOutput(tokenOneAmount, v);
    }
  };

  const setMaxBal = (bal: string) => {
    setT1Amount(bal);
    if (limitRate) {
      const outputAmount = parseFloat(bal) * parseFloat(limitRate);
      setT2Amount(outputAmount.toFixed(6));
    } else if (currentMarketPrice) {
      const outputAmount = parseFloat(bal) * parseFloat(currentMarketPrice);
      setT2Amount(outputAmount.toFixed(6));
      setLimitRate(currentMarketPrice);
    }
  };

  /* --------- switch tokens --------- */
  const switchTokens = () => {
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);

    // Clear amounts and rate
    setT1Amount("");
    setT2Amount("");
    setLimitRate("");
    setCurrentMarketPrice("");
  };

  /* --------- set market price helper --------- */
  const setToMarketPrice = () => {
    if (currentMarketPrice) {
      setLimitRate(currentMarketPrice);
      if (tokenOneAmount) {
        const outputAmount =
          parseFloat(tokenOneAmount) * parseFloat(currentMarketPrice);
        setT2Amount(outputAmount.toFixed(6));
      }
    }
  };

  /* --------- Check allowance --------- */
  const checkAllowance = async (amount: string) => {
    if (!address) return false;

    try {
      const amountWei = BigInt(
        (parseFloat(amount) * 10 ** tokenOne.decimals).toFixed(0)
      );

      const { data } = await axios.get(
        `/api/proxy/1inch/approve/allowance?tokenAddress=${tokenOne.address}&walletAddress=${address}&chainId=${chainId}`
      );

      const allowance = BigInt(data.allowance);
      return allowance >= amountWei;
    } catch (error) {
      console.error("Allowance check error:", error);
      msgApi.error("Failed to check token allowance");
      return false;
    }
  };

  /* --------- Request approval --------- */
  const requestApproval = async () => {
    if (!address) return;

    try {
      const { data: approveTx } = await axios.get(
        `/api/proxy/1inch/approve/transaction?tokenAddress=${tokenOne.address}&chainId=${chainId}`
      );

      setTxDetails({
        to: approveTx.to,
        data: approveTx.data,
        value: BigInt(approveTx.value ?? "0"),
      });
    } catch (error) {
      console.error("Approval error:", error);
      msgApi.error("Failed to request approval");
    }
  };

  /* --------- Build and sign order --------- */
  const createLimitOrder = async () => {
    if (
      !tokenOneAmount ||
      !tokenTwoAmount ||
      !limitRate ||
      !expiryDays ||
      !isConnected ||
      !address
    ) {
      msgApi.warning("Please fill all fields and connect your wallet");
      return;
    }

    try {
      // Check allowance first
      console.log("1️⃣ Checking allowance...");
      const hasAllowance = await checkAllowance(tokenOneAmount);

      if (!hasAllowance) {
        console.log("❌ Insufficient allowance, requesting approval...");
        await requestApproval();
        return; // Exit - let approval complete first
      }

      console.log("✅ Sufficient allowance, proceeding with order creation...");

      setIsCreatingOrder(true);

      // Calculate amounts in wei
      const makingAmount = BigInt(
        (parseFloat(tokenOneAmount) * 10 ** tokenOne.decimals).toFixed(0)
      ).toString();

      const takingAmount = BigInt(
        (parseFloat(tokenTwoAmount) * 10 ** tokenTwo.decimals).toFixed(0)
      ).toString();

      // Calculate expiry timestamp
      const expiryTimestamp = dayjs().add(expiryDays, "day").unix();

      console.log("🔨 Building order data...");

      // Build order data
      const orderData = await buildOrderMutation.mutateAsync({
        makerAsset: tokenOne.address,
        takerAsset: tokenTwo.address,
        makingAmount,
        takingAmount,
        maker: address,
        receiver: address,
        expiry: expiryTimestamp,
        allowPartialFill: true,
        allowMultipleFill: true,
      });

      console.log("📝 Order data built:", orderData);

      // Create typed data for signing
      const domain = {
        name: "1inch Limit Order Protocol",
        version: "4",
        chainId: chainId,
        verifyingContract:
          "0x111111125421ca6dc452d289314280a0f8842a65" as `0x${string}`, // 1inch limit order contract
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

      console.log("✍️ Signing order...");

      // Sign the order
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "Order",
        message: orderData,
      });

      console.log("📤 Attempting to submit order to 1inch...");

      let orderSubmittedToAPI = false;

      // Try to submit order to 1inch orderbook
      try {
        const result = await createOrderMutation.mutateAsync({
          chainId,
          orderData: {
            signature,
            data: orderData,
          },
        });

        console.log("✅ Order submitted to 1inch successfully:", result);
        orderSubmittedToAPI = true;
      } catch (apiError: any) {
        console.log("⚠️ 1inch API submission failed:", apiError);
        // Don't throw error, continue with local storage
      }

      // Create order entry for localStorage (always do this as backup)
      const localOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orderHash: `0x${Date.now().toString(16)}${Math.random()
          .toString(16)
          .substr(2, 8)}`,
        signature,
        data: orderData,
        // Display data
        tokenIn: {
          address: tokenOne.address,
          ticker: tokenOne.ticker,
          img: tokenOne.img,
          decimals: tokenOne.decimals,
        },
        tokenOut: {
          address: tokenTwo.address,
          ticker: tokenTwo.ticker,
          img: tokenTwo.img,
          decimals: tokenTwo.decimals,
        },
        amountIn: tokenOneAmount,
        amountOut: tokenTwoAmount,
        rate: limitRate,
        expiryDate: dayjs().add(expiryDays, "day").toISOString(),
        status: "active" as const,
        createdAt: new Date().toISOString(),
        chainId,
        maker: address,
        source: orderSubmittedToAPI ? "api" : "local",
        // Additional metadata
        expiryDays,
        makingAmountWei: makingAmount,
        takingAmountWei: takingAmount,
      };

      // Store in localStorage
      const existingOrders = JSON.parse(
        localStorage.getItem("limitOrders") || "[]"
      );
      existingOrders.push(localOrder);
      localStorage.setItem("limitOrders", JSON.stringify(existingOrders));

      console.log("✅ Order stored locally:", localOrder);

      // Show success message
      if (orderSubmittedToAPI) {
        msgApi.success(
          "Limit order created and submitted to 1inch successfully!"
        );
      } else {
        msgApi.success(
          "Limit order created successfully! Order is being tracked locally."
        );
      }

      // Reset form
      setT1Amount("");
      setT2Amount("");
      setLimitRate("");

      // Trigger a custom event to refresh the active orders component
      window.dispatchEvent(
        new CustomEvent("limitOrderCreated", {
          detail: localOrder,
        })
      );
    } catch (error: any) {
      console.error("❌ Order creation error:", error);

      if (error.message?.includes("User rejected")) {
        msgApi.warning("Order signature was rejected");
      } else {
        msgApi.error(`Failed to create order: ${error.message}`);
      }
    } finally {
      setIsCreatingOrder(false);
    }
  };

  /* --------- Auto-send when txDetails populated (approval flow) --------- */
  useEffect(() => {
    if (txDetails.to && txDetails.data && isConnected) {
      sendTransaction({
        to: txDetails.to,
        data: txDetails.data,
        value: txDetails.value || BigInt(0),
      });
    }
  }, [txDetails, isConnected, sendTransaction]);

  /* --------- Toast messages for approval --------- */
  useEffect(() => {
    msgApi.destroy();
    if (isSending || isConfirming) {
      msgApi.open({
        type: "loading",
        content: isSending ? "Sending approval…" : "Confirming approval…",
        duration: 0,
      });
    }
  }, [isSending, isConfirming, msgApi]);

  useEffect(() => {
    msgApi.destroy();
    if (isDone) {
      msgApi.success(
        "Approval successful! You can now create limit orders.",
        3
      );
      setTxDetails({ to: null, data: null, value: null });
    } else if (sendErr || confirmErr) {
      msgApi.error("Approval failed", 5);
      setTxDetails({ to: null, data: null, value: null });
    }
  }, [isDone, sendErr, confirmErr, msgApi]);

  /* --------- price comparison --------- */
  const getPriceComparison = () => {
    if (!limitRate || !currentMarketPrice) return null;

    const limitPrice = parseFloat(limitRate);
    const marketPrice = parseFloat(currentMarketPrice);

    // Avoid division by zero or invalid prices
    if (marketPrice <= 0 || limitPrice <= 0) return null;

    const difference = ((limitPrice - marketPrice) / marketPrice) * 100;

    return {
      difference: difference.toFixed(2),
      isAbove: difference > 0,
      isBelow: difference < 0,
    };
  };

  const priceComparison = getPriceComparison();

  /* --------- button logic --------- */
  const isOrderDisabled =
    !tokenOneAmount ||
    !tokenTwoAmount ||
    !limitRate ||
    !expiryDays ||
    !isConnected ||
    isCreatingOrder ||
    isSending ||
    isConfirming;

  const getButtonText = () => {
    if (isSending) return "Sending Approval…";
    if (isConfirming) return "Confirming Approval…";
    if (isCreatingOrder) return "Creating Limit Order...";
    if (!isConnected) return "Connect Wallet";
    return "Create Limit Order";
  };

  return (
    <>
      {contextHolder}
      <div className="tradeBox p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h4 className="text-xl">Limit Orders</h4>
            <Badge
              count="BETA"
              style={{
                backgroundColor: "#FFB800",
                color: "#000",
                fontSize: "10px",
                height: "18px",
                lineHeight: "18px",
              }}
            />
          </div>
        </div>

        {/* Current Market Price */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Market Price:</span>
            <div className="flex items-center gap-2">
              {isLoadingPrice ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : (
                <span className="text-white font-medium">
                  {currentMarketPrice && parseFloat(currentMarketPrice) > 0
                    ? parseFloat(currentMarketPrice).toFixed(6)
                    : "0"}{" "}
                  {tokenTwo.ticker}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Token Amount Inputs */}
        <div className="inputs">
          <div className="input-container">
            <Input
              placeholder="0"
              value={tokenOneAmount}
              onChange={changeSellAmount}
              disabled={isCreatingOrder}
            />
            <span className="input-tag">You Pay</span>
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
              value={tokenTwoAmount}
              onChange={changeBuyAmount}
              disabled={isCreatingOrder}
            />
            <span className="input-tag">You Receive</span>
          </div>

          {/* Token Selectors */}
          <div className="assetOneContainer">
            <div
              className="assetOne"
              onClick={() => useSpotStore.getState().openModalForTokenOne()}
            >
              <div className="flex items-center gap-2">
                <img src={tokenOne.img} alt="token1" className="assetLogo" />
                <span className="text-white">{tokenOne.ticker}</span>
              </div>
              <DownOutlined />
            </div>
            <div className="max-btn-container">
              <MaxButton token={tokenOne.address} setToken={setMaxBal} />
            </div>
          </div>

          <div className="assetTowContainer">
            <div
              className="assetTwo"
              onClick={() => useSpotStore.getState().openModalForTokenTwo()}
            >
              <div className="flex items-center gap-2">
                <img src={tokenTwo.img} alt="token2" className="assetLogo" />
                <span className="text-white">{tokenTwo.ticker}</span>
              </div>
              <DownOutlined />
            </div>
          </div>
        </div>

        {/* Limit Price Input with Use Market Button */}
        <div className="mt-4">
          <label className="text-sm text-gray-400 mb-2 block">
            Limit Price ({tokenTwo.ticker} per {tokenOne.ticker})
          </label>
          <div className="relative">
            <Input
              placeholder={`Enter limit price in ${tokenTwo.ticker}`}
              value={limitRate}
              onChange={changeLimitRate}
              disabled={isCreatingOrder}
              className="pr-28"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <Button
                size="small"
                onClick={setToMarketPrice}
                className="text-xs border-gray-600 text-gray-400 hover:text-white"
                disabled={!currentMarketPrice || isLoadingPrice}
              >
                Use Market
              </Button>
              <span className="text-xs text-gray-400">{tokenTwo.ticker}</span>
            </div>
          </div>

          {/* Price Comparison */}
          {priceComparison && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-gray-400">vs Market:</span>
              <span
                className={
                  priceComparison.isAbove
                    ? "text-green-400"
                    : priceComparison.isBelow
                    ? "text-red-400"
                    : "text-gray-400"
                }
              >
                {priceComparison.isAbove ? "+" : ""}
                {priceComparison.difference}%
              </span>
              {priceComparison.isAbove && (
                <span className="text-green-400">(Above Market)</span>
              )}
              {priceComparison.isBelow && (
                <span className="text-red-400">(Below Market)</span>
              )}
            </div>
          )}
        </div>

        {/* Expires Dropdown */}
        <div className="mt-4">
          <label className="text-sm text-gray-400 mb-2 block">Expires</label>
          <Select
            value={expiryDays}
            onChange={setExpiryDays}
            className="w-full"
            disabled={isCreatingOrder}
          >
            <Option value={1}>1 Day</Option>
            <Option value={7}>7 Days</Option>
            <Option value={30}>30 Days</Option>
            <Option value={90}>90 Days</Option>
          </Select>
        </div>

        {/* Additional Price Info */}
        {currentMarketPrice &&
          tokenTwo.ticker &&
          parseFloat(currentMarketPrice) > 0 && (
            <div className="mt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>{tokenTwo.ticker} price</span>
                <span>
                  {parseFloat(currentMarketPrice).toFixed(8)} {tokenOne.ticker}
                </span>
              </div>
            </div>
          )}

        {/* Create Order Button */}
        {isConnected ? (
          <div
            className={`swapButton mt-4 ${isOrderDisabled ? "disabled" : ""}`}
            onClick={isOrderDisabled ? undefined : createLimitOrder}
            style={{
              opacity: isOrderDisabled ? 0.6 : 1,
              cursor: isOrderDisabled ? "not-allowed" : "pointer",
            }}
          >
            {getButtonText()}
          </div>
        ) : (
          <div className="mt-4">
            <GradientConnectButton />
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="flex items-start gap-2">
            <InfoCircleOutlined className="text-blue-400 mt-0.5" />
            <div className="text-xs text-blue-300">
              <div className="font-medium mb-1">About 1inch Limit Orders:</div>
              <ul className="space-y-1 text-blue-200">
                <li>
                  • <strong>Real-time pricing</strong> - Live market rates from
                  1inch
                </li>
                <li>
                  • <strong>Auto-calculation</strong> - Enter amount to see
                  output
                </li>
                <li>
                  • <strong>No slippage</strong> - Get exact price you set or
                  better
                </li>
                <li>
                  • <strong>Gas efficient</strong> - Pay gas only when order
                  fills
                </li>
                <li>
                  • <strong>Partial fills</strong> - Orders can be filled
                  incrementally
                </li>
              </ul>
              <div className="mt-2 text-yellow-300">
                <strong>Flow:</strong> Approve → Sign → Submit to 1inch
                Orderbook
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LimitOrder;
