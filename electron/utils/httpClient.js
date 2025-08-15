import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

export function httpRequest(options) {
  return new Promise((resolve, reject) => {
    // Handle both old string format and new object format
    let rawUrl,
      method = "GET",
      body = null;

    if (typeof options === "string") {
      rawUrl = options;
    } else {
      rawUrl = options.url;
      method = options.method || "GET";
      body = options.body || null;
    }

    console.log("httpRequest called with:", rawUrl, method);

    // Handle file:// protocol
    if (rawUrl.startsWith("file://")) {
      try {
        // Handle file:///C:/ format (Windows)
        let filePath = rawUrl.replace("file://", "");

        // Handle file:///C:/ format specifically
        if (filePath.startsWith("/") && filePath.match(/^\/[A-Za-z]:/)) {
          filePath = filePath.substring(1); // Remove leading slash for Windows paths
        }

        // Convert forward slashes to backslashes for Windows
        if (process.platform === "win32") {
          filePath = filePath.replace(/\//g, path.sep);
        }

        console.log("Attempting to read file:", filePath);

        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, "utf8");
        console.log("File read successfully, length:", content.length);
        resolve(content);
        return;
      } catch (error) {
        console.error("File read error:", error);
        reject(
          new Error(
            `File not found or cannot be read: ${rawUrl} (${error.message})`
          )
        );
        return;
      }
    }

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      reject(new Error(`Invalid URL: ${rawUrl}`));
      return;
    }

    const port = url.port || (url.protocol === "https:" ? 443 : 80);
    const host = url.hostname;
    const urlPath = url.pathname + (url.search || "");

    let request = `${method} ${urlPath} HTTP/1.0\r\nHost: ${host}\r\n`;

    if (method === "POST" && body) {
      request += `Content-Type: application/x-www-form-urlencoded\r\n`;
      request += `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n`;
    }

    request += "\r\n";
    if (method === "POST" && body) {
      request += body;
    }

    const protocol = url.protocol === "https:" ? https : http;
    const clientRequest = protocol.request(
      {
        hostname: host,
        port: port,
        path: urlPath,
        method: method,
        headers: {
          Host: host,
          "User-Agent": "SimpleElectronBrowser/1.0",
          ...(method === "POST" && body
            ? {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(body, "utf8"),
              }
            : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      }
    );

    clientRequest.on("error", (err) => {
      reject(err);
    });

    if (method === "POST" && body) {
      clientRequest.write(body);
    }

    clientRequest.end();
  });
}
