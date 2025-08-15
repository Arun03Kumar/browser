import { normalizeUrl } from "../utils";

export default function SearchBar({ value, onChange, onSubmit }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(normalizeUrl(value));
      }}
      placeholder="Search or enter address"
      className="no-drag flex-1 bg-[#2a2a2a] text-white px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
