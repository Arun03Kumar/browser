import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";

export default function Navigation({
  canBack,
  canForward,
  onBack,
  onForward,
  onRefresh,
}) {
  const base =
    "p-2 rounded hover:bg-[#2f2f2f] text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex space-x-1 no-drag">
      <button
        className={base}
        disabled={!canBack}
        onClick={onBack}
        title="Back"
      >
        <ArrowLeft size={18} />
      </button>
      <button
        className={base}
        disabled={!canForward}
        onClick={onForward}
        title="Forward"
      >
        <ArrowRight size={18} />
      </button>
      <button className={base} onClick={onRefresh} title="Refresh">
        <RefreshCw size={18} />
      </button>
    </div>
  );
}
