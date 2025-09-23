// MagicMirror² Module MMM-Universal-Pir

const NodeHelper = require("node_helper");
const spawn = require("child_process").spawn;
const exec = require("child_process").exec;

module.exports = NodeHelper.create({
  start() {
    this.started = false;
    this.activated = true;
    this.errored = false;
  },

  getDataPIR() {
    const prc = spawn("sh", [
      "-c",
      this.config.gpioCommand,
    ]);

    this.sendSocketNotification("STARTED", true);
    this.started = true;

    prc.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    prc.on("close", (code) => {
      this.sendSocketNotification("GPIO_ERROR", true);
      console.error(`child process exited with code ${code}`);
    });

    prc.stdout.on("data", (data) => {
      this.sendSocketNotification("USER_PRESENCE", true);
      this.resetTimeout();
      if (this.activated == false) {
        this.activateMonitor();
      }
    });
  },

  activateMonitor() {
    if (this.errored) return;
    this.sendSocketNotification("POWER_ON", true);
    this.activated = true;

    exec(this.config.onCommand, null);
  },

  deactivateMonitor() {
    if (this.errored) return;
    this.sendSocketNotification("POWER_OFF", true);
    this.activated = false;

    exec(this.config.offCommand, null);
  },

  resetTimeout() {
    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.deactivateMonitor();
    }, this.config.deactivateDelay);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CONFIG" && this.started == false) {
      this.config = payload;
      this.activateMonitor();

      this.getDataPIR();
      this.resetTimeout();
    } else if (notification === "ERROR") {
      this.errored = true;
    } else if (notification === "NOERROR") {
      this.errored = false;
    }
  },
});
