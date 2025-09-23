/* Magic Mirror
 * Module: MMM-FantasyStandings
 * Node Helper for ESPN API integration
 */

const NodeHelper = require('node_helper');
const { spawn } = require('child_process');
const path = require('path');

module.exports = NodeHelper.create({
    start() {
        console.log(`Starting node helper for: ${this.name}`);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'CONFIG') {
            this.config = payload;
            this.fetchStandings();
            
            // Set up periodic updates
            setInterval(() => {
                this.fetchStandings();
            }, this.config.updateInterval);
        }
    },

    fetchStandings() {
        console.log('Fetching fantasy standings from ESPN...');
        
        // Use the Python ESPN client
        const pythonScript = path.join(__dirname, 'get_standings.py');
        const python = spawn('python3', [
            pythonScript,
            this.config.leagueId,
            this.config.year,
            this.config.username
        ]);

        let dataString = '';

        python.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        python.stderr.on('data', (data) => {
            console.error(`ESPN API Error: ${data}`);
        });

        python.on('close', (code) => {
            if (code === 0 && dataString.trim()) {
                try {
                    const standings = JSON.parse(dataString);
                    console.log(`✅ Fetched standings for ${standings.league_info.name}`);
                    this.sendSocketNotification('STANDINGS_DATA', standings);
                } catch (error) {
                    console.error('Error parsing standings data:', error);
                }
            } else {
                console.error(`Python script exited with code ${code}`);
            }
        });
    }
});
