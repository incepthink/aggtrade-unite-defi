import { Token, TOKENS } from "@/utils/TokenList";
import { create } from "zustand";

type spotStore = {
  tokenOne: Token;
  tokenTwo: Token;
  setTokenOne: (token: Token) => void;
  setTokenTwo: (token: Token) => void;

  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

export const useSpotStore = create<spotStore>((set) => ({
  tokenOne: TOKENS[0],
  tokenTwo: TOKENS[1],
  setTokenOne: (token: Token) => {
    set(() => ({ tokenOne: token }));
  },
  setTokenTwo: (token: Token) => {
    set(() => ({ tokenTwo: token }));
  },
  modalOpen: false,
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));
