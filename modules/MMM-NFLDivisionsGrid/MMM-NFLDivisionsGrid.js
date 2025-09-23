/* global Module */

Module.register("MMM-NFLDivisionsGrid", {
	defaults: {
		updateInterval: 60 * 60 * 1000, // 60 minutes
		animationSpeed: 2000,
		showLogos: true,
		useLocalLogos: true,
		nameStyle: "short", // "abbreviation", "full", or "short"
		showRecords: true,
		showConferenceLabels: true,
		fadeSpeed: 2000,
		maxTeamsPerDivision: 4, // Standard NFL division size
		// NFL Divisions in display order
		divisions: {
			afc: [
				{ name: "AFC East", teams: ["BUF", "MIA", "NYJ", "NE"] },
				{ name: "AFC North", teams: ["BAL", "CIN", "CLE", "PIT"] },
				{ name: "AFC South", teams: ["HOU", "IND", "JAX", "TEN"] },
				{ name: "AFC West", teams: ["KC", "LAC", "LV", "DEN"] }
			],
			nfc: [
				{ name: "NFC East", teams: ["PHI", "DAL", "NYG", "WAS"] },
				{ name: "NFC North", teams: ["DET", "GB", "MIN", "CHI"] },
				{ name: "NFC South", teams: ["ATL", "TB", "NO", "CAR"] },
				{ name: "NFC West", teams: ["SEA", "LAR", "SF", "ARI"] }
			]
		}
	},

	start() {
		console.log("MMM-NFLDivisionsGrid: Starting module...");
		this.standingsData = null;
		this.loaded = false;
		
		// Get initial data
		console.log("MMM-NFLDivisionsGrid: Getting initial data...");
		this.getData();
		
		// Schedule updates
		this.scheduleUpdate();
		console.log("MMM-NFLDivisionsGrid: Module started successfully");
	},

	getData: function (clearAll) {
		console.log("MMM-NFLDivisionsGrid: Getting data...");
		// Copy exact logic from MMM-StandingsNew
		if (clearAll === true) {
			this.standingsData = {};
			this.loaded = false;
		}

		// Use exact NFL URL from MMM-StandingsNew
		var sport = "football/nfl/standings?level=3&sort=winpercent:desc,playoffseed:asc";
		var url = "http://site.web.api.espn.com/apis/v2/sports/" + sport;
		
		console.log("MMM-NFLDivisionsGrid: Requesting URL:", url);
		this.sendSocketNotification("GET_STANDINGS_DATA", url);
	},

	scheduleUpdate() {
		setInterval(() => {
			this.getData();
		}, this.config.updateInterval);
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "MMM-NFLDivisionsGrid";

		if (!this.loaded || !this.standingsData) {
			wrapper.innerHTML = '<div class="loading">Loading NFL standings...</div>';
			return wrapper;
		}

		// AFC Conference Container
		const afcContainer = document.createElement("div");
		afcContainer.className = "conference-container afc-container";
		
		const afcRow = document.createElement("div");
		afcRow.className = "divisions-row afc-row";
		
		this.config.divisions.afc.forEach(division => {
			const divisionTable = this.createDivisionTable(division, this.standingsData[division.name], 'afc');
			afcRow.appendChild(divisionTable);
		});
		afcContainer.appendChild(afcRow);
		wrapper.appendChild(afcContainer);

		// NFC Conference Container
		const nfcContainer = document.createElement("div");
		nfcContainer.className = "conference-container nfc-container";
		
		const nfcRow = document.createElement("div");
		nfcRow.className = "divisions-row nfc-row";
		
		this.config.divisions.nfc.forEach(division => {
			const divisionTable = this.createDivisionTable(division, this.standingsData[division.name], 'nfc');
			nfcRow.appendChild(divisionTable);
		});
		nfcContainer.appendChild(nfcRow);
		wrapper.appendChild(nfcContainer);

		return wrapper;
	},

	createDivisionTable(division, standings, conference) {
		const container = document.createElement("div");
		container.className = "division-container";

		// Create table exactly like MMM-MyStandings
		const table = document.createElement("table");
		table.className = "standings";

		// Division header row with W/L labels
		const headerRow = document.createElement("tr");
		headerRow.className = "league-separator";
		
		// Division name with conference gradient
		const nameCell = document.createElement("td");
		nameCell.colSpan = 1; // Just the first column
		const headerSpan = document.createElement("span");
		headerSpan.textContent = division.name.replace("AFC ", "").replace("NFC ", ""); // Remove conference prefix
		
		// Add conference-specific gradient with 0.6 opacity white background
		if (conference === 'afc') {
			headerSpan.style.background = 'linear-gradient(to right, rgba(255, 0, 0, 0.7) 0%, rgba(255, 0, 0, 0.5) 5%, rgba(255, 0, 0, 0.35) 10%, rgba(255, 0, 0, 0.25) 15%, rgba(255, 0, 0, 0.1) 20%, rgba(255, 0, 0, 0.05) 25%, transparent 30%, transparent 100%), rgba(255, 255, 255, 0.6)';
			nameCell.setAttribute('data-conference', 'afc');
		} else if (conference === 'nfc') {
			headerSpan.style.background = 'linear-gradient(to right, rgba(0, 0, 255, 0.7) 0%, rgba(0, 0, 255, 0.5) 5%, rgba(0, 0, 255, 0.35) 10%, rgba(0, 0, 255, 0.25) 15%, rgba(0, 0, 255, 0.1) 20%, rgba(0, 0, 255, 0.05) 25%, transparent 30%, transparent 100%), rgba(255, 255, 255, 0.6)';
			nameCell.setAttribute('data-conference', 'nfc');
		}
		
		nameCell.appendChild(headerSpan);
		headerRow.appendChild(nameCell);
		
		// W column header
		const wHeader = document.createElement("td");
		wHeader.textContent = "W";
		wHeader.style.textAlign = "center";
		wHeader.style.fontWeight = "bold";
		wHeader.style.color = "#fff";
		headerRow.appendChild(wHeader);
		
		// L column header  
		const lHeader = document.createElement("td");
		lHeader.textContent = "L";
		lHeader.style.textAlign = "center";
		lHeader.style.fontWeight = "bold";
		lHeader.style.color = "#fff";
		headerRow.appendChild(lHeader);
		
		table.appendChild(headerRow);

		// Team rows
		if (standings && standings.length > 0) {
			standings.forEach((team, index) => {
				const teamRow = document.createElement("tr");

				// Logo
				if (this.config.showLogos) {
					const logoCell = document.createElement("td");
					logoCell.className = "logo";
					const logo = document.createElement("img");
					logo.className = "logo";
					logo.src = this.getTeamLogoUrl(team);
					logo.alt = team.displayName;
					logoCell.appendChild(logo);
					teamRow.appendChild(logoCell);
				}

				// No team name - just logo (removed team text)

				// Wins
				const winsCell = document.createElement("td");
				winsCell.textContent = team.stats.wins;
				teamRow.appendChild(winsCell);

				// Losses
				const lossesCell = document.createElement("td");
				lossesCell.textContent = team.stats.losses;
				teamRow.appendChild(lossesCell);

				table.appendChild(teamRow);
			});
		}

		container.appendChild(table);
		return container;
	},

	getTeamName(team) {
		switch (this.config.nameStyle) {
			case "abbreviation":
				return team.abbreviation;
			case "full":
				return team.displayName;
			case "short":
			default:
				return team.shortDisplayName || team.displayName;
		}
	},

	getTeamLogoUrl(team) {
		// Use the exact same logo logic as MMM-MyStandings
		if (this.config.useLocalLogos) {
			return `modules/MMM-MyStandings/logos/NFL/${team.abbreviation}.svg`;
		} else {
			// Use the team's actual logo from ESPN API
			return team.team.logos[0].href;
		}
	},

	socketNotificationReceived(notification, payload) {
		console.log("MMM-NFLDivisionsGrid: Received notification:", notification);
		if (notification === "STANDINGS_DATA_RESULT") {
			console.log("MMM-NFLDivisionsGrid: Received standings data");
			this.processStandingsData(payload);
			this.loaded = true;
			this.updateDom(this.config.animationSpeed);
		}
	},

	processStandingsData(data) {
		// Process the ESPN API response to organize by divisions
		this.standingsData = {};
		
		if (data.children) {
			data.children.forEach(conference => {
				if (conference.children) {
					conference.children.forEach(division => {
						const divisionName = division.name;
						this.standingsData[divisionName] = division.standings.entries.map(entry => ({
							displayName: entry.team.displayName,
							shortDisplayName: entry.team.shortDisplayName,
							abbreviation: entry.team.abbreviation,
							stats: {
								wins: entry.stats.find(stat => stat.name === 'wins')?.value || 0,
								losses: entry.stats.find(stat => stat.name === 'losses')?.value || 0,
								ties: entry.stats.find(stat => stat.name === 'ties')?.value || 0
							}
						}));
					});
				}
			});
		}
		
		console.log("MMM-NFLDivisionsGrid: Processed divisions:", Object.keys(this.standingsData));
	},

	getStyles() {
		return ["MMM-NFLDivisionsGrid.css"];
	}
});
