const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start() {
    console.log("MMM-UxPlayNowPlaying node_helper started");
    this.monitoring = false;
    this.lastModified = 0;
    this.checkTimer = null;
    this.currentTrack = null;
    this.communicationCounter = 0;
    this.lastCommunicationTime = 0;
    this.expectedCommunicationInterval = 120000; // Only expect new communication when song changes (~2 minutes)
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
    
    console.log(`📁 Starting file monitoring: ${this.metadataFile}`);
    
    // Initial check
    this.checkFiles();
    
    // Set up periodic checking
    this.checkTimer = setInterval(() => {
      this.checkFiles();
    }, this.checkInterval);
  },

  checkFiles() {
    try {
      // Check if metadata file exists and get its modification time
      const stats = fs.statSync(this.metadataFile);
      const modified = stats.mtime.getTime();
      
      // If file was modified since last check, update display
      if (modified > this.lastModified) {
        this.lastModified = modified;
        console.log(`📡 UxPlay communication received - updating display`);
        this.parseMetadata();
      }
      // Don't clear based on time - let scene controller handle music stopping
    } catch (error) {
      // File doesn't exist - clear display immediately (UxPlay stopped cleanly)
      if (this.currentTrack) {
        console.log("❌ Display: Metadata file missing - clearing display");
        this.currentTrack = null;
        this.sendSocketNotification("TRACK_UPDATED", null);
      }
    }
  },

  parseMetadata() {
    try {
      const content = fs.readFileSync(this.metadataFile, 'utf8');
      const lines = content.trim().split('\n');
      
      const trackData = {};
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(': ');
        const value = valueParts.join(': ').trim();
        
        switch(key) {
          case 'Album':
            trackData.album = value;
            break;
          case 'Artist':
            trackData.artist = value;
            break;
          case 'Title':
            trackData.title = value;
            break;
        }
      });
      
      // Only proceed if we have at least title or artist
      if (trackData.title || trackData.artist) {
        const trackChanged = !this.currentTrack || 
          this.currentTrack.title !== trackData.title ||
          this.currentTrack.artist !== trackData.artist ||
          this.currentTrack.album !== trackData.album;
        
        this.currentTrack = trackData;
        
        if (trackChanged) {
          console.log(`🎵 New track: ${trackData.artist} - ${trackData.title}`);
        }
        
        // Read and encode the cover art image
        this.readCoverArt((coverArtData) => {
          trackData.coverArtBase64 = coverArtData;
          // Always send track update for display (keeps it current)
          this.sendSocketNotification("TRACK_UPDATED", trackData);
        });
      }
      
    } catch (error) {
      console.error("Error parsing metadata:", error);
    }
  },

  readCoverArt(callback) {
    try {
      const coverArtPath = "/home/pi/coverart.jpg";
      fs.readFile(coverArtPath, (err, data) => {
        if (err) {
          console.error("Error reading cover art:", err);
          // Try default album covers instead
          this.getDefaultAlbumCover(callback);
          return;
        }
        
        // Convert to base64 data URL
        const base64 = data.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        callback(dataUrl);
      });
    } catch (error) {
      console.error("Error in readCoverArt:", error);
      // Try default album covers instead
      this.getDefaultAlbumCover(callback);
    }
  },

  getDefaultAlbumCover(callback) {
    try {
      // Randomly select one of the default covers
      const defaultCovers = ['default_1.jpg', 'default_2.jpg'];
      const randomCover = defaultCovers[Math.floor(Math.random() * defaultCovers.length)];
      const defaultCoverPath = path.join(__dirname, 'default_album_covers', randomCover);
      
      fs.readFile(defaultCoverPath, (err, data) => {
        if (err) {
          console.error("Error reading default album cover:", err);
          callback(null);
          return;
        }
        
        console.log(`🎵 Using default album cover: ${randomCover}`);
        // Convert to base64 data URL
        const base64 = data.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        callback(dataUrl);
      });
    } catch (error) {
      console.error("Error in getDefaultAlbumCover:", error);
      callback(null);
    }
  },

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    this.monitoring = false;
  }
});
