import { loadAssets } from "./assets.js";
import { InputManager } from "./input.js";
import { PlatformerGame } from "./game.js";

const canvas = document.getElementById("gameCanvas");
const input = new InputManager();

const hud = {
  levelValue: document.getElementById("levelValue"),
  coinsValue: document.getElementById("coinsValue"),
  livesValue: document.getElementById("livesValue"),
  timerValue: document.getElementById("timerValue"),
};

const controls = {
  startButton: document.getElementById("startButton"),
  restartButton: document.getElementById("restartButton"),
  muteButton: document.getElementById("muteButton"),
};

async function boot() {
  try {
    const assets = await loadAssets();
    const game = new PlatformerGame({ canvas, assets, input, hud, controls });
    requestAnimationFrame(game.frame);
  } catch (error) {
    console.error(error);
    const context = canvas.getContext("2d");
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8fafc";
    context.font = "700 28px sans-serif";
    context.fillText("Не удалось загрузить игру", 250, 240);
    context.font = "18px sans-serif";
    context.fillText("Проверь структуру проекта и наличие файлов в папке assets.", 160, 290);
  }
}

boot();
