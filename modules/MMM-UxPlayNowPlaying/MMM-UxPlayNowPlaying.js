Module.register("MMM-UxPlayNowPlaying", {
  defaults: {
    metadataFile: "/home/pi/metadata.txt",
    coverartFile: "/home/pi/coverart.jpg", 
    checkInterval: 2000, // Check file every 2 seconds
    animationSpeed: 500,
    // Transition Configuration
    enableTransitions: true,
    trackChangeTransition: "fadeSlide", // "fade", "slide", "fadeSlide", "scale", "none"
    trackChangeSpeed: 600, // milliseconds
    albumArtTransition: "fadeScale", // "fade", "scale", "fadeScale", "none"  
    albumArtSpeed: 400, // milliseconds
    moduleEnterTransition: "slideUp", // "fade", "slideUp", "slideDown", "scale", "none"
    moduleEnterSpeed: 800, // milliseconds
    textAnimations: true, // Enable subtle text animations
  },

  start() {
    Log.info("MMM-UxPlayNowPlaying", "Starting UxPlay Now Playing module...");
    this.currentTrack = null;
    
    // Start monitoring files
    this.startFileMonitoring();
  },

  startFileMonitoring() {
    this.sendSocketNotification("START_MONITORING", {
      metadataFile: this.config.metadataFile,
      checkInterval: this.config.checkInterval
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "TRACK_UPDATED") {
      this.handleTrackUpdate(payload);
    }
  },

  handleTrackUpdate(trackData) {
    if (trackData === null) {
      // Clear display - music stopped
      Log.info("MMM-UxPlayNowPlaying", "🛑 Clearing display - music stopped");
      this.currentTrack = null;
      this.updateDom(this.config.animationSpeed);
      return;
    }
    
    Log.info("MMM-UxPlayNowPlaying", `📺 Updating display: ${trackData.artist} - ${trackData.title}`);
    
    const isTrackChange = !this.currentTrack || 
      this.currentTrack.title !== trackData.title || 
      this.currentTrack.artist !== trackData.artist;
    
    this.currentTrack = trackData;
    
    if (this.config.enableTransitions && isTrackChange) {
      this.animateTrackChange();
    } else {
      this.updateDom(this.config.animationSpeed);
    }
  },

  getDom() {
    Log.info("MMM-UxPlayNowPlaying", `🎨 Building DOM - Track: ${this.currentTrack ? 'YES' : 'NO'}`);
    
    const wrapper = document.createElement("div");
    wrapper.className = "MMM-UxPlayNowPlaying";
    
    // Apply CSS classes based on configuration
    if (this.config.enableTransitions) {
      wrapper.classList.add("custom-transitions");
    }
    if (this.config.textAnimations) {
      wrapper.classList.add("text-animations");
    }

    if (!this.currentTrack) {
      wrapper.innerHTML = '<div class="loading">Loading music...</div>';
      Log.info("MMM-UxPlayNowPlaying", "🎨 Showing loading state");
      return wrapper;
    }

    Log.info("MMM-UxPlayNowPlaying", `🎨 Showing track: ${this.currentTrack.title}`);

    // Create the layout matching MMM-Lastfm structure
    const container = document.createElement("div");
    container.className = "standard";

    // Album art - use base64 data if available, otherwise default covers will be provided
    const albumArt = document.createElement("img");
    if (this.currentTrack.coverArtBase64) {
      albumArt.src = this.currentTrack.coverArtBase64;
      Log.info("MMM-UxPlayNowPlaying", "✅ Using album art (original or default)");
    } else {
      // Fallback SVG placeholder (should rarely be used now with default covers)
      albumArt.src = "data:image/svg+xml;base64," + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#333"/><text x="100" y="100" text-anchor="middle" fill="white" font-size="16">Loading...</text></svg>');
      Log.info("MMM-UxPlayNowPlaying", "⏳ Loading album art...");
    }
    albumArt.alt = "Album Art";
    albumArt.className = "album-art";
    albumArt.onerror = () => {
      Log.error("MMM-UxPlayNowPlaying", "❌ Failed to load album art");
    };
    albumArt.onload = () => {
      Log.info("MMM-UxPlayNowPlaying", "✅ Album art loaded successfully");
      this.applyAlbumArtAnimation(albumArt);
    };

    // Track info table
    const table = document.createElement("table");
    
    // Title row
    const titleRow = document.createElement("tr");
    const titleCell = document.createElement("td");
    titleCell.className = "title bright";
    titleCell.textContent = this.currentTrack.title || "Unknown Title";
    titleRow.appendChild(titleCell);
    table.appendChild(titleRow);

    // Artist row  
    const artistRow = document.createElement("tr");
    const artistCell = document.createElement("td");
    artistCell.className = "title";
    artistCell.textContent = this.currentTrack.artist || "Unknown Artist";
    artistRow.appendChild(artistCell);
    table.appendChild(artistRow);

    // Album row
    if (this.currentTrack.album) {
      const albumRow = document.createElement("tr");
      const albumCell = document.createElement("td");
      albumCell.className = "title";
      albumCell.textContent = this.currentTrack.album;
      albumRow.appendChild(albumCell);
      table.appendChild(albumRow);
    }

    container.appendChild(albumArt);
    container.appendChild(table);
    wrapper.appendChild(container);

    // Apply module enter animation after DOM is ready
    setTimeout(() => this.applyModuleEnterAnimation(), 100);

    return wrapper;
  },

  animateTrackChange() {
    const wrapper = document.querySelector(".MMM-UxPlayNowPlaying");
    if (!wrapper) {
      this.updateDom(this.config.animationSpeed);
      return;
    }

    const transition = this.config.trackChangeTransition;
    const speed = this.config.trackChangeSpeed;

    Log.info("MMM-UxPlayNowPlaying", `🎬 Animating track change: ${transition}`);

    switch (transition) {
      case "fade":
        this.fadeTransition(wrapper, speed);
        break;
      case "slide":
        this.slideTransition(wrapper, speed);
        break;
      case "fadeSlide":
        this.fadeSlideTransition(wrapper, speed);
        break;
      case "scale":
        this.scaleTransition(wrapper, speed);
        break;
      default:
        this.updateDom(this.config.animationSpeed);
    }
  },

  fadeTransition(wrapper, speed) {
    wrapper.style.opacity = "0";
    wrapper.style.transition = `opacity ${speed}ms ease-in-out`;
    
    setTimeout(() => {
      this.updateDom(0); // Update DOM immediately
      wrapper.style.opacity = "1";
    }, speed / 2);
  },

  slideTransition(wrapper, speed) {
    wrapper.style.transform = "translateX(-20px)";
    wrapper.style.opacity = "0.7";
    wrapper.style.transition = `transform ${speed}ms ease-in-out, opacity ${speed}ms ease-in-out`;
    
    setTimeout(() => {
      this.updateDom(0);
      wrapper.style.transform = "translateX(0)";
      wrapper.style.opacity = "1";
    }, speed / 2);
  },

  fadeSlideTransition(wrapper, speed) {
    wrapper.style.transform = "translateY(10px)";
    wrapper.style.opacity = "0";
    wrapper.style.transition = `transform ${speed}ms ease-out, opacity ${speed}ms ease-out`;
    
    setTimeout(() => {
      this.updateDom(0);
      wrapper.style.transform = "translateY(0)";
      wrapper.style.opacity = "1";
    }, speed / 2);
  },

  scaleTransition(wrapper, speed) {
    wrapper.style.transform = "scale(0.95)";
    wrapper.style.opacity = "0.8";
    wrapper.style.transition = `transform ${speed}ms ease-in-out, opacity ${speed}ms ease-in-out`;
    
    setTimeout(() => {
      this.updateDom(0);
      wrapper.style.transform = "scale(1)";
      wrapper.style.opacity = "1";
    }, speed / 2);
  },

  applyAlbumArtAnimation(albumArt) {
    if (!this.config.enableTransitions) return;

    const transition = this.config.albumArtTransition;
    const speed = this.config.albumArtSpeed;

    switch (transition) {
      case "fade":
        albumArt.style.opacity = "0";
        albumArt.style.transition = `opacity ${speed}ms ease-in-out`;
        setTimeout(() => {
          albumArt.style.opacity = "1";
        }, 50);
        break;
      case "scale":
        albumArt.style.transform = "scale(0.8)";
        albumArt.style.transition = `transform ${speed}ms ease-out`;
        setTimeout(() => {
          albumArt.style.transform = "scale(1)";
        }, 50);
        break;
      case "fadeScale":
        albumArt.style.opacity = "0";
        albumArt.style.transform = "scale(0.9)";
        albumArt.style.transition = `opacity ${speed}ms ease-out, transform ${speed}ms ease-out`;
        setTimeout(() => {
          albumArt.style.opacity = "1";
          albumArt.style.transform = "scale(1)";
        }, 50);
        break;
    }
  },

  applyModuleEnterAnimation() {
    if (!this.config.enableTransitions) return;

    const wrapper = document.querySelector(".MMM-UxPlayNowPlaying");
    if (!wrapper) return;

    const transition = this.config.moduleEnterTransition;
    const speed = this.config.moduleEnterSpeed;

    switch (transition) {
      case "slideUp":
        wrapper.style.transform = "translateY(20px)";
        wrapper.style.opacity = "0";
        wrapper.style.transition = `transform ${speed}ms ease-out, opacity ${speed}ms ease-out`;
        setTimeout(() => {
          wrapper.style.transform = "translateY(0)";
          wrapper.style.opacity = "1";
        }, 50);
        break;
      case "slideDown":
        wrapper.style.transform = "translateY(-20px)";
        wrapper.style.opacity = "0";
        wrapper.style.transition = `transform ${speed}ms ease-out, opacity ${speed}ms ease-out`;
        setTimeout(() => {
          wrapper.style.transform = "translateY(0)";
          wrapper.style.opacity = "1";
        }, 50);
        break;
      case "scale":
        wrapper.style.transform = "scale(0.8)";
        wrapper.style.opacity = "0";
        wrapper.style.transition = `transform ${speed}ms ease-out, opacity ${speed}ms ease-out`;
        setTimeout(() => {
          wrapper.style.transform = "scale(1)";
          wrapper.style.opacity = "1";
        }, 50);
        break;
      case "fade":
        wrapper.style.opacity = "0";
        wrapper.style.transition = `opacity ${speed}ms ease-out`;
        setTimeout(() => {
          wrapper.style.opacity = "1";
        }, 50);
        break;
    }
  },

  getStyles() {
    return ["MMM-UxPlayNowPlaying.css"];
  }
});
