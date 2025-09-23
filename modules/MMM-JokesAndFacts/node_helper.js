/*
 * MagicMirror²
 * Node Helper: MMM-JokesAndFacts
 * 
 * Combines Dad Jokes and Useless Facts
 * MIT Licensed
 */

const Log = require("logger");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	start() {
		Log.log("MMM-JokesAndFacts helper started");
	},

	// Fetch a dad joke from icanhazdadjoke.com
	async getJoke() {
		try {
			const response = await fetch("https://icanhazdadjoke.com", {
				method: "GET",
				headers: {
					Accept: "application/json",
					"User-Agent": "MMM-JokesAndFacts (https://github.com/custom/MMM-JokesAndFacts)"
				}
			});
			const data = await response.json();
			this.sendSocketNotification("JOKE_RESULT", data);
		} catch (err) {
			Log.error("MMM-JokesAndFacts: Error fetching joke:", err);
			// Send a fallback joke
			this.sendSocketNotification("JOKE_RESULT", {
				joke: "Why don't scientists trust atoms? Because they make up everything!"
			});
		}
	},

	// Fetch a useless fact from uselessfacts.jsph.pl
	async getFact(language = "en") {
		try {
			const apiUrl = `https://uselessfacts.jsph.pl/random.json?language=${language}`;
			const response = await fetch(apiUrl);
			const data = await response.json();
			this.sendSocketNotification("FACT_RESULT", data);
		} catch (err) {
			Log.error("MMM-JokesAndFacts: Error fetching fact:", err);
			// Send a fallback fact
			this.sendSocketNotification("FACT_RESULT", {
				text: "Bananas are berries, but strawberries aren't!"
			});
		}
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "GET_JOKE") {
			this.getJoke();
		} else if (notification === "GET_FACT") {
			const language = payload && payload.language ? payload.language : "en";
			this.getFact(language);
		}
	}
});
