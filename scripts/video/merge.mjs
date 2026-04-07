/**
 * Muxes Playwright WebM + narration AAC into output/consentchain-demo.mp4.
 * If video is shorter than audio, extends the last frame (tpad).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync, spawnSync } from "child_process";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..", "..");
const outputDir = path.join(repoRoot, "output");
const videoPathFile = path.join(outputDir, "video-path.txt");
const m4aPath = path.join(outputDir, "narration.m4a");
const outMp4 = path.join(outputDir, "consentchain-demo.mp4");

function probeDurationSeconds(file) {
  const r = spawnSync(ffmpegPath, ["-i", file], { encoding: "utf8" });
  const out = `${r.stderr ?? ""}${r.stdout ?? ""}`;
  const m = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  return h * 3600 + min * 60 + sec;
}

function main() {
  if (!fs.existsSync(videoPathFile)) {
    throw new Error("Missing output/video-path.txt — run video:record first.");
  }
  if (!fs.existsSync(m4aPath)) {
    throw new Error("Missing output/narration.m4a — run video:audio first.");
  }

  const webm = fs.readFileSync(videoPathFile, "utf8").trim();
  if (!fs.existsSync(webm)) {
    throw new Error(`Recording not found: ${webm}`);
  }

  const vDur = probeDurationSeconds(webm);
  const aDur = probeDurationSeconds(m4aPath);
  if (vDur == null || aDur == null) {
    throw new Error("Could not read media duration; check ffmpeg output.");
  }

  const pad = Math.max(0, aDur - vDur + 0.25);

  const vfPad = `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}[v]`;
  const vfShort = `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v]`;

  if (pad > 0.05) {
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        webm,
        "-i",
        m4aPath,
        "-filter_complex",
        vfPad,
        "-map",
        "[v]",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        outMp4,
      ],
      { stdio: "inherit" },
    );
  } else {
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        webm,
        "-i",
        m4aPath,
        "-filter_complex",
        vfShort,
        "-map",
        "[v]",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        outMp4,
      ],
      { stdio: "inherit" },
    );
  }

  console.log("Final video:", outMp4);
}

main();
