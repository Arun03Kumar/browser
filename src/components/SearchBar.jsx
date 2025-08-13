export default function SearchBar() {
  return (
    <input
      type="text"
      placeholder="Search or enter address"
      className="no-drag w-2/3 bg-[#2a2a2a] text-white px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
    />
  );
}
