/**
 * Builds narration audio from scripts/video/narration.txt.
 * macOS: `say` (offline). Linux: espeak-ng if available.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, spawnSync, execFileSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "output");
const narrationFile = path.join(__dirname, "narration.txt");
const aiffOut = path.join(outputDir, "narration.aiff");
const m4aOut = path.join(outputDir, "narration.m4a");

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const text = fs.readFileSync(narrationFile, "utf8");

  if (!text.trim()) {
    throw new Error("narration.txt is empty");
  }

  const platform = process.platform;
  if (platform === "darwin") {
    fs.writeFileSync(path.join(outputDir, "narration-raw.txt"), text, "utf8");
    execSync(`say -f "${path.join(outputDir, "narration-raw.txt")}" -o "${aiffOut}" -v Samantha`, {
      stdio: "inherit",
    });
  } else {
    const espeak = spawnSync("which", ["espeak-ng"], { encoding: "utf8" });
    if (espeak.status !== 0) {
      throw new Error(
        "On non-macOS, install espeak-ng for offline TTS, or run video:build on macOS.",
      );
    }
    const wavOut = path.join(outputDir, "narration.wav");
    execSync(`espeak-ng -f "${narrationFile}" -w "${wavOut}"`, { stdio: "inherit" });
    execFileSync(ffmpegPath, ["-y", "-i", wavOut, "-c:a", "aac", "-b:a", "192k", m4aOut], {
      stdio: "inherit",
    });
    console.log("Narration:", m4aOut);
    return;
  }

  execFileSync(ffmpegPath, ["-y", "-i", aiffOut, "-c:a", "aac", "-b:a", "192k", m4aOut], {
    stdio: "inherit",
  });
  console.log("Narration:", m4aOut);
}

main();
