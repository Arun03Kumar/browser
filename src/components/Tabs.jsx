import { useState } from "react";

export default function Tabs() {
  const [tabs, setTabs] = useState(["New Tab"]);

  return (
    <div className="flex space-x-2 h-full items-center no-drag">
      {tabs.map((tab, idx) => (
        <div
          key={idx}
          className="flex items-center px-5 py-1 bg-gradient-to-b from-[#292929] to-[#232323] rounded-t-lg shadow-sm border border-b-0 border-gray-700 hover:from-[#333] hover:to-[#222] transition-all duration-150 cursor-pointer relative"
          style={{
            minWidth: "100px",
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: "#e0e0e0",
          }}
        >
          <span className="truncate">{tab}</span>
        </div>
      ))}
      <button
        onClick={() => setTabs([...tabs, "New Tab"])}
        className="ml-2 flex items-center justify-center w-8 h-8 bg-[#232323] border border-gray-700 rounded-full text-gray-400 hover:text-white hover:bg-[#333] transition-all duration-150 shadow no-drag"
        title="New Tab"
      >
        <span className="text-xl leading-none">+</span>
      </button>
    </div>
  );
}
