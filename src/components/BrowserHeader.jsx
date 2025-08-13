import Tabs from "./Tabs";
import WindowControls from "./WindowControls";
import Navigation from "./Navigation";
import SearchBar from "./SearchBar";

export default function BrowserHeader() {
  return (
    <div className="select-none text-white bg-[#1e1e1e] border-b border-gray-700">
      {/* Top Bar */}
      <div className="flex justify-between items-center h-10 px-2 drag">
        {/* Tabs */}
        <Tabs />

        {/* Window Controls */}
        <WindowControls />
      </div>

      {/* Search Bar */}
      <div className="h-12 flex justify-center items-center px-4">
        {/* Navigation Arrows */}
        <Navigation />
        <SearchBar />
      </div>
    </div>
  );
}
