// store/spotStore.ts
import { Token, TOKENS } from "@/utils/TokenList";
import { create } from "zustand";

// Enhanced Token interface for cross-chain
export interface CrossChainToken extends Token {
  chainId?: number;
}

type spotStore = {
  tokenOne: CrossChainToken;
  tokenTwo: CrossChainToken;
  setTokenOne: (token: CrossChainToken) => void;
  setTokenTwo: (token: CrossChainToken) => void;

  modalOpen: boolean;
  modalTarget: "tokenOne" | "tokenTwo";

  // Cross-chain specific modal state
  modalChainId?: number; // Track which chain we're selecting tokens for
  isCrossChainMode: boolean; // Track if we're in cross-chain mode

  // Modal functions
  openModal: () => void;
  openModalForTokenTwo: () => void;
  openModalForTokenOne: () => void; // Explicit function for tokenOne

  // Cross-chain modal functions
  openCrossChainModal: (
    target: "tokenOne" | "tokenTwo",
    chainId: number
  ) => void;
  setCrossChainMode: (enabled: boolean) => void;

  closeModal: () => void;

  // Chain selection for cross-chain swaps
  srcChain: number;
  dstChain: number;
  setSrcChain: (chainId: number) => void;
  setDstChain: (chainId: number) => void;
};

export const useSpotStore = create<spotStore>((set, get) => ({
  tokenOne: { ...TOKENS[0], chainId: 1 }, // Default to Ethereum
  tokenTwo: { ...TOKENS[1], chainId: 1 }, // Default to Ethereum

  setTokenOne: (token: CrossChainToken) => {
    set(() => ({ tokenOne: token }));
  },
  setTokenTwo: (token: CrossChainToken) => {
    set(() => ({ tokenTwo: token }));
  },

  modalOpen: false,
  modalTarget: "tokenOne",
  modalChainId: undefined,
  isCrossChainMode: false,

  // Basic modal functions (backward compatible)
  openModal: () => set({ modalOpen: true, modalTarget: "tokenOne" }),
  openModalForTokenOne: () => set({ modalOpen: true, modalTarget: "tokenOne" }),
  openModalForTokenTwo: () => set({ modalOpen: true, modalTarget: "tokenTwo" }),

  // Cross-chain modal function
  openCrossChainModal: (target: "tokenOne" | "tokenTwo", chainId: number) =>
    set({
      modalOpen: true,
      modalTarget: target,
      modalChainId: chainId,
      isCrossChainMode: true,
    }),

  setCrossChainMode: (enabled: boolean) => set({ isCrossChainMode: enabled }),

  closeModal: () =>
    set({
      modalOpen: false,
      modalChainId: undefined,
      isCrossChainMode: false,
    }),

  // Chain selection for cross-chain swaps
  srcChain: 1, // Default to Ethereum
  dstChain: 137, // Default to Polygon

  setSrcChain: (chainId: number) => {
    const { dstChain, tokenOne } = get();
    set({ srcChain: chainId });

    // If setting same chain as destination, swap them
    if (chainId === dstChain) {
      set({ dstChain: tokenOne.chainId || 1 });
    }
  },

  setDstChain: (chainId: number) => {
    const { srcChain, tokenTwo } = get();
    set({ dstChain: chainId });

    // If setting same chain as source, swap them
    if (chainId === srcChain) {
      set({ srcChain: tokenTwo.chainId || 1 });
    }
  },
}));
