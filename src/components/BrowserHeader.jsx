import { useState, useCallback } from "react";
import Tabs from "./Tabs";
import WindowControls from "./WindowControls";
import Navigation from "./Navigation";
import SearchBar from "./SearchBar";
import PageView from "./PageView";

export default function BrowserHeader() {
  const [tabs, setTabs] = useState([
    {
      id: 1,
      title: "New Tab",
      url: "",
      html: "",
      tokens: null,
      displayList: null,
      history: [],
      historyIndex: -1,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState(1);

  const updateTab = useCallback(
    (id, data) => {
      setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, ...data } : t)));
    },
    []
  );

  const addTab = () => {
    const id = Date.now();
    setTabs((ts) => [
      ...ts,
      {
        id,
        title: "New Tab",
        url: "",
        html: "",
        tokens: null,
        displayList: null,
        history: [],
        historyIndex: -1,
      },
    ]);
    setActiveTabId(id);
  };

  const navigateTo = async (finalUrl) => {
    if (!finalUrl) return;
    try {
      const body = await window.electronAPI.httpRequest(finalUrl);
      setTabs((ts) =>
        ts.map((t) => {
          if (t.id !== activeTabId) return t;
          const newHistory = t.history
            .slice(0, t.historyIndex + 1)
            .concat(finalUrl);
          return {
            ...t,
            url: finalUrl,
            html: body,
            tokens: null,
            displayList: null,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            title: deriveTitle(body) || finalUrl,
          };
        })
      );
    } catch (e) {
      updateTab(activeTabId, {
        html: `<p><b>Error:</b> ${e.message}</p>`,
        tokens: null,
        displayList: null,
      });
    }
  };

  const goBack = () => {
    setTabs((ts) =>
      ts.map((t) => {
        if (t.id !== activeTabId) return t;
        if (t.historyIndex <= 0) return t;
        const idx = t.historyIndex - 1;
        return { ...t, historyIndex: idx, url: t.history[idx] };
      })
    );
  };

  const goForward = () => {
    setTabs((ts) =>
      ts.map((t) => {
        if (t.id !== activeTabId) return t;
        if (t.historyIndex >= t.history.length - 1) return t;
        const idx = t.historyIndex + 1;
        return { ...t, historyIndex: idx, url: t.history[idx] };
      })
    );
  };

  const refresh = () => {
    const active = tabs.find((t) => t.id === activeTabId);
    if (active?.url) navigateTo(active.url);
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-full text-white bg-[#1e1e1e]">
      {/* Top Bar */}
      <div className="flex justify-between items-center h-10 px-2 drag border-b border-gray-700">
        <Tabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={setActiveTabId}
          onAddTab={addTab}
        />
        <WindowControls />
      </div>
      {/* Search Bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-gray-700 bg-[#202020]">
        <Navigation
          canBack={!!(activeTab && activeTab.historyIndex > 0)}
          canForward={!!(activeTab && activeTab.historyIndex < activeTab.history.length - 1)}
          onBack={goBack}
          onForward={goForward}
          onRefresh={refresh}
        />
        <SearchBar
          value={activeTab?.url || ""}
          onChange={(url) => updateTab(activeTabId, { url })}
          onSubmit={navigateTo}
        />
      </div>
      {/* Below header, the page viewport: */}
      <div className="flex-1 min-h-0">
        {activeTab ? (
          <PageView tab={activeTab} onUpdateTab={updateTab} />
        ) : (
          <div className="p-4 text-sm text-gray-400">No tab selected</div>
        )}
      </div>
    </div>
  );
}

function deriveTitle(html) {
  const match = /<title>(.*?)<\/title>/i.exec(html);
  return match ? match[1].trim() : "";
}
