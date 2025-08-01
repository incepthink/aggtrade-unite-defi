"use client";

// src/components/Navbar.tsx
import React, { useState } from "react";
import NavLink from "./Navlink";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, Close } from "@mui/icons-material";

const navItems = [];

interface GradientConnectButtonProps {
  customStyles?: string;
  fullWidth?: boolean;
  variant?: "default" | "form";
}

export function GradientConnectButton({
  customStyles = "",
  fullWidth = false,
  variant = "default",
}: GradientConnectButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        openConnectModal,
        openAccountModal,
        mounted,
        authenticationStatus,
      }) => {
        if (!mounted) return null;
        const ready = mounted && authenticationStatus !== "loading";
        const connected = ready && account;

        // Default navbar styling
        const defaultStyles = `bg-gradient-to-r from-[#00F5E0] to-[#00FAFF] text-black font-semibold p-2 px-3 rounded-sm hover:ring-2 hover:ring-[#00F5E0] hover:ring-offset-2 hover:ring-offset-gray-900
   hover:shadow-[0_0_4px_rgba(0,245,224,0.8),0_0_8px_rgba(0,245,224,0.7),0_0_12px_rgba(0,245,224,0.6),0_0_18px_rgba(0,245,224,0.5),0_0_24px_rgba(0,245,224,0.4)]
   transition-all duration-300 cursor-pointer flex gap-3 items-center text-sm justify-center whitespace-nowrap`;

        // Form variant styling (matches your button design)
        const formStyles = `bg-gradient-to-r from-[#00F5E0] to-[#00FAFF] text-black font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-all duration-300 cursor-pointer flex gap-2 items-center justify-center text-base ${
          fullWidth ? "w-full" : ""
        }`;

        const buttonStyles = variant === "form" ? formStyles : defaultStyles;
        const finalStyles = customStyles || buttonStyles;

        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            className={finalStyles}
          >
            {connected ? (
              <>
                <div>
                  <img
                    src={"/avatar.svg"}
                    alt="User avatar"
                    className="w-5 h-5 rounded-full"
                  />
                </div>
                <span
                  className={variant === "form" ? "block" : "hidden sm:inline"}
                >
                  {account.displayName}
                </span>
              </>
            ) : (
              <>
                <span
                  className={variant === "form" ? "block" : "hidden sm:inline"}
                >
                  Connect Wallet
                </span>
                <span className={variant === "form" ? "hidden" : "sm:hidden"}>
                  Connect
                </span>
              </>
            )}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 bg-transparent shadow flex justify-between items-center p-2 px-4 lg:px-10 z-50 backdrop-blur-2xl">
        {/* Logo */}
        <a href="/" className="flex gap-2 items-center">
          <div className="w-10 h-10">
            <img
              src="/assets/aggtrade.png"
              alt="AggTrade Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-white cursor-pointer">
            AggTrade
          </h2>
        </a>

        {/* Desktop Connect Button */}
        <div className="hidden lg:block">
          <GradientConnectButton />
        </div>

        {/* Mobile Menu Button and Connect Button */}
        <div className="lg:hidden flex items-center gap-2">
          <GradientConnectButton />
          <button
            onClick={toggleMenu}
            className="text-white p-2 hover:bg-gray-800 rounded-md transition-colors duration-200 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <Close sx={{ fontSize: 24 }} />
            ) : (
              <Menu sx={{ fontSize: 24 }} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-white font-semibold">Menu</h3>
          <button
            onClick={closeMenu}
            className="text-white p-2 hover:bg-gray-800 rounded-md transition-colors duration-200"
            aria-label="Close menu"
          >
            <Close sx={{ fontSize: 24 }} />
          </button>
        </div>
      </div>
    </>
  );
}
