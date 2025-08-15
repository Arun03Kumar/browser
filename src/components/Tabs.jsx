import { useState } from "react";

export default function Tabs({ tabs, activeTabId, onTabClick, onAddTab }) {
  return (
    <div className="flex space-x-2 h-full items-center no-drag">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabClick(tab.id)}
          className={`flex items-center px-4 py-1 rounded-t-md border border-b-0 text-sm cursor-pointer transition-colors
            ${
              tab.id === activeTabId
                ? "bg-gradient-to-b from-[#2d2d2d] to-[#242424] border-gray-600 text-white"
                : "bg-[#232323] border-gray-700 text-gray-400 hover:text-white hover:bg-[#303030]"
            }`}
          style={{ minWidth: 90 }}
        >
          <span className="truncate max-w-[120px]">{tab.title}</span>
        </div>
      ))}
      <button
        onClick={onAddTab}
        className="ml-1 w-7 h-7 rounded-full bg-[#262626] border border-gray-700 text-gray-400 hover:bg-[#333] hover:text-white text-lg leading-none"
        title="New Tab"
      >
        +
      </button>
    </div>
  );
}
