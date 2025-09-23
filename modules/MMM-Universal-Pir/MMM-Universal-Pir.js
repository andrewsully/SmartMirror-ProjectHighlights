// MagicMirror² Module MMM-Universal-Pir

Module.register("MMM-Universal-Pir", {
  // Default module config
  defaults: {
    gpioCommand: "gpiomon -r -b gpiochip0 23",
    onCommand: "wlr-randr --output HDMI-A-1 --on",
    offCommand: "wlr-randr --output HDMI-A-1 --off",
    title: "Monitor turns off in",
    deactivateDelay: 15 * 60 * 1000, // 15 minutes
    updateInterval: 1000, // 1 second
    animationSpeed: 1000, // 1 second
    showCountDown: true,
    detectionSymbol: "fas fa-person-rays bright",
    // alternative Symbols: "fas fa-users-rays", "fas fa-arrows-to-eye", "fas fa-users-viewfinder", "fas fa-location-crosshairs", "fas fa-crosshairs"
    hoursLabel: "h",
    minutesLabel: "m",
    secondsLabel: "s",
  },

  gpioError: false,

  // Define required styles
  getStyles() {
    return ["font-awesome.css"];
  },

  getTemplate() {
    return `${this.name}.njk`;
  },

  getTemplateData() {
    let formData = {};
    if (!this.loaded) {
      formData.errStr = this.translate("LOADING");
    } else if (this.gpioError) {
      formData.errStr = "gpioCommand exited with error!";
    } else {
      formData.detected = this.detected;
      if (this.diffHours > 0) {
        formData.timeh = this.diffHours;
      }
      if (this.diffMinutes > 0) {
        formData.timem = this.diffMinutes;
      }
      formData.times = this.diffSeconds;
    }
    if (formData.errStr) {
      this.sendSocketNotification("ERROR");
    } else {
      this.sendSocketNotification("NOERROR");
    }
    return {
      formData: formData,
      config: this.config,
    };
  },

  // Define start sequence
  start() {
    Log.info(`Starting module: ${this.name}`);

    this.resetCountdown();

    this.loaded = false;
    this.detected = false;
    this.sendSocketNotification("CONFIG", this.config);
  },

  // PIR sensor data reception with node_helper
  socketNotificationReceived(notification, payload) {
    if (notification === "STARTED") {
      this.loaded = true;
      this.updateDom(this.config.animationSpeed);
      Log.info(`${this.name}: PIR sensor start confirmed`);
    } else if (notification === "USER_PRESENCE") {
      this.setIconTimeout();
      this.resetCountdown();
    } else if (notification === "POWER_ON") {
      Log.info(`${this.name}: Turn on the monitor`);
    } else if (notification === "POWER_OFF") {
      Log.info(`${this.name}: Turn off the monitor`);
    } else if (notification === "GPIO_ERROR") {
      this.gpioError = true;
    }
  },

  // Set icon timeout
  setIconTimeout() {
    this.detected = true;
    this.updateDom();
    clearTimeout(this.iconTimeout);

    var self = this;
    self.iconTimeout = setTimeout(() => {
      self.detected = false;
      self.updateDom();
    }, self.config.animationSpeed);
  },

  // Reset the countdown
  resetCountdown() {
    this.remainingTime = this.config.deactivateDelay;
    this.updateCountdown();

    clearInterval(this.countdownInterval);
    if (!this.gpioError) {
      var self = this;
      self.countdownInterval = setInterval(() => {
        self.remainingTime -= self.config.updateInterval;
        self.updateCountdown();
        if (self.remainingTime <= 0) {
          clearInterval(self.countdownInterval);
        }
      }, self.config.updateInterval);
    }
  },

  // Update variables for countdown display
  updateCountdown() {
    this.diffHours = Math.floor(
      (this.remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    this.diffMinutes = Math.floor(
      (this.remainingTime % (1000 * 60 * 60)) / (1000 * 60)
    );
    this.diffSeconds = Math.floor((this.remainingTime % (1000 * 60)) / 1000);

    this.updateDom();
  },
});
