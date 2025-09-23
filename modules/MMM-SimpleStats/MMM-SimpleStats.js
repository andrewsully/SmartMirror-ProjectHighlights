/* Magic Mirror
 * Module: MMM-SimpleStats
 *
 * Simple system statistics display
 * By: Custom Module
 * MIT Licensed
 */

Module.register("MMM-SimpleStats", {
    // Default module config.
    defaults: {
        position: "bottom_right",
        updateInterval: 10000, // 10 seconds
        showCpu: true,
        showRam: true,
        showDisk: true,
        showTemp: true,
        showVolume: true,
        showIp: true,
        showWifi: true,
        fontSize: "14px",
        color: "#ffffff"
    },

    start: function() {
        this.stats = {
            cpu: 0,
            ram: 0,
            disk: 0,
            temp: 0,
            volume: 0,
            ip: "0.0.0.0",
            wifi: "Disconnected"
        };
        
        this.previousVolume = -1; // Track previous volume for animation
        this.isFirstUpdate = true; // Flag to prevent animation on first update
        
        // Send config to node helper
        this.sendSocketNotification("CONFIG", this.config);
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "simple-stats";
        wrapper.style.cssText = `
            color: ${this.config.color};
            font-size: ${this.config.fontSize};
            font-family: monospace;
            text-align: right;
            line-height: 1.2;
        `;
        
        this.wrapper = wrapper;
        this.updateDisplay();
        
        return wrapper;
    },

    updateDisplay: function() {
        if (!this.wrapper) return;
        
        let html = "";
        
        if (this.config.showVolume) {
            const volumeClass = this.shouldAnimateVolume() ? "volume-animate" : "";
            html += `<span class="volume-display ${volumeClass}">Vol: ${this.stats.volume}%</span><br>`;
        }
        
        if (this.config.showTemp) {
            const tempColor = this.getTempColor(this.stats.temp);
            html += `<span style="color: ${tempColor}">Temp: ${this.stats.temp}°</span><br>`;
        }
        
        if (this.config.showWifi) {
            html += `WiFi: ${this.stats.wifi}<br>`;
        }
        
        if (this.config.showIp) {
            html += `<span class="ip-address">${this.stats.ip}</span><br>`;
        }
        
        // Create a small table for CPU, RAM, Disk at the bottom
        if (this.config.showCpu || this.config.showRam || this.config.showDisk) {
            html += `<table class="stats-table" style="display: block; margin: 0 0 0 auto; border-collapse: collapse; font-size: ${this.config.fontSize}; color: ${this.config.color}; text-align: right !important;">`;
            html += `<tr>`;
            
            if (this.config.showCpu) {
                html += `<td style="text-align: center; padding: 0 0 0 8px; border: none;">CPU<br>${this.stats.cpu}%</td>`;
            }
            
            if (this.config.showRam) {
                html += `<td style="text-align: center; padding: 0 0 0 8px; border: none;">RAM<br>${this.stats.ram}%</td>`;
            }
            
            if (this.config.showDisk) {
                html += `<td style="text-align: center; padding: 0 0 0 8px; border: none;">Disk<br>${this.stats.disk}%</td>`;
            }
            
            html += `</tr></table>`;
        }
        
        this.wrapper.innerHTML = html;
    },

    getTempColor: function(temp) {
        if (temp >= 170) {
            return "#ff0000"; // Red for hot (170°F+)
        } else {
            return "#ffffff"; // White for normal (below 170°F)
        }
    },


    shouldAnimateVolume: function() {
        // Don't animate on the very first update (scene changes, initial load)
        if (this.isFirstUpdate) {
            this.previousVolume = this.stats.volume;
            this.isFirstUpdate = false;
            return false;
        }
        
        // Only animate if volume actually changed from a previous value
        if (this.stats.volume !== this.previousVolume) {
            this.previousVolume = this.stats.volume;
            return true;
        }
        
        return false;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "STATS") {
            this.stats = payload;
            this.updateDisplay();
        }
    }
});
