import { Minus, X, Maximize2 } from "lucide-react";

export default function WindowControls() {
  return (
    <div className="flex space-x-1 no-drag">
      <button
        onClick={() => window.electronAPI.minimize()}
        className="px-2 py-1 rounded hover:bg-[#333]"
        title="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={() => window.electronAPI.maximize()}
        className="px-2 py-1 rounded hover:bg-[#333]"
        title="Maximize"
      >
        <Maximize2 size={14} />
      </button>
      <button
        onClick={() => window.electronAPI.close()}
        className="px-2 py-1 rounded hover:bg-red-600"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
