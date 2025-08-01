"use client";
import { Modal } from "antd";
import { TOKENS } from "@/utils/TokenList";
import { useSpotStore } from "@/store/spotStore";

export const TokenSelectModal = () => {
  const tokenTwo = useSpotStore((s) => s.tokenTwo);
  const { modalOpen, closeModal, setTokenOne } = useSpotStore();

  return (
    <Modal
      open={modalOpen}
      footer={null}
      onCancel={closeModal}
      title="Select a token"
    >
      <div className="modalContent">
        {TOKENS.map((t, i) => (
          <div
            key={i}
            className="tokenChoice"
            onClick={() => {
              if (tokenTwo !== t) {
                setTokenOne(t);
              }
              closeModal();
            }}
          >
            <img src={t.img} alt={t.ticker} className="tokenLogo" />
            <div className="tokenChoiceNames">
              <div className="tokenName">{t.name}</div>
              <div className="tokenTicker">{t.ticker}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
