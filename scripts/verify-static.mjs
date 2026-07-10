import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, app, recorder, readme, submission] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("app.js", "utf8"),
  readFile("scripts/record-demo.mjs", "utf8"),
  readFile("README.md", "utf8"),
  readFile("docs/SUBMISSION.md", "utf8"),
]);

assert.match(html, /id="loadDemoButton"/);
assert.match(html, /type="url"/);
assert.doesNotMatch(html, /api\/fixtures\/snapshot/);
assert.match(app, /TXLINE_HOSTS/);
assert.match(app, /REQUEST_TIMEOUT_MS/);
assert.match(app, /escapeHtml\(fixture\.status\)/);
assert.match(recorder, /Restore demo snapshot/);
assert.doesNotMatch(recorder, /Load demo/);
assert.doesNotMatch(readme, /TBD after recording/);
assert.doesNotMatch(submission, /TBD after recording/);

console.log("Static safety checks passed.");
