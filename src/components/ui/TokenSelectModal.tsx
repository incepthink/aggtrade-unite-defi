// components/swap/TokenSelectModal.tsx
"use client";
import { Modal, Select } from "antd";
import { useState, useEffect } from "react";
import {
  useTokens,
  usePopularTokens,
  Token,
  SUPPORTED_CHAINS,
} from "@/hooks/useTokens";
import { useSpotStore, CrossChainToken } from "@/store/spotStore";
import { TOKENS } from "@/utils/TokenList";

const { Option } = Select;

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

  const handleChainChange = (chainId: number) => {
    setSelectedChainId(chainId);
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
    <Modal
      open={modalOpen}
      footer={null}
      onCancel={handleModalClose}
      title={getModalTitle()}
      width={420}
    >
      <div className="space-y-4">
        {/* Chain Selector for Cross-Chain Mode */}
        {isCrossChainMode && (
          <div className="px-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Network
            </label>
            <Select
              value={selectedChainId}
              onChange={handleChainChange}
              className="w-full"
              placeholder="Choose a network"
            >
              {Object.entries(SUPPORTED_CHAINS).map(([chainId, chain]) => (
                <Option key={chainId} value={Number(chainId)}>
                  <div className="flex items-center gap-2">
                    <span>{chain.icon}</span>
                    <span>{chain.name}</span>
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        )}

        {/* Search Input */}
        <div className="px-4">
          <input
            type="text"
            placeholder="Search by name or symbol"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
        </div>

        {/* Token Type Tabs */}
        <div className="px-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("popular")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "popular"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Tokens (
              {hasApiTokens ? allTokens?.length || 0 : TOKENS.length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-4 py-8 text-center text-gray-500">
            {isCrossChainMode
              ? `Loading tokens from ${SUPPORTED_CHAINS[selectedChainId]?.name}...`
              : "Loading tokens from 1inch..."}
          </div>
        )}

        {/* Error State */}
        {error && !hasApiTokens && (
          <div className="px-4 py-2 text-center text-amber-600 bg-amber-50 mx-4 rounded">
            {isCrossChainMode
              ? `Using fallback tokens for ${SUPPORTED_CHAINS[selectedChainId]?.name}`
              : "Using fallback tokens. Failed to load from 1inch API."}
          </div>
        )}

        {/* Success State */}
        {hasApiTokens && !isLoading && (
          <div className="px-4 py-2 text-center text-green-600 bg-green-50 mx-4 rounded">
            ✅ Loaded {allTokens?.length || 0} tokens
            {isCrossChainMode &&
              ` from ${SUPPORTED_CHAINS[selectedChainId]?.name}`}
          </div>
        )}

        {/* Token List */}
        {!isLoading && (
          <div className="modalContent max-h-64 overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchQuery ? "No tokens found" : "No tokens available"}
              </div>
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
                  <div
                    key={`${token.address}-${selectedChainId}-${i}`}
                    className={`tokenChoice transition-colors cursor-pointer flex items-center p-3 ${
                      isAlreadySelected
                        ? "bg-gray-100 cursor-not-allowed opacity-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() =>
                      !isAlreadySelected && handleTokenSelect(token)
                    }
                  >
                    <img
                      src={token.img}
                      alt={token.ticker}
                      className="w-8 h-8 rounded-full mr-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://token-icons.1inch.io/${token.address}.png`;
                      }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {token.name}
                        {isCrossChainMode && (
                          <span className="text-xs text-gray-500">
                            {SUPPORTED_CHAINS[selectedChainId]?.icon}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {token.ticker}
                        {isCrossChainMode && (
                          <span className="ml-1 text-xs">
                            on {SUPPORTED_CHAINS[selectedChainId]?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Show if already selected */}
                    {isAlreadySelected && (
                      <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Selected
                      </div>
                    )}

                    {/* Show chain badge for cross-chain */}
                    {isCrossChainMode && !isAlreadySelected && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {SUPPORTED_CHAINS[selectedChainId]?.symbol}
                      </div>
                    )}

                    {/* Show source badge for regular tokens */}
                    {!isCrossChainMode &&
                      hasApiTokens &&
                      !isAlreadySelected && (
                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          1inch
                        </div>
                      )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-2 text-xs text-gray-500 border-t">
          {isCrossChainMode
            ? `${filteredTokens.length} tokens on ${SUPPORTED_CHAINS[selectedChainId]?.name}`
            : hasApiTokens
            ? `✅ ${allTokens?.length || 0} tokens loaded from 1inch API`
            : `Using ${TOKENS.length} fallback tokens`}
        </div>
      </div>
    </Modal>
  );
};
