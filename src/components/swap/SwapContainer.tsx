"use client";

import React, { useState } from "react";

// Import your actual swap components
import ClassicSwap from "./swapTypes/ClassicSwap/ClassicSwap"; // Your existing component
import FusionSwap from "./swapTypes/fusionSwap/FusionSwap";
import CrossChainSwap from "./swapTypes/CrossChainSwap/CrossChainSwap";
// import { IntentBasedSwap } from '../swapTypes/IntentBasedSwap/IntentBasedSwap';
// import { CrossChainSwap } from '../swapTypes/CrossChainSwap/CrossChainSwap';
// import { LimitOrder } from '../swapTypes/LimitOrder/LimitOrder';

// Types
export type SwapType = "classic" | "fusion" | "crosschain" | "limit";

interface SwapTab {
  id: SwapType;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

const SwapContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SwapType>("classic");

  const swapTabs: SwapTab[] = [
    {
      id: "classic",
      label: "Swap",
      description: "Best price execution with 1inch aggregation",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      ),
    },
    {
      id: "fusion",
      label: "Fusion",
      description: "Intent-based swaps with MEV protection",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      id: "crosschain",
      label: "Bridge",
      description: "Cross-chain swaps powered by Fusion+",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      id: "limit",
      label: "Limit",
      description: "Set limit orders for better prices",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  const renderSwapComponent = () => {
    switch (activeTab) {
      case "classic":
        return <ClassicSwap></ClassicSwap>;
      case "fusion":
        return <FusionSwap></FusionSwap>;
      // return (
      //   <div className="p-8 text-center text-gray-400">
      //     <div className="mb-4">
      //       <svg
      //         className="w-12 h-12 mx-auto mb-2 opacity-50"
      //         fill="none"
      //         stroke="currentColor"
      //         viewBox="0 0 24 24"
      //       >
      //         <path
      //           strokeLinecap="round"
      //           strokeLinejoin="round"
      //           strokeWidth={2}
      //           d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      //         />
      //       </svg>
      //     </div>
      //     <h3 className="text-lg font-medium mb-2">
      //       Fusion Swap Coming Soon
      //     </h3>
      //     <p className="text-sm">Intent-based swaps with MEV protection</p>
      //   </div>
      // );
      case "crosschain":
        return <CrossChainSwap />;
      // return (
      //   <div className="p-8 text-center text-gray-400">
      //     <div className="mb-4">
      //       <svg
      //         className="w-12 h-12 mx-auto mb-2 opacity-50"
      //         fill="none"
      //         stroke="currentColor"
      //         viewBox="0 0 24 24"
      //       >
      //         <path
      //           strokeLinecap="round"
      //           strokeLinejoin="round"
      //           strokeWidth={2}
      //           d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      //         />
      //       </svg>
      //     </div>
      //     <h3 className="text-lg font-medium mb-2">Bridge Coming Soon</h3>
      //     <p className="text-sm">Cross-chain swaps powered by Fusion+</p>
      //   </div>
      // );
      case "limit":
        // return <LimitOrder />;
        return (
          <div className="p-8 text-center text-gray-400">
            <div className="mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">
              Limit Orders Coming Soon
            </h3>
            <p className="text-sm">Set limit orders for better prices</p>
          </div>
        );
      default:
        return <ClassicSwap></ClassicSwap>;
    }
  };

  return (
    <div className="w-full">
      {/* Header with title */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white mb-2">Swap</h1>
        <p className="text-gray-400 text-sm">Trade tokens in an instant</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm border border-gray-700/50">
          {swapTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[#00F5E0] text-black shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Description */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            {swapTabs.find((tab) => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Swap Component Content */}
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl overflow-hidden">
        {renderSwapComponent()}
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>Powered by 1inch</span>
        <div className="flex items-center space-x-4">
          <span>Slippage: 0.5%</span>
          <span>Network: Ethereum</span>
        </div>
      </div>
    </div>
  );
};

export default SwapContainer;

// TODO :: chnage swap interface
