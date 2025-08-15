import { useState, useCallback, useEffect } from "react";
import PageView from "./PageView";

export default function BrowserHeader() {
  const [tabs, setTabs] = useState([
    {
      id: 1,
      title: "New Tab",
      url: "",
      html: "",
      tokens: null,
      tree: null,
      displayList: null,
      history: [],
      historyIndex: -1,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [searchText, setSearchText] = useState("");

  // Update search text when active tab changes
  useEffect(() => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab && activeTab.url) {
      setSearchText(activeTab.url);
    }
  }, [activeTabId, tabs]);

  const updateTab = useCallback((id, data) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => (tab.id === id ? { ...tab, ...data } : tab))
    );
  }, []);

  const addTab = () => {
    const newTab = {
      id: Date.now(),
      title: "New Tab",
      url: "",
      html: "",
      tokens: null,
      tree: null,
      displayList: null,
      history: [],
      historyIndex: -1,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSearchText("");
  };

  const switchTab = (tabId) => {
    setActiveTabId(tabId);
  };

  const isValidURL = (input) => {
    const trimmed = input.trim();

    // Check for file:// protocol
    if (trimmed.startsWith("file://")) {
      return true;
    }

    // Check for Windows file paths (C:\Users\... or file:///C:/...)
    if (trimmed.match(/^[A-Za-z]:[\\\/]/)) {
      return true;
    }

    // Check for file:///C:/ pattern
    if (
      trimmed.startsWith("file:///") &&
      trimmed.match(/file:\/\/\/[A-Za-z]:/)
    ) {
      return true;
    }

    // Check for http/https protocols
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return true;
    }

    // Check for localhost
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      return true;
    }

    // Check for file extensions
    if (trimmed.endsWith(".html") || trimmed.endsWith(".htm")) {
      return true;
    }

    // Check for domain patterns (contains . and no spaces)
    if (trimmed.includes(".") && !trimmed.includes(" ") && trimmed.length > 3) {
      return true;
    }

    return false;
  };

  const formatURL = (input) => {
    const trimmed = input.trim();

    console.log("Formatting URL:", trimmed);

    // Handle file:// URLs - pass through unchanged
    if (trimmed.startsWith("file://")) {
      return trimmed;
    }

    // Handle Windows file paths (C:\Users\...)
    if (trimmed.match(/^[A-Za-z]:[\\\/]/)) {
      const normalized = trimmed.replace(/\\/g, "/");
      const result = `file:///${normalized}`;
      console.log("Windows path converted to:", result);
      return result;
    }

    // Handle file:///C:/ pattern - pass through unchanged
    if (
      trimmed.startsWith("file:///") &&
      trimmed.match(/file:\/\/\/[A-Za-z]:/)
    ) {
      return trimmed;
    }

    // Handle http/https URLs
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    // Handle localhost
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      return trimmed.startsWith("http") ? trimmed : `http://${trimmed}`;
    }

    // Handle file extensions without full path
    if (trimmed.endsWith(".html") || trimmed.endsWith(".htm")) {
      if (trimmed.startsWith("/")) {
        return `file://${trimmed}`;
      } else {
        return `file:///${trimmed}`;
      }
    }

    // Handle domain names
    if (trimmed.includes(".") && !trimmed.includes(" ")) {
      return `https://${trimmed}`;
    }

    // Default to search for everything else
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      trimmed
    )}`;
    console.log("Defaulting to search:", searchUrl);
    return searchUrl;
  };

  const navigateTo = async (finalUrl, method = "GET", body = null) => {
    if (!finalUrl) return;

    try {
      console.log(`Navigating to: ${finalUrl} (${method})`);

      let requestOptions;
      if (method === "POST" && body) {
        requestOptions = {
          url: finalUrl,
          method: "POST",
          body: body,
        };
      } else {
        requestOptions = finalUrl;
      }

      const responseBody = await window.electronAPI.httpRequest(requestOptions);

      setTabs((ts) =>
        ts.map((t) => {
          if (t.id !== activeTabId) return t;

          const newHistory = t.history
            .slice(0, t.historyIndex + 1)
            .concat(finalUrl);
          return {
            ...t,
            url: finalUrl,
            html: responseBody,
            tree: null, // Reset to force re-parsing
            tokens: null,
            displayList: null,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            title: deriveTitle(responseBody) || finalUrl,
          };
        })
      );

      // Update the search text to show the current URL
      setSearchText(finalUrl);
    } catch (e) {
      console.error("Navigation error:", e);
      updateTab(activeTabId, {
        html: `<div style="padding: 20px; font-family: Arial;"><h2>Error Loading Page</h2><p><b>Error:</b> ${e.message}</p><p><b>URL:</b> ${finalUrl}</p><p>Make sure the file path is correct and the file exists.</p></div>`,
        tree: null,
        tokens: null,
        displayList: null,
      });
    }
  };

  const handleSearch = () => {
    const finalUrl = formatURL(searchText);
    console.log("Final URL to navigate to:", finalUrl);
    navigateTo(finalUrl);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const goBack = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab || activeTab.historyIndex <= 0) return;

    const newIndex = activeTab.historyIndex - 1;
    const url = activeTab.history[newIndex];

    try {
      const responseBody = await window.electronAPI.httpRequest(url);
      updateTab(activeTabId, {
        url: url,
        html: responseBody,
        tree: null,
        tokens: null,
        displayList: null,
        historyIndex: newIndex,
        title: deriveTitle(responseBody) || url,
      });
      setSearchText(url);
    } catch (e) {
      console.error("Back navigation error:", e);
    }
  };

  const goForward = async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1)
      return;

    const newIndex = activeTab.historyIndex + 1;
    const url = activeTab.history[newIndex];

    try {
      const responseBody = await window.electronAPI.httpRequest(url);
      updateTab(activeTabId, {
        url: url,
        html: responseBody,
        tree: null,
        tokens: null,
        displayList: null,
        historyIndex: newIndex,
        title: deriveTitle(responseBody) || url,
      });
      setSearchText(url);
    } catch (e) {
      console.error("Forward navigation error:", e);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-full text-white bg-[#1e1e1e]">
      {/* Tab bar */}
      <div className="flex items-center bg-[#2d2d2d] border-b border-gray-600">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`px-4 py-2 cursor-pointer border-r border-gray-600 min-w-[150px] max-w-[200px] truncate ${
              tab.id === activeTabId
                ? "bg-[#1e1e1e]"
                : "bg-[#2d2d2d] hover:bg-[#3d3d3d]"
            }`}
            onClick={() => switchTab(tab.id)}
          >
            {tab.title || "New Tab"}
          </div>
        ))}
        <button
          onClick={addTab}
          className="px-4 py-2 hover:bg-[#3d3d3d] text-gray-300"
        >
          +
        </button>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center p-2 bg-[#2d2d2d] border-b border-gray-600">
        <button
          onClick={goBack}
          className="px-3 py-1 mr-2 hover:bg-[#3d3d3d] rounded"
          disabled={!activeTab || activeTab.historyIndex <= 0}
        >
          ←
        </button>
        <button
          onClick={goForward}
          className="px-3 py-1 mr-2 hover:bg-[#3d3d3d] rounded"
          disabled={
            !activeTab || activeTab.historyIndex >= activeTab.history.length - 1
          }
        >
          →
        </button>
        <div className="flex-1 mx-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter URL or search term..."
            className="w-full px-3 py-1 text-black rounded"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-1 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Go
        </button>
      </div>

      {/* Page content */}
      <div className="flex-1 min-h-0">
        {activeTab ? (
          <PageView
            tab={activeTab}
            onUpdateTab={updateTab}
            onNavigate={navigateTo}
          />
        ) : (
          <div className="p-4 text-sm text-gray-400">No tab selected</div>
        )}
      </div>
    </div>
  );
}

function deriveTitle(html) {
  if (!html) return null;
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}
