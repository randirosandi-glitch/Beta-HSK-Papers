import { chromium } from "playwright";

const repository = process.env.GITHUB_REPOSITORY;
const codes = JSON.parse(process.env.AUDIO_CODES || "[]");
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || "")) {
  throw new Error("GITHUB_REPOSITORY is missing or invalid.");
}
if (!Array.isArray(codes) || codes.length === 0) {
  throw new Error("No verified Release assets were provided for playback testing.");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(90000);

try {
  for (const code of codes) {
    if (!/^H[45]\d{4}[A-Z]?$/.test(code)) {
      throw new Error("Invalid package code in migration output: " + code);
    }
    const level = code[1];
    const tag = "beta-audio-hsk" + level;
    const url = "https://github.com/" + repository + "/releases/download/" + tag + "/" + code + ".mp3";
    const html =
      "<!doctype html><meta charset=utf-8>" +
      '<button id="play" type="button">Play audio</button>' +
      '<audio id="player" controls preload="metadata" src="' + url + '"></audio>' +
      "<script>" +
      "document.getElementById('play').addEventListener('click', function() {" +
      "document.getElementById('player').play().catch(function(error) {" +
      "document.body.dataset.playError = error.name + ': ' + error.message;" +
      "});" +
      "});" +
      "</script>";

    await page.goto("about:blank");
    await page.setContent(html);
    const player = page.locator("#player");

    try {
      await page.waitForFunction(() => {
        const audio = document.getElementById("player");
        return audio && audio.readyState >= 1 &&
          Number.isFinite(audio.duration) && audio.duration > 0;
      }, undefined, { timeout: 90000 });
    } catch (error) {
      const state = await player.evaluate(audio => ({
        readyState: audio.readyState,
        networkState: audio.networkState,
        duration: audio.duration,
        error: audio.error ? { code: audio.error.code, message: audio.error.message } : null,
        currentSrc: audio.currentSrc
      }));
      throw new Error(code + " could not load audio metadata: " + JSON.stringify(state) + "; " + error.message);
    }

    const duration = await player.evaluate(audio => audio.duration);
    await page.locator("#play").click();
    try {
      await page.waitForFunction(() => {
        const audio = document.getElementById("player");
        return document.body.dataset.playError || audio.currentTime > 0.35;
      }, undefined, { timeout: 30000 });
    } catch (error) {
      const state = await player.evaluate(audio => ({
        paused: audio.paused,
        currentTime: audio.currentTime,
        readyState: audio.readyState,
        error: audio.error ? { code: audio.error.code, message: audio.error.message } : null
      }));
      throw new Error(code + " did not start playing: " + JSON.stringify(state) + "; " + error.message);
    }

    const playback = await page.evaluate(() => ({
      playError: document.body.dataset.playError || "",
      currentTime: document.getElementById("player").currentTime
    }));
    if (playback.playError || playback.currentTime <= 0.2) {
      throw new Error(code + " playback did not advance: " + JSON.stringify(playback));
    }

    const seekTarget = Math.min(10, duration / 2);
    await player.evaluate((audio, target) => {
      audio.pause();
      audio.currentTime = target;
    }, seekTarget);
    try {
      await page.waitForFunction(target => {
        const audio = document.getElementById("player");
        return !audio.seeking && Math.abs(audio.currentTime - target) < 0.5;
      }, seekTarget, { timeout: 30000 });
    } catch (error) {
      const state = await player.evaluate(audio => ({
        currentTime: audio.currentTime,
        seeking: audio.seeking,
        duration: audio.duration,
        readyState: audio.readyState,
        error: audio.error ? { code: audio.error.code, message: audio.error.message } : null
      }));
      throw new Error(code + " failed seeking: " + JSON.stringify(state) + "; " + error.message);
    }

    console.log("Browser audio passed for " + code + ".mp3: duration " +
      duration.toFixed(1) + "s, playback and seek passed.");
  }
} finally {
  await browser.close();
}
