/* global Module */

Module.register("MMM-JokesAndFacts", {
	defaults: {
		title: "Jokes & Facts",
		rotationInterval: 15 * 1000, // 15 seconds between joke/fact rotation
		updateInterval: 30 * 60 * 1000, // 30 minutes - how often to fetch new content
		fadeSpeed: 4 * 1000, // Four seconds fade
		filters: [], // Filter out jokes/facts containing these terms
		fontSize: '1.5rem',
		textAlign: 'center',
		language: "en", // Language for useless facts
		showType: true, // Show "Dad Joke" or "Useless Fact" label
		typePosition: "top" // "top", "bottom", or "none"
	},

	// Current content and state
	currentContent: {
		text: "Loading...",
		type: "joke" // "joke" or "fact"
	},
	contentCache: {
		jokes: [],
		facts: []
	},
	currentIndex: {
		jokes: 0,
		facts: 0
	},
	isShowingJoke: true, // Alternates between true (joke) and false (fact)

	start() {
		this.getInitialContent();
		this.scheduleContentRotation();
		this.scheduleContentUpdates();
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "jokes-and-facts-wrapper";

		// Type label (optional)
		if (this.config.showType && this.config.typePosition === "top") {
			const typeLabel = document.createElement("div");
			typeLabel.className = "content-type-label";
			typeLabel.style.fontSize = "0.8rem";
			typeLabel.style.opacity = "0.7";
			typeLabel.style.marginBottom = "10px";
			typeLabel.style.textAlign = this.config.textAlign;
			typeLabel.innerHTML = this.isShowingJoke ? "Dad Joke" : "Useless Fact";
			wrapper.appendChild(typeLabel);
		}

		// Main content
		const content = document.createElement("div");
		content.className = "content-text medium";
		content.style.textAlign = this.config.textAlign;
		content.style.margin = "0 auto";
		content.style.fontSize = this.config.fontSize;
		content.innerHTML = this.currentContent.text;
		wrapper.appendChild(content);

		// Type label (bottom)
		if (this.config.showType && this.config.typePosition === "bottom") {
			const typeLabel = document.createElement("div");
			typeLabel.className = "content-type-label";
			typeLabel.style.fontSize = "0.8rem";
			typeLabel.style.opacity = "0.7";
			typeLabel.style.marginTop = "10px";
			typeLabel.style.textAlign = this.config.textAlign;
			typeLabel.innerHTML = this.isShowingJoke ? "Dad Joke" : "Useless Fact";
			wrapper.appendChild(typeLabel);
		}

		return wrapper;
	},

	// Get initial content for both jokes and facts
	getInitialContent() {
		this.sendSocketNotification("GET_JOKE");
		this.sendSocketNotification("GET_FACT", { language: this.config.language });
	},

	// Schedule rotation between jokes and facts every 15 seconds
	scheduleContentRotation() {
		setInterval(() => {
			this.rotateContent();
		}, this.config.rotationInterval);
	},

	// Schedule getting fresh content every 30 minutes
	scheduleContentUpdates() {
		setInterval(() => {
			this.sendSocketNotification("GET_JOKE");
			this.sendSocketNotification("GET_FACT", { language: this.config.language });
		}, this.config.updateInterval);
	},

	// Rotate between showing jokes and facts
	rotateContent() {
		this.isShowingJoke = !this.isShowingJoke;

		if (this.isShowingJoke) {
			// Show next joke
			if (this.contentCache.jokes.length > 0) {
				this.currentContent = {
					text: this.contentCache.jokes[this.currentIndex.jokes],
					type: "joke"
				};
				this.currentIndex.jokes = (this.currentIndex.jokes + 1) % this.contentCache.jokes.length;
			}
		} else {
			// Show next fact
			if (this.contentCache.facts.length > 0) {
				this.currentContent = {
					text: this.contentCache.facts[this.currentIndex.facts],
					type: "fact"
				};
				this.currentIndex.facts = (this.currentIndex.facts + 1) % this.contentCache.facts.length;
			}
		}

		this.updateDom(this.config.fadeSpeed);
	},

	// Check if content should be filtered
	shouldFilter(text) {
		return this.config.filters.some(term => 
			text.toLowerCase().indexOf(term.toLowerCase()) > -1
		);
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "JOKE_RESULT") {
			if (this.shouldFilter(payload.joke)) {
				// Filter matched, get another joke
				this.sendSocketNotification("GET_JOKE");
			} else {
				// Add to cache
				this.contentCache.jokes.push(payload.joke);
				
				// If this is the first joke and we're showing jokes, display it
				if (this.isShowingJoke && this.currentContent.text === "Loading...") {
					this.currentContent = {
						text: payload.joke,
						type: "joke"
					};
					this.updateDom(this.config.fadeSpeed);
				}
			}
		} else if (notification === "FACT_RESULT") {
			if (this.shouldFilter(payload.text)) {
				// Filter matched, get another fact
				this.sendSocketNotification("GET_FACT", { language: this.config.language });
			} else {
				// Add to cache
				this.contentCache.facts.push(payload.text);
				
				// If this is the first fact and we're showing facts, display it
				if (!this.isShowingJoke && this.currentContent.text === "Loading...") {
					this.currentContent = {
						text: payload.text,
						type: "fact"
					};
					this.updateDom(this.config.fadeSpeed);
				}
			}
		}
	},

	getStyles() {
		return ["MMM-JokesAndFacts.css"];
	}
});
