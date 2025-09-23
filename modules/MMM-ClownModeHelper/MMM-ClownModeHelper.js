/* MagicMirror²
 * Module: MMM-ClownModeHelper
 * 
 * Helper module to toggle clown mode in MMM-FantasyTracker via voice commands
 * Listens for HTTP requests from Flask app and sends notifications to other modules
 * 
 * By Andrew Sullivan
 */

Module.register("MMM-ClownModeHelper", {
    
    // Default module config
    defaults: {
        port: 8081, // Port for HTTP server
        debug: false
    },

    // Start the module
    start: function() {
        Log.info("Starting module: " + this.name);
        this.clownModeActive = false;
        
        // Send config to node helper to start HTTP server
        this.sendSocketNotification("START_SERVER", {
            port: this.config.port,
            debug: this.config.debug
        });
    },

    // Handle notifications from node helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "CLOWN_MODE_TOGGLE") {
            this.clownModeActive = !this.clownModeActive;
            
            if (this.config.debug) {
                Log.info("Clown mode toggled to: " + this.clownModeActive);
            }
            
            // Send notification to all modules (especially MMM-FantasyTracker)
            this.sendNotification("CLOWN_MODE_CHANGED", {
                active: this.clownModeActive
            });
            
        } else if (notification === "CLOWN_MODE_ON") {
            this.clownModeActive = true;
            
            if (this.config.debug) {
                Log.info("Clown mode activated");
            }
            
            this.sendNotification("CLOWN_MODE_CHANGED", {
                active: true
            });
            
        } else if (notification === "CLOWN_MODE_OFF") {
            this.clownModeActive = false;
            
            if (this.config.debug) {
                Log.info("Clown mode deactivated");
            }
            
            this.sendNotification("CLOWN_MODE_CHANGED", {
                active: false
            });
            
        } else if (notification === "SCENES_PAUSE_REQUEST") {
            Log.info("Scene pause requested via voice command");
            this.sendNotification("SCENES_PAUSE", {});
            
        } else if (notification === "SCENES_RESUME_REQUEST") {
            Log.info("Scene resume requested via voice command");
            this.sendNotification("SCENES_RESUME", {});
            
        } else if (notification === "SCENES_PLAY_REQUEST") {
            const sceneName = payload.scene;
            Log.info(`Scene play requested via voice command: ${sceneName}`);
            this.sendNotification("SCENES_PLAY", { scene: sceneName });
        }
    },

    // This module doesn't need to display anything
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.style.display = "none";
        return wrapper;
    }
});
