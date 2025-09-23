Module.register("MMM-Lastfm-Scenes", {
  defaults: {
    musicSceneName: "music_page",
    returnSceneName: "homepage_page",
    stopDelay: 1000,
    retryDelay: 10000,
  },

  start() {
    // Log.info("MMM-Lastfm-Scenes", "Starting module...");
    this.isPlaying = false;
    this.stopTimer = null;
    this.delay(1000).then(() => this.initObserver());
  },

  initObserver() {
    const lastfmContent = document.querySelector(".MMM-Lastfm");
    if (!lastfmContent) {
      // Log.warn("MMM-Lastfm-Scenes", `MMM-Lastfm not in DOM yet — retrying in ${this.config.retryDelay}ms`);
      return this.delay(this.config.retryDelay).then(() => this.initObserver());
    }

    // Log.info("MMM-Lastfm-Scenes", "✓ Found MMM-Lastfm DOM, attaching observer");
    this.observer = new MutationObserver(() => this.checkPlayback());
    this.observer.observe(lastfmContent, { childList: true, subtree: true });
  },

  checkPlayback() {
    const img = document.querySelector(".MMM-Lastfm img");
    const hasAlbumArt = !!img;

    if (hasAlbumArt && !this.isPlaying) {
      // Log.info("MMM-Lastfm-Scenes", "Playback started — switching to music scene");
      clearTimeout(this.stopTimer);
      this.isPlaying = true;
      this.onPlay();
    } else if (!hasAlbumArt && this.isPlaying) {
      // Log.info("MMM-Lastfm-Scenes", "Playback stopped — triggering delayed return");
      clearTimeout(this.stopTimer);
      this.stopTimer = setTimeout(() => {
        this.isPlaying = false;
        this.onStop();
      }, this.config.stopDelay);
    }
  },

  onPlay() {
    this.sendNotification("SCENES_PLAY", {
      scene: this.config.musicSceneName,
      callback: () => {}
    });
  },

  onStop() {
    // Log.info("MMM-Lastfm-Scenes", `↩ Music stopped — switching back to '${this.config.returnSceneName}'`);
    this.sendNotification("SCENES_PLAY", {
      scene: this.config.returnSceneName,
      callback: () => {}
    });
  },

  delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
});
