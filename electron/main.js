// main.js (ESM style)
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { httpRequest } from "./utils/httpClient.js";

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });

    // Add a View menu with a DevTools toggle (F12)
    const template = [
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { type: "separator" },
          { role: "toggleDevTools", accelerator: "F12" },
        ],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("window-minimize", () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.isMaximized() ? win.unmaximize() : win?.maximize();
});

ipcMain.on("window-close", () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle("http-request", async (event, url) => {
  return await httpRequest(url);
});
