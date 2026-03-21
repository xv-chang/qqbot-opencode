#!/usr/bin/env node
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "..", "dist", "app.js");

const args = process.argv.slice(2);
const child = spawn("node", [appPath, ...args], {
  stdio: "inherit",
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});