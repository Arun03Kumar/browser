import net from "net";
import tls from "tls";
import { URL } from "url";

export function httpRequest(rawUrl) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return reject(new Error("Malformed URL"));
    }
    const port = url.port || (url.protocol === "https:" ? 443 : 80);
    const host = url.hostname;
    const path = url.pathname + (url.search || "");

    const request = `GET ${path} HTTP/1.0\r\nHost: ${host}\r\n\r\n`;

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
