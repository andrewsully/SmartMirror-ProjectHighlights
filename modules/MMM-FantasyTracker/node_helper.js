/* MagicMirror²
 * Node Helper: MMM-FantasyTracker
 * 
 * Fantasy Football Live Matchup Tracker
 * Server-side ESPN API integration
 * 
 * By Andrew Sullivan
 */

const NodeHelper = require("node_helper");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.config = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_FANTASY_DATA") {
            this.config = payload.config;
            this.getFantasyData(payload.identifier);
        }
    },

    getFantasyData: function(identifier) {
        console.log("MMM-FantasyTracker: Fetching fantasy data...");
        
        // Use Python script to get ESPN data
        const pythonScript = path.join(__dirname, "get_fantasy_data.py");
        const pythonProcess = spawn("python3", [
            pythonScript,
            this.config.leagueId.toString(),
            this.config.year.toString(),
            this.config.username
        ]);

        let dataString = "";
        let errorString = "";

        pythonProcess.stdout.on("data", (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorString += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code === 0) {
                try {
                    const matchupData = JSON.parse(dataString);
                    console.log("MMM-FantasyTracker: Data fetched successfully");
                    this.sendSocketNotification("FANTASY_MATCHUP_DATA", {
                        identifier: identifier,
                        data: matchupData
                    });
                } catch (error) {
                    console.error("MMM-FantasyTracker: Error parsing data:", error);
                    this.sendSocketNotification("FANTASY_DATA_ERROR", {
                        identifier: identifier,
                        error: "Failed to parse fantasy data"
                    });
                }
            } else {
                console.error("MMM-FantasyTracker: Python script error:", errorString);
                this.sendSocketNotification("FANTASY_DATA_ERROR", {
                    identifier: identifier,
                    error: errorString || "Failed to fetch fantasy data"
                });
            }
        });
    }
});
