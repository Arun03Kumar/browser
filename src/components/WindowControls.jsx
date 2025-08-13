import { Minus, Maximize2, X } from "lucide-react";

export default function WindowControls() {
  return (
    <div className="flex space-x-2 no-drag">
      <button
        onClick={() => window.electronAPI.minimize()}
        className="p-1 rounded hover:bg-[#333] transition-colors"
        title="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={() => window.electronAPI.maximize()}
        className="p-1 rounded hover:bg-[#333] transition-colors"
        title="Maximize"
      >
        <Maximize2 size={14} />
      </button>
      <button
        onClick={() => window.electronAPI.close()}
        className="p-1 rounded hover:bg-red-600 transition-colors"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
