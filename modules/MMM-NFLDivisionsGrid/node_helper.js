/*
 * MagicMirror²
 * Node Helper: MMM-NFLDivisionsGrid
 * 
 * NFL Divisions Grid Display - Uses same approach as MMM-StandingsNew
 * MIT Licensed
 */

var NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

	start: function () {
		console.log('MMM-NFLDivisionsGrid helper started ...');
	},

	getData: async function (notification, url) {
		var self = this;
		console.log('MMM-NFLDivisionsGrid requesting: ' + url);
		
		try {
			const response = await fetch(url);
			if (response.ok) {
				const result = await response.json();
				console.log('MMM-NFLDivisionsGrid: Successfully fetched data');
				self.sendSocketNotification(notification, result);
			} else {
				console.log("MMM-NFLDivisionsGrid: HTTP Error " + response.status);
			}
		} catch (error) {
			console.log("MMM-NFLDivisionsGrid: Could not load data from " + url);
			console.log("Error: " + error);
		}
	},

	//Subclass socketNotificationReceived received.
	socketNotificationReceived: function(notification, payload) {
		console.log("MMM-NFLDivisionsGrid node_helper: Received notification:", notification);
		if (notification === "GET_STANDINGS_DATA") {
			this.getData("STANDINGS_DATA_RESULT", payload);
		}
	}
});
