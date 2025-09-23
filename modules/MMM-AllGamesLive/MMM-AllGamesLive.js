/*
 * MMM-AllGamesLive - Fresh Start
 * Clean slate for new design
 */

Module.register("MMM-AllGamesLive", {
	defaults: {
		reloadInterval: 30000,
		animationSpeed: 2000,
		devPreview: false
	},

	start: function() {
		Log.info("Starting module: " + this.name);
		this.sendSocketNotification("AGLIVE_CONFIG", this.config);
		this.sendSocketNotification("AGLIVE_GET_GAMES");
	},

	getStyles: function() {
		return ["MMM-AllGamesLive.css"];
	},

	notificationReceived: function(notification) {
		if (notification === "DOM_OBJECTS_CREATED") {
			this.scheduleBarLayout();
		}
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "AGLIVE_GAMES_DATA") {
			this.gamesData = payload;
			this.updateDom(this.config.animationSpeed);
			this.scheduleBarLayout();
		}
	},

	getDom: function() {
		const wrapper = document.createElement("div");
		wrapper.className = "aglive-module";
		wrapper.id = `AGLIVE-${this.identifier}`;

		if (!this.gamesData) {
			wrapper.innerHTML = "Loading games...";
			return wrapper;
		}

		const gamesContainer = document.createElement("div");
		gamesContainer.className = "aglive-games-container";

		this.gamesData.forEach((game) => {
			const row = this.createSevenColumnRow(game);
			gamesContainer.appendChild(row);
		});

		wrapper.appendChild(gamesContainer);
		return wrapper;
	},

	createSevenColumnRow: function(game) {
		const row = document.createElement("div");
		row.className = "aglive-game-row";

		// Helper to make a div with class
		const make = (cls) => {
			const el = document.createElement("div");
			el.className = cls;
			return el;
		};

		// Build 7 cells in order
		const ddAway = make("aglive-down-distance");
		const logoAway = make("aglive-team-logo");
		const scoreAway = make("aglive-team-score");
		const center = make("aglive-center-info");
		const scoreHome = make("aglive-team-score");
		const logoHome = make("aglive-team-logo");
		const ddHome = make("aglive-down-distance");

		// Center top/sub
		const centerTop = document.createElement("div");
		centerTop.className = "aglive-center-top";
		const centerSub = document.createElement("div");
		centerSub.className = "aglive-center-sub";
		center.appendChild(centerTop);
		center.appendChild(centerSub);

		// Logos
		if (game.awayLogo) {
			logoAway.innerHTML = `<img src="${game.awayLogo}" alt="${game.awayTeam}">`;
		}
		if (game.homeLogo) {
			logoHome.innerHTML = `<img src="${game.homeLogo}" alt="${game.homeTeam}">`;
		}

		// Scores/Records and colors
		const setText = (el, text, sizePx, color) => {
			el.textContent = text || "";
			if (sizePx) el.style.fontSize = `${sizePx}px`;
			if (color) el.style.color = color;
		};
		const noSpaceDash = (v) => String(v || "").replace(/\s*-\s*/, "-");

		if (game.status === "UPCOMING") {
			setText(scoreAway, noSpaceDash(game.awayRecord), 28, "rgba(255,255,255,0.7)");
			setText(scoreHome, noSpaceDash(game.homeRecord), 28, "rgba(255,255,255,0.7)");
			centerTop.textContent = (game.gameTime || "").split(" ")[0] || ""; // day
			centerSub.textContent = (game.gameTime || "").split(" ").slice(1).join(" "); // time
			centerTop.style.opacity = "0.7";
		} else if (game.status === "FINAL") {
			// Match font size and opacity to upcoming records
			setText(scoreAway, (game.awayScore != null ? String(game.awayScore) : ""), 28, "rgba(255,255,255,0.7)");
			setText(scoreHome, (game.homeScore != null ? String(game.homeScore) : ""), 28, "rgba(255,255,255,0.7)");
			centerTop.textContent = "FINAL";
			centerSub.textContent = "";
            centerTop.style.opacity = "0.32";
			// Greyscale losing team logo
			const awayScoreNum = Number(game.awayScore || 0);
			const homeScoreNum = Number(game.homeScore || 0);
			const awayImg = logoAway.querySelector('img');
			const homeImg = logoHome.querySelector('img');
			if (awayScoreNum > homeScoreNum) {
				if (homeImg) homeImg.style.filter = 'grayscale(100%)';
				if (awayImg) awayImg.style.filter = '';
			} else if (homeScoreNum > awayScoreNum) {
				if (awayImg) awayImg.style.filter = 'grayscale(100%)';
				if (homeImg) homeImg.style.filter = '';
			} else {
				// tie: both normal
				if (awayImg) awayImg.style.filter = '';
				if (homeImg) homeImg.style.filter = '';
			}
			if (awayImg) awayImg.style.opacity = '0.8';
			if (homeImg) homeImg.style.opacity = '0.8';
		} else { // LIVE
			setText(scoreAway, (game.awayScore != null ? String(game.awayScore) : ""), 50, "#fff");
			setText(scoreHome, (game.homeScore != null ? String(game.homeScore) : ""), 50, "#fff");
			centerTop.textContent = game.clock || "";
			centerSub.textContent = (game.quarter || "").toString().toUpperCase();
			// Ensure logos are full opacity during live
			const awayImgLive = logoAway.querySelector('img');
			const homeImgLive = logoHome.querySelector('img');
			if (awayImgLive) awayImgLive.style.opacity = '1';
			if (homeImgLive) homeImgLive.style.opacity = '1';
		}

		// Dim all non-score, non-D&D text
		if (game.status !== 'FINAL') {
			centerTop.style.opacity = '0.5';
		}
		centerSub.style.opacity = '0.5';
		if (ddAway && ddAway.textContent) ddAway.style.opacity = '1';
		if (ddHome && ddHome.textContent) ddHome.style.opacity = '1';

		// Dynamic logo scaling per game status
		const scaleAway = (game.status === 'LIVE') ? 1.1 : 0.9;
		const scaleHome = (game.status === 'LIVE') ? 1.1 : 0.9;
		const awayImgEl = logoAway.querySelector('img');
		const homeImgEl = logoHome.querySelector('img');
		if (awayImgEl) awayImgEl.style.transform = `scale(${scaleAway})`;
		if (homeImgEl) homeImgEl.style.transform = `scale(${scaleHome})`;

		// Red zone indicator handled in layoutBars to connect to D&D bar

		// Down & distance text only for possession side when LIVE
		if (game.status === "LIVE" && game.downDistance) {
			if (game.ballPossession === game.awayTeam) {
				ddAway.textContent = game.downDistance;
				ddAway.style.justifyContent = "flex-end";
				ddAway.style.textAlign = "right";
			} else if (game.ballPossession === game.homeTeam) {
				ddHome.textContent = game.downDistance;
				ddHome.style.justifyContent = "flex-start";
				ddHome.style.textAlign = "left";
			} else {
				// default away if unknown
				ddAway.textContent = game.downDistance;
				ddAway.style.justifyContent = "flex-end";
				ddAway.style.textAlign = "right";
			}
		}

		row.appendChild(ddAway);
		row.appendChild(logoAway);
		row.appendChild(scoreAway);
		row.appendChild(center);
		row.appendChild(scoreHome);
		row.appendChild(logoHome);
		row.appendChild(ddHome);

		return row;
	},

	// Compute and draw mid background and D&D bars after DOM render
	layoutBars: function() {
		const root = document.getElementById(`AGLIVE-${this.identifier}`);
		if (!root) return;
		const TEAM_COLORS = {
			// ESPN abbreviations (align with fantasy-tracker)
			"ARI": "#97233F",
			"ATL": "#A71930",
			"BAL": "#241773",
			"BUF": "#00338D",
			"CAR": "#0085CA",
			"CHI": "#0B162A",
			"CIN": "#FB4F14",
			"CLE": "#FF3C00",
			"DAL": "#041E42",
			"DEN": "#FB4F14",
			"DET": "#0076B6",
			"GB": "#203731",
			"HOU": "#03202F",
			"IND": "#002C5F",
			"JAX": "#006778",
			"KC": "#E31837",
			"LAC": "#0073CF",
			"LA": "#003594",      // Rams use 'LA' from teamNameMapping
			"LV": "#000000",
			"MIA": "#008E97",
			"MIN": "#4F2683",
			"NE": "#002244",
			"NO": "#D3BC8D",
			"NYG": "#0B2265",
			"NYJ": "#125740",
			"PHI": "#004C54",
			"PIT": "#FFB612",
			"SEA": "#002244",
			"SF": "#AA0000",
			"TB": "#D50A0A",
			"TEN": "#0C2340",
			"WAS": "#5A1414",
			// Common full names (dev/demo fallbacks)
			"Kansas City Chiefs": "#E31837",
			"New York Giants": "#0B2265",
			"Detroit Lions": "#0076B6",
			"Baltimore Ravens": "#241773",
			"Philadelphia Eagles": "#004C54",
			"Dallas Cowboys": "#041E42",
			"Buffalo Bills": "#00338D",
			"Miami Dolphins": "#008E97",
			"San Francisco 49ers": "#AA0000",
			"Seattle Seahawks": "#002244",
			"Green Bay Packers": "#203731",
			"Minnesota Vikings": "#4F2683"
		};
		const rows = root.querySelectorAll('.aglive-game-row');
		rows.forEach((row, idx) => {
			// find game for this row
			const game = (this.gamesData && this.gamesData[idx]) || null;
			// remove old bars and connectors
			row.querySelectorAll('.aglive-dd-pos-bar').forEach((b) => b.remove());
			row.querySelectorAll('.aglive-redzone-connector').forEach((b) => b.remove());
			const oldMid = row.querySelector('.aglive-mid-bar');
			if (oldMid) oldMid.remove();

			const rowRect = row.getBoundingClientRect();
			const awayLogoCell = row.children[1];
			const homeLogoCell = row.children[5];
			if (!awayLogoCell || !homeLogoCell) return;
			const awayLogoRect = awayLogoCell.getBoundingClientRect();
			const homeLogoRect = homeLogoCell.getBoundingClientRect();
			const awayCenterX = awayLogoRect.left + awayLogoRect.width / 2;
			const homeCenterX = homeLogoRect.left + homeLogoRect.width / 2;

			// Mid background bar from logo center to logo center (60% height)
			const mid = document.createElement('div');
			mid.className = 'aglive-mid-bar';
			mid.style.position = 'absolute';
			mid.style.top = '50%';
			mid.style.height = '60%';
			mid.style.transform = 'translateY(-50%)';
			mid.style.pointerEvents = 'none';
			mid.style.zIndex = '-1';
			const left = awayCenterX - rowRect.left;
			const width = Math.max(0, homeCenterX - awayCenterX);
			mid.style.left = `${left}px`;
			mid.style.width = `${width}px`;
			mid.style.background = 'rgba(255,255,255,0.08)';
			row.appendChild(mid);

			// D&D bar for LIVE with text; no record bars for FINAL
			if (!game) return;
			const teamColor = TEAM_COLORS[game.ballPossession] || 'rgba(255,255,255,0.12)';
			const extra = 16;
			const createBar = (startX, endX, color) => {
				const bar = document.createElement('div');
				bar.className = 'aglive-dd-pos-bar';
				bar.style.position = 'absolute';
				bar.style.top = '50%';
				bar.style.height = '60%';
				bar.style.transform = 'translateY(-50%)';
				bar.style.pointerEvents = 'none';
				bar.style.zIndex = '0';
				const leftLocal = Math.min(startX, endX) - rowRect.left;
				const widthLocal = Math.abs(endX - startX);
				bar.style.left = `${leftLocal}px`;
				bar.style.width = `${widthLocal}px`;
				bar.style.background = color;
				row.appendChild(bar);
			};

			const createRedZoneConnector = (scoreCell, fromLeft, toX, color) => {
				if (!scoreCell) return;
				const rect = scoreCell.getBoundingClientRect();
				// Place line exactly at the bottom of the mid background bar (60% tall, centered)
				const barBottomY = rowRect.top + (rowRect.height * 0.8);
				const lineThickness = 3;
				const lineTop = barBottomY - lineThickness; // align with bottom edge
				const startX = fromLeft ? rect.left : rect.right;
				const endX = toX;
				const line = document.createElement('div');
				line.className = 'aglive-redzone-connector';
				line.style.position = 'absolute';
				line.style.left = `${Math.min(startX, endX) - rowRect.left}px`;
				line.style.width = `${Math.abs(endX - startX)}px`;
				line.style.top = `${lineTop - rowRect.top}px`;
				line.style.height = `${lineThickness}px`;
				line.style.background = color || '#ff0000';
				line.style.zIndex = '1';
				row.appendChild(line);
			};

			const ddAway = row.children[0];
			const ddHome = row.children[6];
			if (game.status === 'LIVE' && game.ballPossession === game.awayTeam && ddAway && ddAway.textContent) {
				const textEl = ddAway.firstElementChild && ddAway.firstElementChild.classList.contains('aglive-dd-text') ? ddAway.firstElementChild : null;
				let textRect;
				if (textEl) {
					textRect = textEl.getBoundingClientRect();
				} else {
					// wrap text to measure
					const span = document.createElement('span');
					span.className = 'aglive-dd-text';
					span.textContent = ddAway.textContent;
					ddAway.textContent = '';
					ddAway.appendChild(span);
					textRect = span.getBoundingClientRect();
				}
				createBar(awayCenterX, textRect.left - extra, teamColor);
				if (game.inRedZone) {
					// connect from away score cell right edge to bar start (textRect.left - extra)
					const scoreAwayCell = row.children[2];
					createRedZoneConnector(scoreAwayCell, false, textRect.left - extra, '#ff0000');
				} else {
					// draw neutral connector for possession outside red zone
					const scoreAwayCell = row.children[2];
					createRedZoneConnector(scoreAwayCell, false, textRect.left - extra, '#444444');
				}
			} else if (game.status === 'LIVE' && game.ballPossession === game.homeTeam && ddHome && ddHome.textContent) {
				const textEl = ddHome.firstElementChild && ddHome.firstElementChild.classList.contains('aglive-dd-text') ? ddHome.firstElementChild : null;
				let textRect;
				if (textEl) {
					textRect = textEl.getBoundingClientRect();
				} else {
					const span = document.createElement('span');
					span.className = 'aglive-dd-text';
					span.textContent = ddHome.textContent;
					ddHome.textContent = '';
					ddHome.appendChild(span);
					textRect = span.getBoundingClientRect();
				}
				createBar(homeCenterX, textRect.right + extra, teamColor);
				if (game.inRedZone) {
					// connect from home score cell left edge to bar end (textRect.right + extra)
					const scoreHomeCell = row.children[4];
					createRedZoneConnector(scoreHomeCell, true, textRect.right + extra, '#ff0000');
				} else {
					// neutral connector outside red zone
					const scoreHomeCell = row.children[4];
					createRedZoneConnector(scoreHomeCell, true, textRect.right + extra, '#444444');
				}
			} else if (game.status === 'LIVE' && ddAway && ddAway.textContent) {
				const span = document.createElement('span');
				span.className = 'aglive-dd-text';
				span.textContent = ddAway.textContent;
				ddAway.textContent = '';
				ddAway.appendChild(span);
				const textRect = span.getBoundingClientRect();
				createBar(awayCenterX, textRect.left - extra, teamColor);
			}

			// For FINAL games, place colored circles behind winner and loser scores
			if (game && game.status === 'FINAL') {
				const scoreAwayCell = row.children[2];
				const scoreHomeCell = row.children[4];
				const awayColorHex = TEAM_COLORS[game.awayTeam] || '#FFFFFF';
				const homeColorHex = TEAM_COLORS[game.homeTeam] || '#FFFFFF';
				const hexToRgba = (hex, a) => {
					const h = hex.replace('#','');
					const r = parseInt(h.substring(0,2),16);
					const g = parseInt(h.substring(2,4),16);
					const b = parseInt(h.substring(4,6),16);
					return `rgba(${r}, ${g}, ${b}, ${a})`;
				};
                const baseDiameter = Math.floor(rowRect.height * 0.4); // 40% of row height (half size)
                const createCircle = (centerX, color, alpha, diam = baseDiameter, glow = false) => {
					const c = document.createElement('div');
					c.className = 'aglive-score-circle';
					c.style.position = 'absolute';
					c.style.top = '50%';
					c.style.width = `${diam}px`;
					c.style.height = `${diam}px`;
					c.style.transform = 'translate(-50%, -50%)';
					c.style.left = `${centerX - rowRect.left}px`;
					c.style.borderRadius = '50%';
					c.style.background = hexToRgba(color, alpha);
                    c.style.boxShadow = glow ? '0 0 6px 2px rgba(255,255,255,0.4)' : 'none';
					c.style.zIndex = '0';
					row.appendChild(c);
				};
				const awayScore = Number(game.awayScore || 0);
				const homeScore = Number(game.homeScore || 0);
				const awayCenterXScore = scoreAwayCell ? (scoreAwayCell.getBoundingClientRect().left + scoreAwayCell.getBoundingClientRect().width / 2) : awayCenterX;
				const homeCenterXScore = scoreHomeCell ? (scoreHomeCell.getBoundingClientRect().left + scoreHomeCell.getBoundingClientRect().width / 2) : homeCenterX;
				const winnerDiameter = Math.floor(baseDiameter * 1.2); // 2x size for winner
                if (awayScore > homeScore) {
                    createCircle(awayCenterXScore, awayColorHex, 1, winnerDiameter, true);
                    createCircle(homeCenterXScore, homeColorHex, 0.1, baseDiameter, false);
                } else if (homeScore > awayScore) {
                    createCircle(homeCenterXScore, homeColorHex, 1, winnerDiameter, true);
                    createCircle(awayCenterXScore, awayColorHex, 0.1, baseDiameter, false);
				} else {
                    // tie: both low opacity, base size (no glow)
                    createCircle(awayCenterXScore, awayColorHex, 0.3, baseDiameter, false);
                    createCircle(homeCenterXScore, homeColorHex, 0.3, baseDiameter, false);
				}
			}
		});
	},

	scheduleBarLayout: function() {
		// Allow MagicMirror to animate/insert DOM, then compute
		window.requestAnimationFrame(() => {
			setTimeout(() => this.layoutBars(), this.config.animationSpeed + 50);
		});
	}
});