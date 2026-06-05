const ACTION_MAP = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyW: "jump",
  ArrowUp: "jump",
  Space: "jump",
  Enter: "start",
  KeyR: "restart",
  KeyM: "mute",
};

export class InputManager {
  constructor() {
    this.actions = new Map();
    this.justPressed = new Set();

    window.addEventListener("keydown", (event) => {
      const action = ACTION_MAP[event.code];
      if (!action) return;

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "Enter"].includes(event.code)) {
        event.preventDefault();
      }

      if (!this.actions.get(action)) {
        this.justPressed.add(action);
      }

      this.actions.set(action, true);
    });

    window.addEventListener("keyup", (event) => {
      const action = ACTION_MAP[event.code];
      if (!action) return;
      this.actions.set(action, false);
    });

    window.addEventListener("blur", () => {
      this.actions.clear();
      this.justPressed.clear();
    });
  }

  isDown(action) {
    return Boolean(this.actions.get(action));
  }

  consume(action) {
    const exists = this.justPressed.has(action);
    this.justPressed.delete(action);
    return exists;
  }

  endFrame() {
    this.justPressed.clear();
  }
}
