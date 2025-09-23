Module.register("MMM-UxPlayScenes", {
  defaults: {
    musicSceneName: "music_page_paused",
    returnSceneName: "homepage_page", 
    stopDelay: 30000, // 30 seconds - only after file is truly gone
    metadataFile: "/home/pi/metadata.txt",
    checkInterval: 2000,
  },

  start() {
    Log.info("MMM-UxPlayScenes", "Starting UxPlay scene controller...");
    this.isPlaying = false;
    this.stopTimer = null;
    this.lastFileCheck = 0;
    
    // Wait 30 seconds after startup to avoid false detection from stale files
    Log.info("MMM-UxPlayScenes", "⏳ Waiting 30s for system to stabilize...");
    setTimeout(() => {
      Log.info("MMM-UxPlayScenes", "✅ System stable - starting music monitoring");
      this.sendSocketNotification("START_MONITORING", {
        metadataFile: this.config.metadataFile,
        checkInterval: this.config.checkInterval,
        stopDelay: this.config.stopDelay
      });
    }, 30000);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "MUSIC_PLAYING") {
      this.handleMusicPlaying();
    } else if (notification === "MUSIC_STOPPED") {
      this.handleMusicStopped();
    } else if (notification === "FILE_MISSING") {
      this.handleFileMissing();
    }
  },

  handleMusicPlaying() {
    // Clear any pending stop timer - music is actively playing
    clearTimeout(this.stopTimer);
    this.stopTimer = null;
    
    if (!this.isPlaying) {
      Log.info("MMM-UxPlayScenes", "🎵 Music detected - switching to music scene");
      this.isPlaying = true;
      this.onPlay();
    }
    
    // Reset the file check timer
    this.lastFileCheck = Date.now();
  },

  handleMusicStopped() {
    // Only start the return timer if we don't already have one running
    if (this.isPlaying && !this.stopTimer) {
      Log.info("MMM-UxPlayScenes", "⏸️ Music file stale - starting return timer");
      this.stopTimer = setTimeout(() => {
        this.isPlaying = false;
        this.stopTimer = null;
        this.onStop();
      }, this.config.stopDelay);
    }
  },

  handleFileMissing() {
    // File completely missing - more aggressive timeout
    if (this.isPlaying && !this.stopTimer) {
      Log.info("MMM-UxPlayScenes", "❌ Music file missing - starting shorter return timer");
      this.stopTimer = setTimeout(() => {
        this.isPlaying = false;
        this.stopTimer = null;
        this.onStop();
      }, 10000); // 10 seconds if file is completely gone
    }
  },

  onPlay() {
    this.sendNotification("SCENES_PLAY", {
      scene: this.config.musicSceneName,
      callback: (result) => {
        Log.info("MMM-UxPlayScenes", `✓ Switched to ${this.config.musicSceneName}`);
      }
    });
  },

  onStop() {
    Log.info("MMM-UxPlayScenes", `↩️ Returning to ${this.config.returnSceneName}`);
    this.sendNotification("SCENES_PLAY", {
      scene: this.config.returnSceneName,
      callback: (result) => {
        Log.info("MMM-UxPlayScenes", `✓ Returned to ${this.config.returnSceneName}`);
      }
    });
  },

  // No DOM needed - this is a controller module
  getDom() {
    return document.createElement("div");
  }
});
