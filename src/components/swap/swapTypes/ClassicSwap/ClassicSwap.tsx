"use client";

import { DownOutlined, SettingOutlined } from "@ant-design/icons";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import { Input, Popover, Radio, message } from "antd";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { formatUnits, type Address } from "viem";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { TOKENS } from "@/utils/TokenList";
import MaxButton from "../../MaxButton";
import "../../index.css";
import { useSpotStore } from "@/store/spotStore";
import { GradientConnectButton } from "@/components/ui/Navbar";

/* ---------- local helpers ---------- */
interface Token {
  address: Address;
  name: string;
  ticker: string;
  img: string;
  decimals: number;
}
interface PriceData {
  ratio: number;
  tokenOne: number;
  tokenTwo: number;
}
interface TxDetails {
  to: Address | null;
  data: `0x${string}` | null;
  value: bigint | null;
}

function ClassicSwap() {
  const { address, isConnected } = useAccount();

  /* --------- global token selection --------- */
  const tokenOne = useSpotStore((s) => s.tokenOne);
  const tokenTwo = useSpotStore((s) => s.tokenTwo);
  const setTokenOne = useSpotStore((s) => s.setTokenOne);
  const setTokenTwo = useSpotStore((s) => s.setTokenTwo);
  const openModal = useSpotStore((s) => s.openModal);

  /* --------- local component state --------- */
  const [tokenOneAmount, setT1Amount] = useState("");
  const [tokenTwoAmount, setT2Amount] = useState("");
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [slippage, setSlippage] = useState<number>(2.5);
  const [txDetails, setTxDetails] = useState<TxDetails>({
    to: null,
    data: null,
    value: null,
  });
  const [msgApi, contextHolder] = message.useMessage();

  /* --------- wagmi tx hooks --------- */
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

  /* --------- slippage radio handler --------- */
  const handleSlippageChange = (e: any) => setSlippage(e.target.value);

  /* --------- amount change --------- */
  const changeBuyAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT2Amount(v);
    setT1Amount(v && prices ? (parseFloat(v) / prices.ratio).toFixed(6) : "");
  };

  const changeSellAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setT1Amount(v);
    setT2Amount(v && prices ? (parseFloat(v) * prices.ratio).toFixed(6) : "");
  };

  const setMaxBal = (bal: string) => {
    setT1Amount(bal);
    setT2Amount(
      bal && prices ? (parseFloat(bal) * prices.ratio).toFixed(6) : ""
    );
  };

  /* --------- switch tokens --------- */
  const switchTokens = () => {
    setPrices(null);
    setT1Amount("");
    setT2Amount("");
    const one = tokenOne,
      two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
    fetchPrices(two.address, one.address);
  };

  /* --------- open modal for token two selection --------- */
  const openTokenTwoModal = () => {
    // Use the new function to open modal for tokenTwo
    useSpotStore.getState().openModalForTokenTwo();
  };

  /* --------- price fetch --------- */
  const fetchPrices = async (one: Address, two: Address) => {
    try {
      const { data } = await axios.get(`/api/tokenPrice`, {
        params: { addressOne: one, addressTwo: two },
      });

      if (data.status === "success") {
        setPrices(data.data);
      } else {
        throw new Error("API returned error status");
      }
    } catch (err) {
      console.error(err);
      msgApi.error("Failed to fetch token prices");
      setPrices(null);
    }
  };

  /* --------- swap flow --------- */
  const fetchDexSwap = async () => {
    if (!tokenOneAmount || !address || !isConnected) {
      msgApi.warning("Connect wallet and enter an amount");
      return;
    }

    try {
      /* 1 — allowance */
      const {
        data: { allowance },
      } = await axios.get(
        `/api/proxy/1inch/approve/allowance?tokenAddress=${tokenOne.address}&walletAddress=${address}`
      );

      const amountWei = BigInt(
        (parseFloat(tokenOneAmount) * 10 ** tokenOne.decimals).toFixed(0)
      );

      if (BigInt(allowance) < amountWei) {
        /* 2 — approval tx */
        const { data: approveTx } = await axios.get(
          `/api/proxy/1inch/approve/transaction?tokenAddress=${tokenOne.address}`
        );
        setTxDetails({
          to: approveTx.to,
          data: approveTx.data,
          value: BigInt(approveTx.value ?? "0"),
        });
        return;
      }

      /* 3 — swap tx */
      const swapUrl = `/api/proxy/1inch/swap?src=${tokenOne.address}&dst=${tokenTwo.address}&amount=${amountWei}&from=${address}&slippage=${slippage}`;

      const { data: swap } = await axios.get(swapUrl);
      setT2Amount(formatUnits(BigInt(swap.toAmount), tokenTwo.decimals));

      setTxDetails({
        to: swap.tx.to,
        data: swap.tx.data,
        value: BigInt(swap.tx.value ?? "0"),
      });
    } catch (error) {
      console.error("Swap error:", error);
      msgApi.error("Failed to execute swap");
    }
  };

  /* --------- auto-send when txDetails populated --------- */
  useEffect(() => {
    if (txDetails.to && txDetails.data && isConnected) {
      sendTransaction({
        to: txDetails.to,
        data: txDetails.data,
        value: txDetails.value || BigInt(0),
      });
    }
  }, [txDetails, isConnected, sendTransaction]);

  /* --------- toast messages --------- */
  useEffect(() => {
    msgApi.destroy();
    if (isSending || isConfirming) {
      msgApi.open({
        type: "loading",
        content: isSending ? "Sending tx…" : "Confirming…",
        duration: 0,
      });
    }
  }, [isSending, isConfirming, msgApi]);

  useEffect(() => {
    msgApi.destroy();
    if (isDone) {
      msgApi.success("Transaction successful!", 3);
      setT1Amount("");
      setT2Amount("");
      setTxDetails({ to: null, data: null, value: null });
    } else if (sendErr || confirmErr) {
      msgApi.error(`Transaction failed`, 5);
      setTxDetails({ to: null, data: null, value: null });
    }
  }, [isDone, sendErr, confirmErr, msgApi]);

  /* --------- initial price load --------- */
  useEffect(() => {
    fetchPrices(tokenOne.address, tokenTwo.address);
  }, [tokenOne.address, tokenTwo.address]);

  /* --------- settings popover --------- */
  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <Radio.Group value={slippage} onChange={handleSlippageChange}>
        <Radio.Button value={0.5}>0.5%</Radio.Button>
        <Radio.Button value={2.5}>2.5%</Radio.Button>
        <Radio.Button value={5}>5.0%</Radio.Button>
      </Radio.Group>
    </>
  );

  const isSwapDisabled =
    !tokenOneAmount || !isConnected || !prices || isSending || isConfirming;

  /* ---------- render ---------- */
  return (
    <>
      {contextHolder}
      <div className="tradeBox p-4">
        <div className="flex justify-between items-center mb-8">
          <h4 className="text-xl">Swap</h4>
          <Popover
            content={settings}
            title="Settings"
            trigger="click"
            placement="bottomRight"
          >
            <SettingOutlined className="text-white text-xl hover:rotate-90 transition duration-300 hover:text-[#00F5E0]" />
          </Popover>
        </div>

        {/* amounts */}
        <div className="inputs">
          {/* sell */}
          <div className="input-container">
            <Input
              placeholder="0"
              value={tokenOneAmount}
              onChange={changeSellAmount}
              disabled={!prices}
            />
            <span className="input-tag">Sell</span>
          </div>

          {/* switch */}
          <div className="switch-container">
            <div className="line" />
            <div className="switchButton" onClick={switchTokens}>
              <SwapVertIcon sx={{ fontSize: 28 }} />
            </div>
            <div className="line" />
          </div>

          {/* buy */}
          <div className="input-container">
            <Input
              placeholder="0"
              value={tokenTwoAmount}
              onChange={changeBuyAmount}
              disabled={!prices}
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

        {/* swap button */}
        {isConnected ? (
          <div
            className={`swapButton ${isSwapDisabled ? "disabled" : ""}`}
            onClick={isSwapDisabled ? undefined : fetchDexSwap}
            style={{
              opacity: isSwapDisabled ? 0.6 : 1,
              cursor: isSwapDisabled ? "not-allowed" : "pointer",
            }}
          >
            {isSending ? "Sending…" : isConfirming ? "Confirming…" : "Swap"}
          </div>
        ) : (
          <GradientConnectButton />
        )}
      </div>
    </>
  );
}

export default ClassicSwap;
