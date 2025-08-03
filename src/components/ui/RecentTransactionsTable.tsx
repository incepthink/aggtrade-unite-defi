// src/components/RecentTransactionsTable.tsx
import React from "react";
import GlowBox from "@/components/ui/GlowBox";

interface RecentTransactionsTableProps {
  onBack?: () => void;
}

const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({
  onBack,
}) => {
  // Placeholder data structure for future implementation
  const placeholderColumns = [
    "Date",
    "Type",
    "Asset",
    "Amount",
    "Status",
    "Network",
    "Hash",
  ];

  return (
    <div className="w-full">
      <GlowBox sx={{ p: 3 }}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span className="text-lg">←</span>
                <span className="text-sm">Back</span>
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              Recent Transactions
            </h2>
          </div>

          {/* Filter/Search controls - placeholder */}
          <div className="flex items-center gap-3">
            <select className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded px-3 py-1">
              <option>All Types</option>
              <option>Swap</option>
              <option>Send</option>
              <option>Receive</option>
              <option>Limit Order</option>
            </select>
            <select className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded px-3 py-1">
              <option>All Networks</option>
              <option>Ethereum</option>
              <option>Polygon</option>
              <option>BSC</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-gray-700">
                {placeholderColumns.map((column) => (
                  <th
                    key={column}
                    className="text-left py-3 px-4 text-sm font-medium text-gray-300"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body - Placeholder rows */}
            <tbody>
              {Array.from({ length: 8 }).map((_, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-12"></div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-16"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-6 bg-gray-700 rounded-full animate-pulse w-16"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-12"></div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination - placeholder */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing 1-10 of 250 transactions
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm bg-gray-800 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors disabled:opacity-50">
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-cyan-400/20 border border-cyan-400/30 text-cyan-400 rounded">
              1
            </span>
            <button className="px-3 py-1 text-sm bg-gray-800 border border-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors">
              Next
            </button>
          </div>
        </div>

        {/* Empty state (hidden for now, will be used when no data) */}
        <div className="hidden flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl text-white/20">📄</span>
          </div>
          <p className="text-white/60 text-sm mb-1">No transactions found</p>
          <p className="text-white/40 text-xs">
            Try adjusting your filters or connect a different wallet
          </p>
        </div>
      </GlowBox>
    </div>
  );
};

export default RecentTransactionsTable;
