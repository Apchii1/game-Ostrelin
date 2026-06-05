export const GAME_CONFIG = {
  width: 960,
  height: 540,
  gravity: 1850,
  playerSpeed: 310,
  jumpVelocity: 720,
  terminalVelocity: 1180,
  coyoteTime: 0.12,
  jumpBufferTime: 0.14,
  frictionGround: 0.82,
  frictionAir: 0.96,
  cameraLerp: 0.12,
  tileSize: 48,
  coinRadius: 16,
  playerWidth: 34,
  playerHeight: 46,
  levelTimeLimit: 120,
  startLives: 3,
};

export const COLORS = {
  platformTop: "#334155",
  platformSide: "#1e293b",
  platformAccent: "#64748b",
  hazard: "#ef4444",
  hazardDark: "#7f1d1d",
  overlay: "rgba(2, 6, 23, 0.56)",
  text: "#f8fafc",
  shadow: "rgba(15, 23, 42, 0.25)",
  goalGlow: "rgba(250, 204, 21, 0.4)",
};

export const GAME_STATES = {
  READY: "ready",
  PLAYING: "playing",
  PAUSED: "paused",
  LEVEL_COMPLETE: "levelComplete",
  GAME_OVER: "gameOver",
  VICTORY: "victory",
};
