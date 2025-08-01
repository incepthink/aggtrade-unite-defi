"use client";
import { useSpotStore } from "@/store/spotStore";
import React from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const TokenSelect = () => {
  const { tokenOne, openModal } = useSpotStore();

  return (
    <button
      onClick={openModal}
      className="neon-bg px-5 py-3 rounded-md flex items-center gap-4 cursor-pointer border-0 "
    >
      <div className="w-8">
        <img
          src={tokenOne.img}
          alt={tokenOne.ticker}
          className="w-full object-cover"
        />
      </div>
      <div className="flex items-center gap-1">
        <span>{tokenOne.ticker}</span>
        <ArrowDropDownIcon />
      </div>
    </button>
  );
};

export default TokenSelect;
