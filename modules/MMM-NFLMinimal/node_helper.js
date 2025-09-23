/* Magic Mirror
 * Module: MMM-NFLMinimal Node Helper
 * 
 * Based on MMM-NFL by fewieden
 * Uses exact same data fetching logic
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const espn = require('./espn'); // Copy the ESPN data fetcher

module.exports = NodeHelper.create({
    start() {
        console.log(`Starting node helper for: MMM-NFLMinimal`);
    },

    async socketNotificationReceived(notification, payload) {
        if (notification === 'CONFIG') {
            this.config = payload;
            await this.getData();
            
            // Set up interval for updates (copy from MMM-NFL)
            if (this.interval) {
                clearInterval(this.interval);
            }
            
            this.interval = setInterval(async () => {
                await this.getData();
            }, this.config.reloadInterval);
            
        } else if (notification === 'SUSPEND') {
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    },

    async getData() {
        try {
            console.log('MMM-NFLMinimal: Fetching NFL data...');
            const data = await espn.getData(); // Use exact same ESPN fetcher
            
            this.sendSocketNotification('SCORES', {
                scores: data.scores,
                details: data.details
            });
            
            console.log(`MMM-NFLMinimal: Fetched ${data.scores.length} games`);
        } catch (error) {
            console.error('MMM-NFLMinimal: Error fetching data:', error);
        }
    }
});
