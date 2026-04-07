/**
 * Fully automated ConsentChain demo video build:
 * 1. Copy COMPONENTS.schema.json to public/components-schema.json (served by Next)
 * 2. Start next dev, wait for readiness
 * 3. Install Playwright Chromium if needed
 * 4. Record browser video (with API mocks)
 * 5. Generate offline narration
 * 6. Mux to output/consentchain-demo.mp4
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, execSync } from "child_process";
import waitOn from "wait-on";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "output");

function copySchema() {
  const src = path.join(repoRoot, "COMPONENTS.schema.json");
  const dest = path.join(repoRoot, "public", "components-schema.json");
  if (!fs.existsSync(src)) {
    throw new Error(`Missing ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log("Copied COMPONENTS.schema.json -> public/components-schema.json");
}

function runNode(script) {
  execSync(`node "${path.join(__dirname, script)}"`, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  copySchema();

  const dev = spawn("npm", ["run", "dev", "--", "-p", "3000"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env },
  });

  const killDev = () => {
    if (dev.pid && !dev.killed) {
      try {
        dev.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
  };

  process.on("SIGINT", () => {
    killDev();
    process.exit(130);
  });

  try {
    await waitOn({
      resources: ["http://127.0.0.1:3000"],
      timeout: 180000,
      interval: 500,
    });

    try {
      execSync(`npx playwright install chromium`, {
        cwd: repoRoot,
        stdio: "inherit",
      });
    } catch (e) {
      console.warn("playwright install chromium warning:", e?.message ?? e);
    }

    runNode("record.mjs");
    killDev();

    runNode("generate-audio.mjs");
    runNode("merge.mjs");

    console.log("\nDone. Output: output/consentchain-demo.mp4");
  } finally {
    killDev();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
