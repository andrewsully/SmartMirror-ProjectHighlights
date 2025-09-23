/* global Module */

Module.register("MMM-CompactNews", {
	defaults: {
		feeds: [
			{
				title: "ESPN NFL News",
				url: "http://www.espn.com/espn/rss/nfl/news"
			},
			{
				title: "CBS Sports NFL", 
				url: "https://www.cbssports.com/rss/headlines/nfl/"
			}
		],
		maxItems: 5, // Show 5 headlines
		updateInterval: 60 * 60 * 1000, // 1 hour
		animationSpeed: 1000,
		titleLength: 60, // Character limit for headlines
		maxWidth: 200, // Maximum width before text wraps (pixels)
		showSource: true, // Show source name
		showTime: true, // Show time since posting
		fadeSpeed: 2000,
	},

	start() {
		this.newsItems = [];
		this.currentIndex = 0;
		this.loaded = false;
		
		// Get initial data
		this.getNews();
		
		// Schedule updates
		this.scheduleUpdate();
	},

	getNews() {
		this.sendSocketNotification("GET_COMPACT_NEWS", {
			feeds: this.config.feeds,
			maxItems: this.config.maxItems
		});
	},

	scheduleUpdate() {
		setInterval(() => {
			this.getNews();
		}, this.config.updateInterval);
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "compact-news";
		
		// Apply max-width from config
		if (this.config.maxWidth) {
			wrapper.style.maxWidth = this.config.maxWidth + 'px';
		}

		if (!this.loaded || this.newsItems.length === 0) {
			wrapper.innerHTML = '<div class="loading">Loading news...</div>';
			return wrapper;
		}

		// Create news list
		const newsList = document.createElement("div");
		newsList.className = "news-list";

		this.newsItems.slice(0, this.config.maxItems).forEach((item, index) => {
			const newsItem = document.createElement("div");
			newsItem.className = `news-item ${index % 2 === 0 ? 'even' : 'odd'}`;

			// Always show source and time (regardless of title length)
			const meta = document.createElement("div");
			meta.className = "news-meta";
			
			let metaText = "";
			if (this.config.showSource && item.source) {
				metaText += item.source;
			}
			if (this.config.showTime) {
				if (metaText) metaText += ", ";
				metaText += this.getTimeAgo(item.pubDate);
			}
			
			// Always add meta, even if title is long
			if (metaText) {
				meta.textContent = metaText;
				newsItem.appendChild(meta);
			}

			// Headline (can be multiple lines)
			const headline = document.createElement("div");
			headline.className = "news-headline";
			headline.textContent = this.truncateText(item.title, this.config.titleLength);
			newsItem.appendChild(headline);

			newsList.appendChild(newsItem);
		});

		wrapper.appendChild(newsList);
		return wrapper;
	},

	truncateText(text, length) {
		if (!length || text.length <= length) return text;
		return text.substring(0, length) + "...";
	},

	getTimeAgo(pubDate) {
		if (!pubDate) return "";
		
		const now = new Date();
		const published = new Date(pubDate);
		const diffMs = now - published;
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffHours >= 24) {
			const diffDays = Math.floor(diffHours / 24);
			return `${diffDays}d ago`;
		} else if (diffHours >= 1) {
			return `${diffHours}h ago`;
		} else if (diffMinutes >= 1) {
			return `${diffMinutes}m ago`;
		} else {
			return "just now";
		}
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "COMPACT_NEWS_RESULT") {
			this.newsItems = payload.items || [];
			this.loaded = true;
			this.updateDom(this.config.animationSpeed);
		} else if (notification === "COMPACT_NEWS_ERROR") {
			console.error("MMM-CompactNews: Error fetching news:", payload.error);
		}
	},

	getStyles() {
		return ["MMM-CompactNews.css"];
	}
});
