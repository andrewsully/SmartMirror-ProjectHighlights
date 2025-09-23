const NodeHelper = require("node_helper");
const fs = require("fs");

module.exports = NodeHelper.create({
  start() {
    console.log("MMM-UxPlayScenes node_helper started");
    this.monitoring = false;
    this.lastModified = 0;
    this.checkTimer = null;
    this.hasTrack = false;
    this.startupTime = Date.now(); // Track when we started
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "START_MONITORING") {
      this.startMonitoring(payload);
    }
  },

  startMonitoring(config) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.metadataFile = config.metadataFile;
    this.checkInterval = config.checkInterval;
    this.slowCheckInterval = config.checkInterval * 3; // 3x slower when music playing
    this.currentInterval = this.checkInterval;
    this.config = config; // Store full config for access to stopDelay
    
    console.log(`📁 MMM-UxPlayScenes monitoring: ${this.metadataFile}`);
    console.log(`⚡ Fast polling: ${this.checkInterval}ms, 🐌 Slow polling: ${this.slowCheckInterval}ms`);
    
    // Initial check
    this.checkFile();
    
    // Set up periodic checking with adaptive intervals
    this.checkTimer = setInterval(() => {
      this.checkFile();
    }, this.currentInterval);
  },

  // Adaptive polling - slower when music is actively playing
  adjustPollingRate() {
    const newInterval = this.hasTrack ? this.slowCheckInterval : this.checkInterval;
    
    if (newInterval !== this.currentInterval) {
      console.log(`🔄 Switching polling: ${this.currentInterval}ms → ${newInterval}ms (${this.hasTrack ? 'SLOW' : 'FAST'})`);
      this.currentInterval = newInterval;
      
      // Restart timer with new interval
      clearInterval(this.checkTimer);
      this.checkTimer = setInterval(() => {
        this.checkFile();
      }, this.currentInterval);
    }
  },

  checkFile() {
    try {
      // Check if metadata file exists and get its modification time
      const stats = fs.statSync(this.metadataFile);
      const modified = stats.mtime.getTime();
      
      // Read file content to check if it has actual music data (not "no data")
      const content = fs.readFileSync(this.metadataFile, 'utf8').trim();
      const hasValidContent = content.length > 0 && content.includes('Title:') && !content.includes('no data');
      
      // If file was modified since last check AND after our startup, check if music is playing
      if (modified > this.lastModified && modified > this.startupTime) {
        this.lastModified = modified;
        
        if (!this.hasTrack && hasValidContent) {
          console.log("🎵 MMM-UxPlayScenes: Fresh music metadata detected - music playing");
          this.hasTrack = true;
          this.adjustPollingRate(); // Switch to slower polling
          this.sendSocketNotification("MUSIC_PLAYING");
        } else if (this.hasTrack && !hasValidContent) {
          // File updated but now contains "no data" - UxPlay preparing to stop
          console.log("🛑 MMM-UxPlayScenes: Metadata cleared - music stopping");
          this.hasTrack = false;
          this.adjustPollingRate();
          this.sendSocketNotification("MUSIC_STOPPED");
        }
      } else if (modified > this.lastModified) {
        // File is newer than last check but older than startup - ignore stale file
        console.log("🚫 MMM-UxPlayScenes: Ignoring stale metadata file from before startup");
        this.lastModified = modified;
      }
      // No timeout logic - rely only on file changes and deletions
    } catch (error) {
      // File doesn't exist - UxPlay cleanly stopped music (normal shutdown)
      if (this.hasTrack) {
        console.log("✅ MMM-UxPlayScenes: Metadata file deleted - music stopped cleanly");
        this.hasTrack = false;
        this.adjustPollingRate(); // Switch back to fast polling
        this.sendSocketNotification("MUSIC_STOPPED");
      }
    }
  },

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    this.monitoring = false;
  }
});
