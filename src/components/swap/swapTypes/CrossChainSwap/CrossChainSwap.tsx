// components/swap/swapTypes/crossChainSwap/CrossChainSwap.tsx
"use client";

import crypto from "crypto";
import {
  DownOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { Input, Popover, message, Select, Badge, Progress, Button } from "antd";
import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { formatUnits, type Address } from "viem";
import {
  useAccount,
  useSignTypedData,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { TOKENS } from "@/utils/TokenList";
import MaxButton from "../../MaxButton";
import "../../index.css";
import { useSpotStore } from "@/store/spotStore";
import { GradientConnectButton } from "@/components/ui/Navbar";
import { SUPPORTED_CHAINS, getChainInfo } from "@/hooks/useTokens";

const { Option } = Select;

/* ---------- interfaces ---------- */
interface Token {
  address: Address;
  name: string;
  ticker: string;
  img: string;
  decimals: number;
}

interface TxDetails {
  to: Address | null;
  data: `0x${string}` | null;
  value: bigint | null;
}

interface CrossChainQuote {
  quoteId: string;
  srcTokenAmount: string;
  dstTokenAmount: string;
  feeToken: string;
  presets: {
    [key: string]: {
      auctionDuration: number;
      auctionStartAmount: string;
      auctionEndAmount: string;
      startAuctionIn: number;
      initialRateBump: number;
      tokenFee: string;
      bankFee: string;
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
      srcToken: string;
      dstToken: string;
    };
  };
  crossChainInfo: {
    srcChain: number;
    dstChain: number;
    estimatedTime: string;
    swapType: string;
    gasless: boolean;
    mevProtection: boolean;
  };
}

interface CrossChainOrder {
  orderHash: string;
  quoteId?: string;
  status: string;
  srcChain: number;
  dstChain: number;
}

enum OrderStatus {
  Created = "created",
  Pending = "pending",
  SrcDeployed = "src-deployed",
  DstDeployed = "dst-deployed",
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
  srcTxHash?: string;
  dstTxHash?: string;
}

function CrossChainSwap() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

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

  /* --------- global token selection with cross-chain support --------- */
  const tokenOne = useSpotStore((s) => s.tokenOne);
  const tokenTwo = useSpotStore((s) => s.tokenTwo);
  const setTokenOne = useSpotStore((s) => s.setTokenOne);
  const setTokenTwo = useSpotStore((s) => s.setTokenTwo);

  // Cross-chain store state
  const srcChain = useSpotStore((s) => s.srcChain);
  const dstChain = useSpotStore((s) => s.dstChain);
  const setSrcChain = useSpotStore((s) => s.setSrcChain);
  const setDstChain = useSpotStore((s) => s.setDstChain);
  const openCrossChainModal = useSpotStore((s) => s.openCrossChainModal);
  const setCrossChainMode = useSpotStore((s) => s.setCrossChainMode);

  // Enhanced modal handlers for cross-chain
  const openModalForSrcToken = () => {
    openCrossChainModal("tokenOne", srcChain);
  };

  const openModalForDstToken = () => {
    openCrossChainModal("tokenTwo", dstChain);
  };

  /* --------- local component state --------- */
  const [tokenOneAmount, setT1Amount] = useState("");
  const [tokenTwoAmount, setT2Amount] = useState("");
  const [quote, setQuote] = useState<CrossChainQuote | null>(null);
  const [msgApi, contextHolder] = message.useMessage();
  const [isQuoting, setIsQuoting] = useState(false);
  const [txDetails, setTxDetails] = useState<TxDetails>({
    to: null,
    data: null,
    value: null,
  });

  /* --------- cross-chain order tracking --------- */
  const [currentOrder, setCurrentOrder] = useState<CrossChainOrder | null>(
    null
  );
  const [orderStatus, setOrderStatus] = useState<OrderStatusData | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderPollingInterval, setOrderPollingInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [swapProgress, setSwapProgress] = useState(0);

  /* --------- debounced quote fetch --------- */
  const debouncedFetchQuote = useCallback(
    debounce((amount: string) => {
      if (amount && parseFloat(amount) > 0 && srcChain !== dstChain) {
        fetchCrossChainQuote(amount);
      }
    }, 500),
    [tokenOne.address, tokenTwo.address, address, srcChain, dstChain]
  );

  /* --------- amount change handlers --------- */
  const changeBuyAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT2Amount(v);
    if (v && quote) {
      const ratio =
        parseFloat(
          formatUnits(BigInt(quote.dstTokenAmount), tokenTwo.decimals)
        ) /
        parseFloat(
          formatUnits(BigInt(quote.srcTokenAmount), tokenOne.decimals)
        );
      setT1Amount((parseFloat(v) / ratio).toFixed(6));
    } else {
      setT1Amount("");
    }
  };

  const changeSellAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT1Amount(v);

    if (v && parseFloat(v) > 0 && srcChain !== dstChain) {
      setT2Amount("");
      debouncedFetchQuote(v);
    } else {
      setT2Amount("");
      setQuote(null);
    }
  };

  const setMaxBal = (bal: string) => {
    setT1Amount(bal);
    if (bal && parseFloat(bal) > 0 && srcChain !== dstChain) {
      setT2Amount("");
      debouncedFetchQuote(bal);
    }
  };

  /* --------- switch tokens and chains --------- */
  const switchTokensAndChains = () => {
    setQuote(null);
    setT1Amount("");
    setT2Amount("");

    // Switch tokens
    const one = tokenOne,
      two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);

    // Switch chains
    const srcChainTemp = srcChain;
    setSrcChain(dstChain);
    setDstChain(srcChainTemp);
  };

  /* --------- chain change handlers --------- */
  const handleSrcChainChange = (chainId: number) => {
    setSrcChain(chainId);
    setQuote(null);
    setT2Amount("");
    if (
      tokenOneAmount &&
      parseFloat(tokenOneAmount) > 0 &&
      chainId !== dstChain
    ) {
      debouncedFetchQuote(tokenOneAmount);
    }
  };

  const handleDstChainChange = (chainId: number) => {
    setDstChain(chainId);
    setQuote(null);
    setT2Amount("");
    if (
      tokenOneAmount &&
      parseFloat(tokenOneAmount) > 0 &&
      srcChain !== chainId
    ) {
      debouncedFetchQuote(tokenOneAmount);
    }
  };

  /* --------- fetch cross-chain quote --------- */
  const fetchCrossChainQuote = async (amount: string) => {
    if (!amount || !address || !isConnected || srcChain === dstChain) return;

    setIsQuoting(true);
    try {
      const amountWei = BigInt(
        (parseFloat(amount) * 10 ** tokenOne.decimals).toFixed(0)
      );

      const { data } = await axios.post(`/api/proxy/1inch/fusion-plus/quote`, {
        srcChain: srcChain,
        dstChain: dstChain,
        srcTokenAddress: tokenOne.address,
        dstTokenAddress: tokenTwo.address,
        amount: amountWei.toString(),
        walletAddress: address,
        enableEstimate: true,
      });

      if (data && !data.error) {
        setQuote(data);
        console.log("Cross-chain Quote:", data);

        // Set tokenTwo amount based on dstTokenAmount
        const estimatedAmount = data.dstTokenAmount;
        setT2Amount(formatUnits(BigInt(estimatedAmount), tokenTwo.decimals));
      } else {
        throw new Error(data.error || "Failed to get cross-chain quote");
      }
    } catch (err: any) {
      console.error("Cross-chain quote error:", err);

      if (err.response?.data?.error?.includes("not supported")) {
        msgApi.warning(
          "Cross-chain route not available for this token pair. Try different tokens or chains."
        );
      } else if (err.response?.data?.error?.includes("minimum")) {
        msgApi.warning(
          "Amount too small for cross-chain swap. Minimum amount required."
        );
      } else {
        msgApi.error("Failed to fetch cross-chain quote");
      }
      setQuote(null);
    } finally {
      setIsQuoting(false);
    }
  };

  /* --------- STEP 1: Check allowance --------- */
  const checkAllowance = async (amount: string) => {
    if (!address || !quote) return false;

    try {
      const amountWei = BigInt(
        (parseFloat(amount) * 10 ** tokenOne.decimals).toFixed(0)
      );

      const { data } = await axios.get(
        `/api/proxy/1inch/approve/allowance?tokenAddress=${tokenOne.address}&walletAddress=${address}&chainId=${srcChain}`
      );

      const allowance = BigInt(data.allowance);
      return allowance >= amountWei;
    } catch (error) {
      console.error("Allowance check error:", error);
      msgApi.error("Failed to check token allowance");
      return false;
    }
  };

  /* --------- STEP 2: Request approval --------- */
  const requestApproval = async () => {
    if (!address) return;

    try {
      const { data: approveTx } = await axios.get(
        `/api/proxy/1inch/approve/transaction?tokenAddress=${tokenOne.address}&chainId=${srcChain}`
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

  /* --------- STEP 3: Build order --------- */
  const buildOrder = async () => {
    if (!quote || !address) throw new Error("Missing quote or address");

    console.log("🔨 Building order...");

    // Pass ALL required parameters (per 1inch docs - all as query params)
    const { data: buildResponse } = await axios.post(
      `/api/proxy/1inch/fusion-plus/build`,
      {
        quote: quote, // Pass entire quote object in body
        // All these go as query params in the API:
        srcChain: srcChain,
        dstChain: dstChain,
        srcTokenAddress: tokenOne.address,
        dstTokenAddress: tokenTwo.address,
        amount: BigInt(
          (parseFloat(tokenOneAmount) * 10 ** tokenOne.decimals).toFixed(0)
        ).toString(),
        walletAddress: address,
      }
    );

    if (!buildResponse || !buildResponse.extension) {
      throw new Error("Invalid build response - missing order or extension");
    }

    console.log("BUILDRES::", buildResponse);

    console.log("✅ Order built successfully:", {
      orderFields: Object.keys(buildResponse.typedData),
      hasExtension: !!buildResponse.extension,
      extensionLength: buildResponse.extension.length,
    });

    return buildResponse;
  };

  /* --------- STEP 4: Sign order --------- */
  const signOrder = async (orderToSign: any) => {
    if (!quote) throw new Error("Missing quote for signing");

    console.log("✍️ Signing order...");

    const domain = {
      name: orderToSign.domain.name,
      version: orderToSign.domain.version,
      chainId: srcChain,
      verifyingContract: orderToSign.domain.verifyingContract,
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

    const signature = await signTypedDataAsync({
      domain,
      types,
      primaryType: "Order",
      message: orderToSign.message,
    });

    console.log("✅ Order signed successfully");
    return signature;
  };

  /* --------- STEP 5: Submit order --------- */
  const submitOrder = async (
    orderToSign: any,
    signature: string,
    extension: string
  ) => {
    if (!quote) throw new Error("Missing quote for submission");

    console.log("📤 Submitting order...");

    const { data: submitData } = await axios.post(
      `/api/proxy/1inch/fusion-plus/order`,
      {
        order: orderToSign,
        signature: signature,
        extension: extension, // CRITICAL: Extension from build response
        quoteId: quote.quoteId,
        srcChain: srcChain,
        dstChain: dstChain,
      }
    );

    if (!submitData || submitData.error) {
      throw new Error(submitData.error || "Failed to submit cross-chain order");
    }

    console.log("✅ Order submitted successfully:", submitData.orderHash);
    return submitData;
  };

  /* --------- MAIN FLOW: Quote → Approve → Build → Sign → Submit --------- */
  const handleCrossChainSwap = async () => {
    if (
      !tokenOneAmount ||
      !address ||
      !isConnected ||
      !quote ||
      srcChain === dstChain
    ) {
      msgApi.warning(
        "Connect wallet, select different chains, enter an amount, and get a valid quote."
      );
      return;
    }

    try {
      // STEP 1: Check allowance first
      console.log("1️⃣ Checking allowance...");
      const hasAllowance = await checkAllowance(tokenOneAmount);

      if (!hasAllowance) {
        console.log("❌ Insufficient allowance, requesting approval...");
        await requestApproval();
        return; // Exit - let approval complete first
      }

      console.log("✅ Sufficient allowance, proceeding with swap...");

      // STEPS 2-5: Build → Sign → Submit
      setIsCreatingOrder(true);
      setSwapProgress(25);

      try {
        // STEP 2: Build order (get correct structure + extension)
        const buildResponse = await buildOrder();
        setSwapProgress(50);

        // STEP 3: Sign the built order
        const signature = await signOrder(buildResponse.typedData);
        setSwapProgress(70);

        // STEP 4: Submit with built order + extension
        const submitData = await submitOrder(
          buildResponse.typedData,
          signature,
          buildResponse.extension
        );
        setSwapProgress(85);

        // Success - track order
        const crossChainOrder: CrossChainOrder = {
          orderHash: submitData.orderHash,
          quoteId: quote.quoteId,
          status: submitData.status || "created",
          srcChain: srcChain,
          dstChain: dstChain,
        };

        setCurrentOrder(crossChainOrder);
        msgApi.success(
          "Cross-chain order created successfully! Monitoring execution..."
        );
        startOrderPolling(submitData.orderHash);

        // Reset form
        setT1Amount("");
        setT2Amount("");
        setQuote(null);
        setSwapProgress(100);
      } catch (error: any) {
        console.error("❌ Build/Sign/Submit error:", error);
        setSwapProgress(0);

        if (error.message?.includes("User rejected")) {
          msgApi.warning("Order signature was rejected");
        } else {
          msgApi.error(
            `Failed to create order: ${
              error.response?.data?.error || error.message
            }`
          );
        }
      } finally {
        setIsCreatingOrder(false);
      }
    } catch (error: any) {
      console.error("❌ Main flow error:", error);
      msgApi.error("Failed to initiate cross-chain swap");
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
          `/api/proxy/1inch/fusion-plus/status?orderHash=${orderHash}&srcChain=${srcChain}&dstChain=${dstChain}`
        );

        if (data && !data.error) {
          setOrderStatus(data);

          // Update progress based on status
          switch (data.status) {
            case OrderStatus.Created:
              setSwapProgress(100);
              break;
            case OrderStatus.SrcDeployed:
              setSwapProgress(40);
              break;
            case OrderStatus.DstDeployed:
              setSwapProgress(80);
              break;
            case OrderStatus.Filled:
              setSwapProgress(100);
              break;
          }

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
              msgApi.success("🎉 Cross-chain swap completed successfully!");
              setSwapProgress(100);
            } else if (data.status === OrderStatus.Expired) {
              msgApi.warning("Cross-chain order expired. You can try again.");
              setSwapProgress(0);
            } else if (data.status === OrderStatus.Cancelled) {
              msgApi.info("Cross-chain order was cancelled.");
              setSwapProgress(0);
            }
          }
        }
      } catch (err: any) {
        console.error("Status polling error:", err);
      }
    }, 5000);

    setOrderPollingInterval(interval);
  };

  /* --------- auto-send when txDetails populated (approval flow) --------- */
  useEffect(() => {
    if (txDetails.to && txDetails.data && isConnected) {
      sendTransaction({
        to: txDetails.to,
        data: txDetails.data,
        value: txDetails.value || BigInt(0),
      });
    }
  }, [txDetails, isConnected, sendTransaction]);

  /* --------- toast messages for approval --------- */
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
      msgApi.success("Approval successful! You can now bridge tokens.", 3);
      setTxDetails({ to: null, data: null, value: null });
    } else if (sendErr || confirmErr) {
      msgApi.error("Approval failed", 5);
      setTxDetails({ to: null, data: null, value: null });
    }
  }, [isDone, sendErr, confirmErr, msgApi]);

  /* --------- cleanup on unmount --------- */
  useEffect(() => {
    return () => {
      if (orderPollingInterval) {
        clearInterval(orderPollingInterval);
      }
    };
  }, [orderPollingInterval]);

  // Set cross-chain mode when component mounts
  useEffect(() => {
    setCrossChainMode(true);
    return () => {
      setCrossChainMode(false);
    };
  }, [setCrossChainMode]);

  /* --------- button logic --------- */
  const isSwapDisabled =
    !tokenOneAmount ||
    !isConnected ||
    !quote ||
    isCreatingOrder ||
    isQuoting ||
    isSending ||
    isConfirming ||
    srcChain === dstChain;

  const getButtonText = () => {
    if (isSending) return "Sending Approval…";
    if (isConfirming) return "Confirming Approval…";
    if (isCreatingOrder) return `Creating Order... ${swapProgress}%`;
    if (isQuoting) return "Getting Quote...";
    if (srcChain === dstChain) return "Select Different Chains";
    return "Bridge Tokens";
  };

  /* --------- helper functions --------- */
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Filled:
        return "green";
      case OrderStatus.SrcDeployed:
      case OrderStatus.DstDeployed:
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

  const getStatusDescription = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Created:
        return "Order created and waiting for execution";
      case OrderStatus.SrcDeployed:
        return "Source contract deployed, waiting for destination";
      case OrderStatus.DstDeployed:
        return "Both contracts deployed, finalizing swap";
      case OrderStatus.Filled:
        return "Cross-chain swap completed successfully";
      case OrderStatus.Expired:
        return "Order expired due to timeout";
      case OrderStatus.Cancelled:
        return "Order was cancelled";
      default:
        return "Processing cross-chain swap";
    }
  };

  /* ---------- render ---------- */
  return (
    <>
      {contextHolder}
      <div className="tradeBox p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h4 className="text-xl">Cross-Chain Bridge</h4>
            <Badge
              count="FUSION+"
              style={{
                backgroundColor: "#00F5E0",
                color: "#000",
                fontSize: "10px",
                height: "18px",
                lineHeight: "18px",
              }}
            />
          </div>
        </div>

        {/* Chain Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                From Chain
              </label>
              <Select
                value={srcChain}
                onChange={handleSrcChainChange}
                className="w-full"
                disabled={isQuoting || isCreatingOrder}
              >
                {Object.entries(SUPPORTED_CHAINS).map(([chainId, chain]) => (
                  <Option
                    key={chainId}
                    value={Number(chainId)}
                    disabled={Number(chainId) === dstChain}
                  >
                    <div className="flex items-center gap-2">
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                To Chain
              </label>
              <Select
                value={dstChain}
                onChange={handleDstChainChange}
                className="w-full"
                disabled={isQuoting || isCreatingOrder}
              >
                {Object.entries(SUPPORTED_CHAINS).map(([chainId, chain]) => (
                  <Option
                    key={chainId}
                    value={Number(chainId)}
                    disabled={Number(chainId) === srcChain}
                  >
                    <div className="flex items-center gap-2">
                      <span>{chain.icon}</span>
                      <span>{chain.name}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-center mt-2">
            <Button
              icon={<SwapOutlined />}
              size="small"
              onClick={switchTokensAndChains}
              disabled={isQuoting || isCreatingOrder}
              className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
            >
              Switch
            </Button>
          </div>
        </div>

        {/* Current Order Status */}
        {currentOrder && orderStatus && (
          <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Badge color={getStatusColor(orderStatus.status)} />
                <span className="text-sm text-white capitalize">
                  {orderStatus.status.replace("-", " ")}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {getChainInfo(currentOrder.srcChain)?.icon} →{" "}
                {getChainInfo(currentOrder.dstChain)?.icon}
              </div>
            </div>

            <Progress
              percent={swapProgress}
              strokeColor="#00F5E0"
              showInfo={false}
              className="mb-2"
            />

            <div className="text-xs text-gray-400 mb-2">
              {getStatusDescription(orderStatus.status)}
            </div>

            <div className="text-xs text-gray-500">
              Order: {currentOrder.orderHash.slice(0, 10)}...
              {currentOrder.orderHash.slice(-8)}
            </div>
          </div>
        )}

        {/* Warning for same chain */}
        {srcChain === dstChain && (
          <div className="mb-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
            <div className="flex items-center gap-2">
              <InfoCircleOutlined className="text-yellow-400" />
              <span className="text-yellow-300 text-sm">
                Please select different source and destination chains for
                cross-chain swaps
              </span>
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
            <span className="input-tag">Send</span>
          </div>

          <div className="switch-container">
            <div className="line" />
            <div className="switchButton" onClick={switchTokensAndChains}>
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
            <span className="input-tag">Receive</span>
          </div>

          {/* token selectors with chain indicators */}
          <div className="assetOneContainer">
            <div className="assetOne" onClick={openModalForSrcToken}>
              <div className="flex items-center gap-2">
                <img
                  src={tokenOne.img}
                  alt="assetOneLogo"
                  className="assetLogo"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <p className="text-white">{tokenOne.ticker}</p>
                    <span className="text-xs text-gray-400">
                      {getChainInfo(srcChain)?.icon}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getChainInfo(srcChain)?.name}
                  </span>
                </div>
              </div>
              <DownOutlined />
            </div>
            <div className="max-btn-container">
              <MaxButton token={tokenOne.address} setToken={setMaxBal} />
            </div>
          </div>

          <div className="assetTowContainer">
            <div className="assetTwo" onClick={openModalForDstToken}>
              <div className="flex items-center gap-2">
                <img
                  src={tokenTwo.img}
                  alt="assetTwoLogo"
                  className="assetLogo"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <p className="text-white">{tokenTwo.ticker}</p>
                    <span className="text-xs text-gray-400">
                      {getChainInfo(dstChain)?.icon}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getChainInfo(dstChain)?.name}
                  </span>
                </div>
              </div>
              <DownOutlined />
            </div>
          </div>
        </div>

        {/* Quote Information */}
        {quote && !isQuoting && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-400">Route:</span>
              <span className="text-white flex items-center gap-1">
                {getChainInfo(srcChain)?.icon} {getChainInfo(srcChain)?.name} →{" "}
                {getChainInfo(dstChain)?.icon} {getChainInfo(dstChain)?.name}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-400">You'll receive:</span>
              <span className="text-white">
                {formatUnits(BigInt(quote.dstTokenAmount), tokenTwo.decimals)}{" "}
                {tokenTwo.ticker}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-400">Estimated time:</span>
              <span className="text-white">
                {quote.crossChainInfo.estimatedTime}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Bridge fee:</span>
              <span className="text-green-400">$0 (Gas-free)</span>
            </div>
          </div>
        )}

        {/* Flow indicator */}
        {isCreatingOrder && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-2">
              Cross-Chain Flow Progress:
            </div>
            <div className="flex justify-between text-xs">
              <span
                className={
                  swapProgress >= 25 ? "text-green-400" : "text-gray-500"
                }
              >
                ✅ Quote
              </span>
              <span
                className={
                  swapProgress >= 25 ? "text-green-400" : "text-gray-500"
                }
              >
                🔨 Build
              </span>
              <span
                className={
                  swapProgress >= 50 ? "text-green-400" : "text-gray-500"
                }
              >
                ✍️ Sign
              </span>
              <span
                className={
                  swapProgress >= 85 ? "text-green-400" : "text-gray-500"
                }
              >
                📤 Submit
              </span>
              <span
                className={
                  swapProgress >= 100 ? "text-green-400" : "text-gray-500"
                }
              >
                🎉 Done
              </span>
            </div>
          </div>
        )}

        {/* swap button */}
        {isConnected ? (
          <div
            className={`swapButton ${isSwapDisabled ? "disabled" : ""}`}
            onClick={isSwapDisabled ? undefined : handleCrossChainSwap}
            style={{
              opacity: isSwapDisabled ? 0.6 : 1,
              cursor: isSwapDisabled ? "not-allowed" : "pointer",
            }}
          >
            {getButtonText()}
          </div>
        ) : (
          <GradientConnectButton />
        )}

        {/* Info banner */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="flex items-start gap-2">
            <InfoCircleOutlined className="text-blue-400 mt-0.5" />
            <div className="text-xs text-blue-300">
              <div className="font-medium mb-1">About Cross-Chain Swaps:</div>
              <ul className="space-y-1 text-blue-200">
                <li>
                  • <strong>Atomic swaps</strong> - Trustless cross-chain
                  execution
                </li>
                <li>
                  • <strong>Zero gas fees</strong> - Powered by Fusion+
                  resolvers
                </li>
                <li>
                  • <strong>MEV protection</strong> - Built-in sandwich attack
                  prevention
                </li>
                <li>
                  • <strong>Multi-chain support</strong> - Bridge across 7+
                  networks
                </li>
                <li>
                  • <strong>Self-custody</strong> - Your keys, your coins
                </li>
              </ul>
              <div className="mt-2 text-yellow-300">
                <strong>Flow:</strong> Quote → Approve → Build → Sign → Submit
              </div>
              <div className="mt-1 text-yellow-300">
                <strong>Note:</strong> Keep this tab open until swap completes
                (2-5 minutes)
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

export default CrossChainSwap;
