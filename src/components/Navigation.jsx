import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";

export default function Navigation() {
  return (
    <div className="flex space-x-2 mr-4 no-drag">
      <button
        className="p-2 rounded hover:bg-[#333] text-gray-300 transition-colors"
        title="Back"
      >
        <ArrowLeft size={18} />
      </button>
      <button
        className="p-2 rounded hover:bg-[#333] text-gray-300 transition-colors"
        title="Forward"
      >
        <ArrowRight size={18} />
      </button>
      <button
        className="p-2 rounded hover:bg-[#333] text-gray-300 transition-colors"
        title="Refresh"
      >
        <RefreshCw size={18} />
      </button>
    </div>
  );
}
