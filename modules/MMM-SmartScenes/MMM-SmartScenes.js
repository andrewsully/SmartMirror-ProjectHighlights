/* MagicMirror²
 * Module: MMM-SmartScenes
 * 
 * Smart scene duration management - extends scene time when user interacts
 * 
 * By Andrew Sullivan
 */

Module.register("MMM-SmartScenes", {
    
    defaults: {
        normalDuration: 30000,    // 30 seconds normal
        extendedDuration: 300000, // 5 minutes when user interacts
        debug: false
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.isExtended = false;
        this.extendedTimer = null;
        this.interactionCount = 0;
    },

    notificationReceived: function(notification, payload, sender) {
        // Listen for user interactions
        if (this.isUserInteraction(notification)) {
            this.handleUserInteraction(notification, payload);
        }
        
        // Listen for scene changes to reset if needed
        if (notification === "SCENES_NEXT" || notification === "SCENES_PREV" || notification === "SCENES_PLAY") {
            // If this was a manual scene change, extend the new scene
            this.handleSceneChange(notification, payload);
        }
    },

    isUserInteraction: function(notification) {
        // Define what counts as user interaction
        const interactionNotifications = [
            "CLOWN_MODE_CHANGED",    // Clown mode toggling
            "SCENES_NEXT",           // Manual scene navigation
            "SCENES_PREV",           // Manual scene navigation  
            "SCENES_PLAY",           // Manual scene selection
            "SCENES_PAUSE",          // Scene pausing
            "VOLUME_UP",             // Volume changes
            "VOLUME_DOWN",           // Volume changes
            "USER_PRESENCE"          // Any other user presence indicators
        ];
        
        return interactionNotifications.includes(notification);
    },

    handleUserInteraction: function(notification, payload) {
        this.interactionCount++;
        
        Log.info(`SmartScenes: User interaction detected (${notification}) - Count: ${this.interactionCount}`);
        
        // Extend current scene duration
        this.extendCurrentScene();
    },

    handleSceneChange: function(notification, payload) {
        Log.info(`SmartScenes: Scene change detected (${notification})`);
        
        // If user manually changed scenes, extend the new scene
        if (notification === "SCENES_NEXT" || notification === "SCENES_PREV" || notification === "SCENES_PLAY") {
            // Small delay to let scene change complete, then extend
            setTimeout(() => {
                this.extendCurrentScene();
            }, 1000);
        }
    },

    extendCurrentScene: function() {
        if (this.isExtended) {
            Log.info("SmartScenes: Already extended, resetting timer");
            // Already extended, just reset the timer
            this.resetExtensionTimer();
            return;
        }

        Log.info("SmartScenes: Extending current scene to 5 minutes");

        // Mark as extended
        this.isExtended = true;

        // Send notification to pause automatic scene transitions
        this.sendNotification("SCENES_PAUSE");

        // Set timer to resume normal transitions after extended duration
        this.resetExtensionTimer();
    },

    resetExtensionTimer: function() {
        // Clear existing timer
        if (this.extendedTimer) {
            clearTimeout(this.extendedTimer);
        }

        // Set new timer for extended duration
        this.extendedTimer = setTimeout(() => {
            this.resumeNormalScenes();
        }, this.config.extendedDuration);
    },

    resumeNormalScenes: function() {
        Log.info("SmartScenes: Resuming normal scene transitions after 5 minutes");

        this.isExtended = false;
        this.extendedTimer = null;

        // Resume automatic scene transitions
        this.sendNotification("SCENES_RESUME");
    },

    // This module doesn't display anything
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.style.display = "none";
        return wrapper;
    },

    // Clean up timers when module stops
    suspend: function() {
        if (this.extendedTimer) {
            clearTimeout(this.extendedTimer);
        }
    },

    resume: function() {
        // Module resumed, but don't automatically restart timers
    }
});
