/* MagicMirror²
 * Node Helper: MMM-ClownModeHelper
 * 
 * HTTP server to receive clown mode commands from Flask app
 * 
 * By Andrew Sullivan
 */

const NodeHelper = require("node_helper");
const express = require("express");

module.exports = NodeHelper.create({
    
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.expressApp = null;
        this.server = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "START_SERVER") {
            this.startHttpServer(payload.port, payload.debug);
        }
    },

    startHttpServer: function(port, debug) {
        const self = this;
        
        // Create Express app if it doesn't exist
        if (!this.expressApp) {
            this.expressApp = express();
            this.expressApp.use(express.json());
            
            // Endpoint to toggle clown mode
            this.expressApp.post("/clown/toggle", (req, res) => {
                if (debug) {
                    console.log("Received clown mode toggle request");
                }
                self.sendSocketNotification("CLOWN_MODE_TOGGLE", {});
                res.json({ success: true, message: "Clown mode toggled" });
            });
            
            // Endpoint to turn clown mode on
            this.expressApp.post("/clown/on", (req, res) => {
                if (debug) {
                    console.log("Received clown mode ON request");
                }
                self.sendSocketNotification("CLOWN_MODE_ON", {});
                res.json({ success: true, message: "Clown mode activated" });
            });
            
            // Endpoint to turn clown mode off
            this.expressApp.post("/clown/off", (req, res) => {
                if (debug) {
                    console.log("Received clown mode OFF request");
                }
                self.sendSocketNotification("CLOWN_MODE_OFF", {});
                res.json({ success: true, message: "Clown mode deactivated" });
            });
            
            // Endpoint to pause scenes
            this.expressApp.post("/scenes/pause", (req, res) => {
                if (debug) {
                    console.log("Received scenes PAUSE request");
                }
                self.sendSocketNotification("SCENES_PAUSE_REQUEST", {});
                res.json({ success: true, message: "Scenes paused" });
            });
            
            // Endpoint to resume scenes
            this.expressApp.post("/scenes/resume", (req, res) => {
                if (debug) {
                    console.log("Received scenes RESUME request");
                }
                self.sendSocketNotification("SCENES_RESUME_REQUEST", {});
                res.json({ success: true, message: "Scenes resumed" });
            });
            
            // Endpoint to play specific scene
            this.expressApp.post("/scenes/play", (req, res) => {
                const sceneName = req.body.scene;
                if (debug) {
                    console.log(`Received scenes PLAY request for: ${sceneName}`);
                }
                self.sendSocketNotification("SCENES_PLAY_REQUEST", { scene: sceneName });
                res.json({ success: true, message: `Playing scene: ${sceneName}` });
            });

            // Health check endpoint
            this.expressApp.get("/clown/status", (req, res) => {
                res.json({ success: true, message: "Clown mode helper is running" });
            });
        }
        
        // Start server if not already running
        if (!this.server) {
            this.server = this.expressApp.listen(port, () => {
                console.log(`MMM-ClownModeHelper HTTP server running on port ${port}`);
            });
        }
    },

    stop: function() {
        if (this.server) {
            this.server.close();
            console.log("MMM-ClownModeHelper HTTP server stopped");
        }
    }
});
