import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createOddsAgent } from "./odds-agent.mjs";

const root = resolve(".");
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

async function loadTxlineCredentials() {
  const values = Object.fromEntries((await readFile(resolve(root, ".env"), "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }));
  if (!values.TXLINE_JWT || !values.TXLINE_API_TOKEN) throw new Error("TxLINE credentials are not configured");
  return values;
}

const oddsAgent = await createOddsAgent({ loadCredentials: loadTxlineCredentials });

createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/api/agent/status") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(oddsAgent.getStatus()));
    return;
  }
  if (path === "/api/txline/fixtures") {
    try {
      const credentials = await loadTxlineCredentials();
      const origin = credentials.TXLINE_API_ORIGIN || "https://txline.txodds.com";
      if (origin !== "https://txline.txodds.com") throw new Error("Unsupported TxLINE origin");
      const upstream = await fetch(`${origin}/api/fixtures/snapshot`, {
        headers: {
          authorization: `Bearer ${credentials.TXLINE_JWT}`,
          "x-api-token": credentials.TXLINE_API_TOKEN,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      });
      const body = await upstream.text();
      response.writeHead(upstream.status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(body);
    } catch (error) {
      response.writeHead(503, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const relativePath = path === "/" ? "index.html" : decodeURIComponent(path).replace(/^\/+/, "");
  const filePath = resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${sep}`) && filePath !== root) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(file);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("MatchPulse is available at http://127.0.0.1:4173"));
