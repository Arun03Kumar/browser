import net from "net";
import tls from "tls";
import { URL } from "url";
import fs from "fs";
import path from "path";

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
      body = options.body;
    }

    // Handle file:// protocol
    if (rawUrl.startsWith("file://")) {
      try {
        const filePath = rawUrl.replace("file://", "").replace(/\//g, path.sep);
        const content = fs.readFileSync(filePath, "utf8");
        resolve(content);
        return;
      } catch (error) {
        reject(new Error(`File not found: ${rawUrl}`));
        return;
      }
    }

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return reject(new Error("Malformed URL"));
    }
    const port = url.port || (url.protocol === "https:" ? 443 : 80);
    const host = url.hostname;
    const path = url.pathname + (url.search || "");

    let request = `${method} ${path} HTTP/1.0\r\nHost: ${host}\r\n`;

    if (body && method === "POST") {
      const contentLength = Buffer.byteLength(body, "utf8");
      request += `Content-Type: application/x-www-form-urlencoded\r\n`;
      request += `Content-Length: ${contentLength}\r\n`;
    }

    request += `\r\n`;

    if (body && method === "POST") {
      request += body;
    }

    const onData = (socket) => {
      let data = "";
      socket.on("data", (chunk) => (data += chunk.toString()));
      socket.on("end", () => {
        const separatorIndex = data.indexOf("\r\n\r\n");
        const rawHeaders = data.slice(0, separatorIndex);
        const body = data.slice(separatorIndex + 4);
        resolve(body); // later you can resolve({ headers: rawHeaders, body })
      });
      socket.on("error", reject);
      socket.write(request);
    };

    if (url.protocol === "https:") {
      const socket = tls.connect(
        port,
        host,
        { rejectUnauthorized: false },
        () => onData(socket)
      );
    } else {
      const socket = net.connect(port, host, () => onData(socket));
    }
  });
}
