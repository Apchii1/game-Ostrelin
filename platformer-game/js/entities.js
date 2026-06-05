import { GAME_CONFIG } from "./config.js";

export class Player {
  constructor(spawn) {
    this.width = GAME_CONFIG.playerWidth;
    this.height = GAME_CONFIG.playerHeight;
    this.respawn(spawn);
  }

  respawn(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.lastGroundedAt = 0;
    this.jumpBufferedAt = -999;
    this.direction = 1;
    this.animationTime = 0;
    this.hitFlash = 0;
  }

  get bounds() {
    return {
      left: this.x,
      top: this.y,
      right: this.x + this.width,
      bottom: this.y + this.height,
    };
  }
}

export class Coin {
  constructor(definition) {
    this.x = definition.x;
    this.y = definition.y;
    this.baseY = definition.y;
    this.radius = GAME_CONFIG.coinRadius;
    this.collected = false;
    this.phase = (definition.x + definition.y) * 0.013;
  }
}

export class Goal {
  constructor(definition) {
    Object.assign(this, definition);
  }
}

export class Hazard {
  constructor(definition) {
    Object.assign(this, definition);
  }
}
