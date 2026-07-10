import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(".");
const types = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
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
