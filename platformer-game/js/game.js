import { GAME_CONFIG, COLORS, GAME_STATES } from "./config.js";
import { LEVELS } from "./levels.js";
import { Player, Coin, Goal, Hazard } from "./entities.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const intersects = (a, b) =>
  a.left < b.right &&
  a.right > b.left &&
  a.top < b.bottom &&
  a.bottom > b.top;

const formatTime = (seconds) => `${seconds.toFixed(1)}s`;

function createAudioController() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = AudioContextClass ? new AudioContextClass() : null;

  const beep = (frequency, duration, type = "sine", volume = 0.03) => {
    if (!audioContext || audioContext.state === "suspended") return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  };

  return {
    async resume() {
      if (audioContext && audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch (error) {
          console.warn("Не удалось активировать звук", error);
        }
      }
    },
    coin() {
      beep(880, 0.12, "triangle", 0.04);
    },
    jump() {
      beep(520, 0.09, "square", 0.02);
    },
    hit() {
      beep(180, 0.18, "sawtooth", 0.028);
    },
    goal() {
      beep(660, 0.1, "triangle", 0.035);
      setTimeout(() => beep(990, 0.18, "triangle", 0.032), 90);
    },
    win() {
      beep(523, 0.12, "triangle", 0.03);
      setTimeout(() => beep(659, 0.12, "triangle", 0.03), 100);
      setTimeout(() => beep(784, 0.18, "triangle", 0.03), 200);
    },
  };
}

export class PlatformerGame {
  constructor({ canvas, assets, input, hud, controls }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.assets = assets;
    this.input = input;
    this.hud = hud;
    this.controls = controls;

    this.state = GAME_STATES.READY;
    this.currentLevelIndex = 0;
    this.levelElapsed = 0;
    this.totalElapsed = 0;
    this.lives = GAME_CONFIG.startLives;
    this.camera = { x: 0, y: 0 };
    this.flashTimer = 0;
    this.messageAlpha = 0;
    this.soundEnabled = false;
    this.audio = createAudioController();
    this.lastTimestamp = 0;

    this.bindControls();
    this.setupLevel(this.currentLevelIndex);
    this.updateHud();
  }

  bindControls() {
    this.controls.startButton.addEventListener("click", async () => {
      await this.audio.resume();
      this.toggleStart();
    });

    this.controls.restartButton.addEventListener("click", () => {
      this.restartGame();
    });

    this.controls.muteButton.addEventListener("click", async () => {
      await this.audio.resume();
      this.soundEnabled = !this.soundEnabled;
      this.controls.muteButton.textContent = `Звук: ${this.soundEnabled ? "вкл" : "выкл"}`;
    });
  }

  async toggleStart() {
    if (this.state === GAME_STATES.READY || this.state === GAME_STATES.PAUSED) {
      this.state = GAME_STATES.PLAYING;
      return;
    }

    if (this.state === GAME_STATES.PLAYING) {
      this.state = GAME_STATES.PAUSED;
      return;
    }

    if ([GAME_STATES.GAME_OVER, GAME_STATES.VICTORY].includes(this.state)) {
      this.restartGame();
    }
  }

  setupLevel(index) {
    const level = LEVELS[index];
    this.level = {
      ...level,
      coins: level.coins.map((coin) => new Coin(coin)),
      goal: new Goal(level.goal),
      hazards: level.hazards.map((hazard) => new Hazard(hazard)),
    };
    this.player = new Player(level.playerSpawn);
    this.levelElapsed = 0;
    this.flashTimer = 0;
    this.messageAlpha = 1;
    this.camera.x = 0;
    this.camera.y = 0;
    this.state = this.state === GAME_STATES.READY ? GAME_STATES.READY : GAME_STATES.PLAYING;
    this.updateHud();
  }

  restartLevel() {
    this.player.respawn(this.level.playerSpawn);
    this.level.coins.forEach((coin) => {
      coin.collected = false;
    });
    this.levelElapsed = 0;
    this.flashTimer = 0;
    this.messageAlpha = 1;
    this.state = GAME_STATES.PLAYING;
    this.updateHud();
  }

  restartGame() {
    this.lives = GAME_CONFIG.startLives;
    this.currentLevelIndex = 0;
    this.totalElapsed = 0;
    this.state = GAME_STATES.READY;
    this.setupLevel(0);
  }

  playSound(kind) {
    if (!this.soundEnabled) return;
    const fn = this.audio[kind];
    if (typeof fn === "function") fn();
  }

  update(delta) {
    const dt = Math.min(delta, 1 / 30);
    this.totalElapsed += dt;

    if (this.input.consume("mute")) {
      this.audio.resume();
      this.soundEnabled = !this.soundEnabled;
      this.controls.muteButton.textContent = `Звук: ${this.soundEnabled ? "вкл" : "выкл"}`;
    }

    if (this.input.consume("start")) {
      this.audio.resume();
      this.toggleStart();
    }

    if (this.input.consume("restart")) {
      if ([GAME_STATES.GAME_OVER, GAME_STATES.VICTORY].includes(this.state)) {
        this.restartGame();
      } else {
        this.restartLevel();
      }
    }

    if (this.state !== GAME_STATES.PLAYING) {
      this.updateHud();
      return;
    }

    this.levelElapsed += dt;
    this.player.animationTime += dt;
    this.player.hitFlash = Math.max(0, this.player.hitFlash - dt * 3.5);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.messageAlpha = Math.max(0.12, this.messageAlpha - dt * 0.16);

    const player = this.player;
    const movingLeft = this.input.isDown("left");
    const movingRight = this.input.isDown("right");
    const wantsJump = this.input.consume("jump");

    if (wantsJump) {
      player.jumpBufferedAt = this.levelElapsed;
    }

    const moveDirection = (movingRight ? 1 : 0) - (movingLeft ? 1 : 0);
    if (moveDirection !== 0) {
      player.direction = moveDirection;
    }

    const acceleration = player.onGround ? 1900 : 1200;
    player.vx += moveDirection * acceleration * dt;

    if (moveDirection === 0) {
      player.vx *= player.onGround ? GAME_CONFIG.frictionGround : GAME_CONFIG.frictionAir;
      if (Math.abs(player.vx) < 6) player.vx = 0;
    }

    player.vx = clamp(player.vx, -GAME_CONFIG.playerSpeed, GAME_CONFIG.playerSpeed);

    player.vy += GAME_CONFIG.gravity * dt;
    player.vy = Math.min(player.vy, GAME_CONFIG.terminalVelocity);

    const canUseCoyote = this.levelElapsed - player.lastGroundedAt <= GAME_CONFIG.coyoteTime;
    const jumpBuffered = this.levelElapsed - player.jumpBufferedAt <= GAME_CONFIG.jumpBufferTime;

    if (jumpBuffered && (player.onGround || canUseCoyote)) {
      player.vy = -GAME_CONFIG.jumpVelocity;
      player.onGround = false;
      player.jumpBufferedAt = -999;
      player.lastGroundedAt = -999;
      this.playSound("jump");
    }

    const previousX = player.x;
    const previousY = player.y;

    player.x += player.vx * dt;
    this.resolveHorizontalCollisions(previousX);

    player.y += player.vy * dt;
    this.resolveVerticalCollisions(previousY);

    this.updateCoins();
    this.updateGoal();
    this.updateCamera(dt);
    this.updateHud();

    if (player.y > this.level.height + 180 || this.levelElapsed >= GAME_CONFIG.levelTimeLimit) {
      this.handlePlayerDeath();
    }
  }

  resolveHorizontalCollisions(previousX) {
    const player = this.player;

    for (const platform of this.level.platforms) {
      const bounds = {
        left: platform.x,
        right: platform.x + platform.width,
        top: platform.y,
        bottom: platform.y + platform.height,
      };

      if (!intersects(player.bounds, bounds)) continue;

      const previousRight = previousX + player.width;
      const previousLeft = previousX;

      if (player.vx > 0 && previousRight <= bounds.left) {
        player.x = platform.x - player.width;
      } else if (player.vx < 0 && previousLeft >= bounds.right) {
        player.x = platform.x + platform.width;
      }

      player.vx = 0;
    }

    const hazardBounds = this.level.hazards.map((hazard) => ({
      left: hazard.x,
      right: hazard.x + hazard.width,
      top: hazard.y - 24,
      bottom: hazard.y + hazard.height,
    }));

    for (const bounds of hazardBounds) {
      if (intersects(player.bounds, bounds)) {
        this.handlePlayerDeath();
        break;
      }
    }

    player.x = clamp(player.x, 0, this.level.width - player.width);
  }

  resolveVerticalCollisions(previousY) {
    const player = this.player;
    player.onGround = false;

    for (const platform of this.level.platforms) {
      const bounds = {
        left: platform.x,
        right: platform.x + platform.width,
        top: platform.y,
        bottom: platform.y + platform.height,
      };

      if (!intersects(player.bounds, bounds)) continue;

      const previousBottom = previousY + player.height;
      const previousTop = previousY;

      if (player.vy > 0 && previousBottom <= bounds.top + 8) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;
        player.lastGroundedAt = this.levelElapsed;
      } else if (player.vy < 0 && previousTop >= bounds.bottom - 8) {
        player.y = bounds.bottom;
        player.vy = 0;
      }
    }

    for (const hazard of this.level.hazards) {
      const bounds = {
        left: hazard.x,
        right: hazard.x + hazard.width,
        top: hazard.y - 20,
        bottom: hazard.y + hazard.height,
      };
      if (intersects(player.bounds, bounds)) {
        this.handlePlayerDeath();
        return;
      }
    }
  }

  updateCoins() {
    const player = this.player;
    for (const coin of this.level.coins) {
      coin.y = coin.baseY + Math.sin(this.totalElapsed * 3 + coin.phase) * 6;

      if (coin.collected) continue;

      const coinBounds = {
        left: coin.x - coin.radius,
        right: coin.x + coin.radius,
        top: coin.y - coin.radius,
        bottom: coin.y + coin.radius,
      };

      if (intersects(player.bounds, coinBounds)) {
        coin.collected = true;
        this.flashTimer = 0.15;
        this.playSound("coin");
      }
    }
  }

  updateGoal() {
    const collectedCoins = this.level.coins.filter((coin) => coin.collected).length;
    const allCoinsCollected = collectedCoins === this.level.coins.length;

    if (!allCoinsCollected) return;

    const goal = this.level.goal;
    const goalBounds = {
      left: goal.x,
      right: goal.x + goal.width,
      top: goal.y,
      bottom: goal.y + goal.height,
    };

    if (intersects(this.player.bounds, goalBounds)) {
      this.playSound("goal");
      const isLast = this.currentLevelIndex === LEVELS.length - 1;

      if (isLast) {
        this.state = GAME_STATES.VICTORY;
        this.playSound("win");
      } else {
        this.currentLevelIndex += 1;
        this.state = GAME_STATES.LEVEL_COMPLETE;
        setTimeout(() => {
          this.setupLevel(this.currentLevelIndex);
          this.state = GAME_STATES.PLAYING;
        }, 650);
      }
    }
  }

  handlePlayerDeath() {
    if (this.flashTimer > 0.2) return;
    this.flashTimer = 0.45;
    this.player.hitFlash = 1;
    this.playSound("hit");
    this.lives -= 1;

    if (this.lives <= 0) {
      this.state = GAME_STATES.GAME_OVER;
      return;
    }

    this.player.respawn(this.level.playerSpawn);
    this.levelElapsed = Math.max(0, this.levelElapsed - 5);
  }

  updateCamera(dt) {
    const targetX = clamp(
      this.player.x + this.player.width / 2 - GAME_CONFIG.width / 2,
      0,
      Math.max(0, this.level.width - GAME_CONFIG.width),
    );

    const targetY = clamp(
      this.player.y + this.player.height / 2 - GAME_CONFIG.height / 2 - 40,
      0,
      Math.max(0, this.level.height - GAME_CONFIG.height),
    );

    this.camera.x += (targetX - this.camera.x) * GAME_CONFIG.cameraLerp * (dt * 60);
    this.camera.y += (targetY - this.camera.y) * GAME_CONFIG.cameraLerp * (dt * 60);
  }

  updateHud() {
    const collected = this.level.coins.filter((coin) => coin.collected).length;
    this.hud.levelValue.textContent = `${this.level.id} / ${LEVELS.length}`;
    this.hud.coinsValue.textContent = `${collected} / ${this.level.coins.length}`;
    this.hud.livesValue.textContent = `${Math.max(this.lives, 0)}`;
    this.hud.timerValue.textContent = formatTime(this.levelElapsed);
  }

  renderBackground() {
    const { ctx, assets } = this;
    const bg = assets.background;
    const parallaxX = (this.camera.x * 0.18) % bg.width;
    const parallaxY = (this.camera.y * 0.12) % bg.height;

    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    for (let x = -parallaxX - bg.width; x < GAME_CONFIG.width + bg.width; x += bg.width) {
      for (let y = -parallaxY - bg.height; y < GAME_CONFIG.height + bg.height; y += bg.height) {
        ctx.globalAlpha = 0.92;
        ctx.drawImage(bg, x, y);
      }
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(100, 90, 78, 34, 0, 0, Math.PI * 2);
    ctx.ellipse(155, 86, 58, 28, 0, 0, Math.PI * 2);
    ctx.ellipse(780, 110, 88, 36, 0, 0, Math.PI * 2);
    ctx.ellipse(850, 120, 62, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  renderLevel() {
    const { ctx } = this;
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    for (const platform of this.level.platforms) {
      ctx.fillStyle = COLORS.platformSide;
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.fillStyle = COLORS.platformTop;
      ctx.fillRect(platform.x, platform.y, platform.width, Math.min(18, platform.height));
      ctx.fillStyle = COLORS.platformAccent;
      ctx.fillRect(platform.x, platform.y + 12, platform.width, 4);
    }

    for (const hazard of this.level.hazards) {
      const spikeCount = Math.max(2, Math.floor(hazard.width / 16));
      const spikeWidth = hazard.width / spikeCount;

      for (let index = 0; index < spikeCount; index += 1) {
        const spikeX = hazard.x + index * spikeWidth;
        ctx.beginPath();
        ctx.moveTo(spikeX, hazard.y + hazard.height);
        ctx.lineTo(spikeX + spikeWidth / 2, hazard.y - 18);
        ctx.lineTo(spikeX + spikeWidth, hazard.y + hazard.height);
        ctx.closePath();
        ctx.fillStyle = COLORS.hazard;
        ctx.fill();
        ctx.strokeStyle = COLORS.hazardDark;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    this.renderCoins();
    this.renderGoal();
    this.renderPlayer();
    ctx.restore();
  }

  renderCoins() {
    const { ctx, assets } = this;

    for (const coin of this.level.coins) {
      if (coin.collected) continue;

      const scale = 1 + Math.sin(this.totalElapsed * 5 + coin.phase) * 0.06;
      const size = coin.radius * 2 * scale;
      const rotation = Math.sin(this.totalElapsed * 5 + coin.phase) * 0.18;

      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.rotate(rotation);
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(250, 204, 21, 0.55)";
      ctx.drawImage(assets.coin, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  renderGoal() {
    const { ctx, assets } = this;
    const goal = this.level.goal;
    const collected = this.level.coins.filter((coin) => coin.collected).length;
    const unlocked = collected === this.level.coins.length;
    const pulse = 1 + Math.sin(this.totalElapsed * 4.5) * 0.04;
    const width = goal.width * pulse;
    const height = goal.height * pulse;

    if (unlocked) {
      ctx.save();
      ctx.shadowBlur = 26;
      ctx.shadowColor = COLORS.goalGlow;
      ctx.drawImage(
        assets.goal,
        goal.x - (width - goal.width) / 2,
        goal.y - (height - goal.height) / 2,
        width,
        height,
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.filter = "grayscale(1)";
      ctx.drawImage(assets.goal, goal.x, goal.y, goal.width, goal.height);
      ctx.restore();

      ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
      ctx.fillRect(goal.x + 16, goal.y + 42, goal.width - 32, 24);
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Собери все монеты", goal.x + goal.width / 2, goal.y + 59);
      ctx.textAlign = "left";
    }
  }

  renderPlayer() {
    const { ctx, assets } = this;
    const player = this.player;
    const spriteWidth = assets.player.width / 3;
    let frameIndex = 0;

    if (!player.onGround) {
      frameIndex = 2;
    } else if (Math.abs(player.vx) > 24) {
      frameIndex = Math.floor(player.animationTime * 10) % 2;
    }

    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

    if (player.direction < 0) {
      ctx.scale(-1, 1);
    }

    if (player.hitFlash > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(this.totalElapsed * 24) * 0.3;
    }

    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(37, 99, 235, 0.34)";
    ctx.drawImage(
      assets.player,
      frameIndex * spriteWidth,
      0,
      spriteWidth,
      assets.player.height,
      -player.width / 2,
      -player.height / 2,
      player.width,
      player.height,
    );

    ctx.restore();
  }

  renderOverlay() {
    const { ctx } = this;

    if (this.flashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.18, this.flashTimer * 0.45);
      ctx.fillStyle = "#fef2f2";
      ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
      ctx.restore();
    }

    const levelName = this.level.name;
    ctx.save();
    ctx.globalAlpha = this.messageAlpha;
    ctx.fillStyle = "rgba(15, 23, 42, 0.56)";
    ctx.fillRect(22, 18, 250, 54);
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 16px Inter, sans-serif";
    ctx.fillText(`Уровень ${this.level.id}: ${levelName}`, 40, 52);
    ctx.restore();

    if (this.state === GAME_STATES.READY) {
      this.drawCenteredPanel("Нажми Enter или кнопку Старт", "Собери все монеты и доберись до портала.");
    }

    if (this.state === GAME_STATES.PAUSED) {
      this.drawCenteredPanel("Пауза", "Нажми Enter или кнопку Старт, чтобы продолжить.");
    }

    if (this.state === GAME_STATES.GAME_OVER) {
      this.drawCenteredPanel("Игра окончена", "Нажми R или кнопку «С нуля», чтобы начать заново.");
    }

    if (this.state === GAME_STATES.VICTORY) {
      const summary = `Ты прошёл все ${LEVELS.length} уровня за ${this.totalElapsed.toFixed(1)} секунд.`;
      this.drawCenteredPanel("Победа!", summary);
    }

    if (this.state === GAME_STATES.LEVEL_COMPLETE) {
      this.drawCenteredPanel("Уровень пройден", "Следующий уровень уже загружается...");
    }
  }

  drawCenteredPanel(title, subtitle) {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    const panelWidth = 560;
    const panelHeight = 200;
    const x = (GAME_CONFIG.width - panelWidth) / 2;
    const y = (GAME_CONFIG.height - panelHeight) / 2;

    ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, panelWidth, panelHeight, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = "700 34px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, GAME_CONFIG.width / 2, y + 78);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 18px Inter, sans-serif";
    wrapText(ctx, subtitle, GAME_CONFIG.width / 2, y + 124, 420, 26);

    ctx.textAlign = "left";
    ctx.restore();
  }

  render() {
    this.renderBackground();
    this.renderLevel();
    this.renderOverlay();
  }

  frame = (timestamp) => {
    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }
    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.update(delta);
    this.render();
    this.input.endFrame();
    requestAnimationFrame(this.frame);
  };
}

function wrapText(ctx, text, centerX, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let y = startY;

  for (const word of words) {
    const testLine = `${line}${word} `;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && line) {
      ctx.fillText(line.trim(), centerX, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line.trim(), centerX, y);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
