import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import WagmiWalletProvider from "@/providers/WagmiWalletProvider";
import MuiThemeProvider from "@/providers/MuiThemeProvider";
import Navbar from "@/components/ui/Navbar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AggTrade",
  description: "Aggregate you trading expirience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <WagmiWalletProvider>
          <MuiThemeProvider>
            {/* Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
              <img
                src="/ellipse-home.png"
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <Navbar />
            {children}
          </MuiThemeProvider>
        </WagmiWalletProvider>
      </body>
    </html>
  );
}
