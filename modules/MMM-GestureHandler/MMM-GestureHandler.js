/* Magic Mirror
 * Module: MMM-GestureHandler
 * 
 * Handles FORWARD_BACKWARD_GESTURE on compliments page
 * MIT Licensed
 */

Module.register("MMM-GestureHandler", {

	// Default module config.
    defaults: {
        waveTimeout: 20000, // 20 seconds
        debug: true
    },

    // Module properties
    isWaveMode: false,
    waveTimer: null,

	// Called when all modules are loaded and the system is ready to boot up
	start: function() {
        Log.info("Starting module: " + this.name);
	},

    // Handle notifications
    notificationReceived: function(notification, payload, sender) {
        if (notification === "FORWARD_BACKWARD_GESTURE") {
            Log.info("FORWARD_BACKWARD_GESTURE detected!");
            this.handleForwardBackwardGesture();
        }
    },

    // Handle forward-backward gesture
    handleForwardBackwardGesture: function() {
        // Only activate on compliments page
        // if (!document.body.classList.contains('compliments_page')) {
        //     Log.info("Gesture ignored - not on compliments page");
        //     return;
        // }

        // if (this.isWaveMode) {
        //     Log.info("Wave mode already active, ignoring gesture");
        //     return;
        // }

        Log.info("Activating wave mode on compliments page");
        this.isWaveMode = true;

        // Hide original GIF and compliments text
        const originalGif = document.querySelector('.compliments_page .eyecandygif');
        const compliments = document.querySelector('.compliments_page .module.compliments');
        
        if (originalGif) {
            originalGif.style.display = 'none';
            Log.info("Original GIF hidden");
        }
        
        if (compliments) {
            compliments.style.display = 'none';
            Log.info("Compliments text hidden");
        }

        // Show wave GIF
        const waveGif = document.querySelector('.wave_gif');
        if (waveGif) {
            waveGif.style.display = 'block';
            waveGif.style.visibility = 'visible';
            waveGif.style.opacity = '1';
            Log.info("Wave GIF shown");
        } else {
            Log.error("Wave GIF element not found");
        }

        // Set timer to revert
        this.waveTimer = setTimeout(() => {
            this.revertWaveMode();
        }, this.config.waveTimeout);

        // Update display
        this.updateDom();
    },

    // Revert wave mode
    revertWaveMode: function() {
        Log.info("Reverting wave mode");
        this.isWaveMode = false;

        // Show original GIF and compliments text
        const originalGif = document.querySelector('.compliments_page .eyecandygif');
        const compliments = document.querySelector('.compliments_page .module.compliments');
        
        if (originalGif) {
            originalGif.style.display = 'block';
            Log.info("Original GIF shown");
        }
        
        if (compliments) {
            compliments.style.display = 'block';
            Log.info("Compliments text shown");
        }

        // Hide wave GIF
        const waveGif = document.querySelector('.wave_gif');
        if (waveGif) {
            waveGif.style.display = 'none';
            waveGif.style.visibility = 'hidden';
            waveGif.style.opacity = '0';
            Log.info("Wave GIF hidden");
        }

        // Clear timer
        if (this.waveTimer) {
            clearTimeout(this.waveTimer);
            this.waveTimer = null;
        }

        // Update display
        this.updateDom();
    },

    // Override dom generator.
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "gesture-handler-status";
        
        if (this.isWaveMode) {
            wrapper.innerHTML = "🎭 Wave Mode Active";
            wrapper.style.color = "#4CAF50";
            wrapper.style.fontWeight = "bold";
        } else {
            wrapper.innerHTML = "";
        }
        
        return wrapper;
    }
});
