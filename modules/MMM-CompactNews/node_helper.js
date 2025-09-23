/*
 * MagicMirror²
 * Node Helper: MMM-CompactNews
 * 
 * Compact news feed for top_right positioning
 * MIT Licensed
 */

const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	start() {
		console.log("MMM-CompactNews helper started");
	},

	async fetchFeed(feed) {
		try {
			console.log(`MMM-CompactNews: Fetching ${feed.title}...`);
			
			const response = await fetch(feed.url, {
				headers: {
					'User-Agent': 'MMM-CompactNews/1.0 (MagicMirror Module)'
				}
			});
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const xmlText = await response.text();
			
			// Simple XML parsing for RSS feeds
			const items = this.parseRSSItems(xmlText, feed.title);
			return items;
			
		} catch (error) {
			console.error(`MMM-CompactNews: Error fetching ${feed.title}:`, error);
			return [];
		}
	},

	parseRSSItems(xmlText, source) {
		const items = [];
		
		// Simple regex-based RSS parsing
		const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
		
		if (itemMatches) {
			itemMatches.forEach(itemXml => {
				const title = this.extractXMLContent(itemXml, 'title');
				const link = this.extractXMLContent(itemXml, 'link');
				const pubDate = this.extractXMLContent(itemXml, 'pubDate');
				
				if (title) {
					items.push({
						title: title,
						link: link,
						pubDate: pubDate,
						source: source
					});
				}
			});
		}
		
		return items;
	},

	extractXMLContent(xml, tagName) {
		const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
		const match = xml.match(regex);
		return match ? match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
	},

	async socketNotificationReceived(notification, payload) {
		if (notification === "GET_COMPACT_NEWS") {
			try {
				console.log("MMM-CompactNews: Fetching news from all feeds...");
				
				const allItems = [];
				
				// Fetch from all feeds
				for (const feed of payload.feeds) {
					const items = await this.fetchFeed(feed);
					allItems.push(...items);
				}
				
				// Sort by publication date (newest first)
				allItems.sort((a, b) => {
					const dateA = new Date(a.pubDate || 0);
					const dateB = new Date(b.pubDate || 0);
					return dateB - dateA;
				});
				
				// Limit to requested number
				const limitedItems = allItems.slice(0, payload.maxItems);
				
				console.log(`MMM-CompactNews: Found ${limitedItems.length} news items`);
				
				this.sendSocketNotification("COMPACT_NEWS_RESULT", {
					items: limitedItems
				});
				
			} catch (error) {
				console.error("MMM-CompactNews: Error in fetch process:", error);
				this.sendSocketNotification("COMPACT_NEWS_ERROR", {
					error: error.message
				});
			}
		}
	}
});
