const NodeHelper = require("node_helper");
const {execSync} = require('child_process');
const Log = require("logger");

module.exports = NodeHelper.create({
    start: function () {
        Log.log("Starting node helper: " + this.name);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            // Add a 3-second delay before first stats collection
            setTimeout(() => {
                this.getStats();
            }, 3000);
        }
    },

    getStats: function () {
        const self = this;
        
        try {
            this.stats = {
                cpu: this.getCpuUsage(),
                ram: this.getRamUsage(),
                disk: this.getDiskUsage(),
                temp: this.getTemperature(),
                volume: this.getVolume(),
                ip: this.getIpAddress(),
                wifi: this.getWifiStatus()
            };

            this.sendSocketNotification("STATS", this.stats);

            setTimeout(function () {
                self.getStats();
            }, this.config.updateInterval);
            
        } catch (error) {
            Log.error(`${this.name} - Error getting stats: ${error.message}`);
            // Retry after a longer delay on error
            setTimeout(function () {
                self.getStats();
            }, this.config.updateInterval * 2);
        }
    },

    getCpuUsage: function() {
        if (!this.config.showCpu) return 0;
        try {
            const result = execSync("top -bn1 | awk '/^%Cpu/ {print 100 - $8}'", {encoding: 'utf8'});
            return Math.round(parseFloat(result.trim()));
        } catch (error) {
            Log.error(`${this.name} - CPU command failed: ${error.message}`);
            return 0;
        }
    },

    getRamUsage: function() {
        if (!this.config.showRam) return 0;
        try {
            const result = execSync("free | awk '/Mem:/ { print (($3 + $5) / $2) * 100 }'", {encoding: 'utf8'});
            return Math.round(parseFloat(result.trim()));
        } catch (error) {
            Log.error(`${this.name} - RAM command failed: ${error.message}`);
            return 0;
        }
    },

    getDiskUsage: function() {
        if (!this.config.showDisk) return 0;
        try {
            const result = execSync("df -h / | awk 'NR==2 {print $5}' | tr -d '%'", {encoding: 'utf8'});
            return Math.round(parseFloat(result.trim()));
        } catch (error) {
            Log.error(`${this.name} - Disk command failed: ${error.message}`);
            return 0;
        }
    },

    getTemperature: function() {
        if (!this.config.showTemp) return 0;
        try {
            const result = execSync("cat /sys/class/thermal/thermal_zone0/temp", {encoding: 'utf8'});
            const tempC = parseFloat(result.trim()) / 1000;
            const tempF = Math.round((tempC * 1.8) + 32);
            return tempF;
        } catch (error) {
            Log.error(`${this.name} - Temperature command failed: ${error.message}`);
            return 0;
        }
    },

    getVolume: function() {
        if (!this.config.showVolume) return 0;
        try {
            const result = execSync("amixer get Master | grep 'Front Left:' | awk -F '[][]' '{ print $2 }' | tr -d '%'", {encoding: 'utf8'});
            return Math.round(parseFloat(result.trim()));
        } catch (error) {
            Log.error(`${this.name} - Volume command failed: ${error.message}`);
            return 0;
        }
    },

    getIpAddress: function() {
        if (!this.config.showIp) return "0.0.0.0";
        try {
            const result = execSync("hostname -I | awk '{print $1}'", {encoding: 'utf8'});
            return result.trim();
        } catch (error) {
            Log.error(`${this.name} - IP command failed: ${error.message}`);
            return "0.0.0.0";
        }
    },

    getWifiStatus: function() {
        if (!this.config.showWifi) return "Disabled";
        try {
            // Check if WiFi is connected first
            const connected = execSync("iwconfig wlan0 2>/dev/null | grep -q 'ESSID:' && echo 'yes' || echo 'no'", {encoding: 'utf8'}).trim();
            
            if (connected === 'no') {
                return "Disconnected";
            }
            
            // Get signal quality percentage
            const qualityResult = execSync("iwconfig wlan0 2>/dev/null | grep 'Link Quality' | awk '{print $2}' | cut -d= -f2 | cut -d/ -f1", {encoding: 'utf8'});
            const quality = parseInt(qualityResult.trim());
            
            if (quality >= 80) {
                return "Excellent";
            } else if (quality >= 60) {
                return "Good";
            } else if (quality >= 40) {
                return "Fair";
            } else {
                return "Poor";
            }
        } catch (error) {
            Log.error(`${this.name} - WiFi command failed: ${error.message}`);
            return "Disconnected";
        }
    }
});
