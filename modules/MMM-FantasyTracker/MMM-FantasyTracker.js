/* MagicMirror²
 * Module: MMM-FantasyTracker
 * 
 * Fantasy Football Live Matchup Tracker
 * Displays real-time ESPN fantasy football matchup data
 * 
 * By Andrew Sullivan
 * Based on ESPN API integration
 */

Module.register("MMM-FantasyTracker", {
    
    // Default module config
    defaults: {
        updateInterval: 5 * 60 * 1000, // 5 minutes - more frequent updates for live games
        initialLoadDelay: 13 * 1000, // 13 seconds
        leagueId: null, // Must be set in config
        year: 2025,
        username: null, // Must be set in config
        animationSpeed: 2000,
        retryDelay: 10 * 1000, // 10 seconds between retries
        maxRetries: 3,
        maxWidth: "1200px",
        transparentBackground: true, // Set to true to remove dark background
        clownMode: false // Set to true to add clown wigs to opponent players
    },

    // Define required scripts
    getScripts: function() {
        return [];
    },

    // Define required styles
    getStyles: function() {
        return ["MMM-FantasyTracker.css"];
    },

    // Override socket notification handler
    socketNotificationReceived: function(notification, payload) {
        if (notification === "FANTASY_MATCHUP_DATA" && payload.identifier === this.identifier) {
            this.processMatchupData(payload.data);
        } else if (notification === "FANTASY_DATA_ERROR" && payload.identifier === this.identifier) {
            this.processError(payload.error);
        }
    },

    // Handle notifications from other modules (like MMM-ClownModeHelper)
    notificationReceived: function(notification, payload, sender) {
        if (notification === "CLOWN_MODE_CHANGED") {
            // Update clown mode setting and refresh display
            this.config.clownMode = payload.active;
            this.updateDom(this.config.animationSpeed);
            Log.info("MMM-FantasyTracker: Clown mode " + (payload.active ? "activated" : "deactivated"));
        }
    },

    // Start the module
    start: function() {
        Log.info("Starting module: " + this.name);
        this.matchupData = null;
        this.loaded = false;
        this.error = null;
        this.retryCount = 0;
        
        // Validate required config
        if (!this.config.leagueId || !this.config.username) {
            this.error = "Missing required config: leagueId and username must be set";
            this.loaded = true;
            this.updateDom();
            return;
        }
        
        // Send config to node helper after initial delay
        var self = this;
        setTimeout(function() {
            self.sendSocketNotification("GET_FANTASY_DATA", {
                config: self.config,
                identifier: self.identifier
            });
        }, this.config.initialLoadDelay);
        
        // Set up update timer
        this.scheduleUpdate();
    },

    // Schedule next update
    scheduleUpdate: function() {
        // Clear any existing interval to prevent multiple timers
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        var self = this;
        this.updateTimer = setInterval(function() {
            self.sendSocketNotification("GET_FANTASY_DATA", {
                config: self.config,
                identifier: self.identifier
            });
        }, this.config.updateInterval);
        
        console.log("MMM-FantasyTracker: Update scheduled every " + (this.config.updateInterval / 60000) + " minutes");
    },

    // Process matchup data from node helper
    processMatchupData: function(data) {
        this.matchupData = data;
        this.loaded = true;
        this.error = null;
        this.updateDom(this.config.animationSpeed);
        
        // Adjust score font size after DOM update
        setTimeout(() => {
            this.adjustScoreFontSize();
        }, this.config.animationSpeed + 100);
    },

    // Process error from node helper
    processError: function(error) {
        this.error = error;
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    // Generate DOM for the module
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "mmm-fantasy-tracker" + (this.config.transparentBackground ? " transparent-bg" : "");
        wrapper.style.maxWidth = this.config.maxWidth;

        if (!this.loaded) {
            wrapper.innerHTML = this.getLoadingContent();
            return wrapper;
        }

        if (this.error) {
            wrapper.innerHTML = this.getErrorContent();
            return wrapper;
        }

        if (!this.matchupData) {
            wrapper.innerHTML = this.getNoDataContent();
            return wrapper;
        }

        wrapper.innerHTML = this.getMatchupContent();
        return wrapper;
    },

    // Get loading content
    getLoadingContent: function() {
        return `
            <div class="matchup-container loading">
                <div class="loading-message">
                    <div class="loading-spinner">🏈</div>
                    <div>Loading fantasy matchup...</div>
                </div>
            </div>
        `;
    },

    // Get error content
    getErrorContent: function() {
        return `
            <div class="matchup-container error">
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <div>Error loading fantasy data</div>
                    <div class="error-details">${this.error}</div>
                </div>
            </div>
        `;
    },

    // Get no data content
    getNoDataContent: function() {
        return `
            <div class="matchup-container no-data">
                <div class="no-data-message">
                    <div>No matchup data available</div>
                </div>
            </div>
        `;
    },

    // Get main matchup content
    getMatchupContent: function() {
        const data = this.matchupData;
        const yourTeam = data.your_team;
        const opponent = data.opponent;
        
        return `
            <div class="matchup-container">
                ${this.getMatchupHeader(yourTeam, opponent)}
                ${this.getLineupContainer(yourTeam, opponent)}
                ${this.getRefreshInfo()}
            </div>
        `;
    },

    // Get matchup header
    getMatchupHeader: function(yourTeam, opponent) {
        // Calculate win probability
        const yourWinProb = this.calculateWinProbability(yourTeam, opponent);
        const oppWinProb = 100 - yourWinProb;
        
        return `
            <div class="matchup-header">
                <div class="team-info" id="awayTeam">
                    ${this.getTeamLogo(opponent, false)}
                    <div class="team-details">
                        <h2>${opponent.name}</h2>
                        <div class="owner">${opponent.record.wins}-${opponent.record.losses} <span class="standing-rank">(${this.getOrdinalStanding(opponent.standing)})</span></div>
                    </div>
                </div>
                
                <div class="score-display">
                    <div class="current-score" data-opponent-score="${Math.round(opponent.score)}" data-your-score="${Math.round(yourTeam.score)}">
                        <span>${Math.round(opponent.score)}</span> - <span>${Math.round(yourTeam.score)}</span>
                    </div>
                    <div class="win-probability">
                        <div class="win-bar" style="width: ${yourWinProb}%;"></div>
                    </div>
                    <div class="probability-text">
                        <span>${oppWinProb}</span>% chance to win <span>${yourWinProb}</span>%
                    </div>
                </div>
                
                <div class="team-info" id="homeTeam">
                    <div class="team-details team-details-right">
                        <h2>${yourTeam.name}</h2>
                        <div class="owner">${yourTeam.record.wins}-${yourTeam.record.losses} <span class="standing-rank">(${this.getOrdinalStanding(yourTeam.standing)})</span></div>
                    </div>
                    ${this.getTeamLogo(yourTeam, true)}
                </div>
            </div>
        `;
    },

    // Get team logo HTML
    getTeamLogo: function(team, isUserTeam = false) {
        // If clown mode is enabled and this is the OPPONENT's team, show clown image
        if (this.config.clownMode && !isUserTeam) {
            return `
                <div class="team-logo">
                    <img src="modules/MMM-FantasyTracker/clown-final.jpg" alt="Clown" class="team-logo-img clown-typing-img">
                </div>
            `;
        }
        
        const primaryPlayer = this.findPrimaryPlayer(team.lineup);
        
        if (team.logo_url) {
            return `
                <div class="team-logo">
                    <img src="${team.logo_url}" alt="${team.name}" class="team-logo-img" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="team-logo-fallback" style="display:none;">${this.getTeamInitials(team.name)}</div>
                </div>
            `;
        } else if (primaryPlayer && primaryPlayer.pro_team) {
            const teamLogoUrl = `https://a.espncdn.com/i/teamlogos/nfl/500/${primaryPlayer.pro_team.toLowerCase()}.png`;
            return `
                <div class="team-logo">
                    <img src="${teamLogoUrl}" alt="${primaryPlayer.pro_team}" class="team-logo-img"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="team-logo-fallback" style="display:none;">${this.getTeamInitials(team.name)}</div>
                </div>
            `;
        } else {
            return `<div class="team-logo"><div class="team-logo-fallback">${this.getTeamInitials(team.name)}</div></div>`;
        }
    },

    // Get lineup container
    getLineupContainer: function(yourTeam, opponent) {
        return `
            <div class="lineup-container">
                <div class="team-lineup">
                    <div class="lineup-header">Anthony's Team</div>
                    <div class="lineup-content">
                        ${this.getPlayerRows(opponent.lineup, true)}
                        ${this.getTeamStats(opponent)}
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <div class="team-lineup">
                    <div class="lineup-header">Your Team</div>
                    <div class="lineup-content">
                        ${this.getPlayerRows(yourTeam.lineup, false)}
                        ${this.getTeamStats(yourTeam)}
                    </div>
                </div>
            </div>
        `;
    },

    // Get player rows HTML
    getPlayerRows: function(lineup, isOpponent = false) {
        const starters = lineup.filter(player => 
            player.slot_position !== 'BE' && player.slot_position !== 'IR'
        );
        
        // Sort by position importance
        const positionOrder = ['QB', 'RB', 'WR', 'TE', 'RB/WR/TE', 'D/ST', 'K'];
        starters.sort((a, b) => {
            const aIndex = positionOrder.indexOf(a.slot_position);
            const bIndex = positionOrder.indexOf(b.slot_position);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
        
        return starters.map(player => this.getPlayerRow(player, isOpponent)).join('');
    },

    // Get individual player row
    getPlayerRow: function(player, isOpponent = false) {
        const statusInfo = this.getPlayerStatus(player);
        const scoreInfo = this.getPlayerScore(player);
        const imageInfo = this.getPlayerImage(player);
        
        // Add completed class for players who have finished their games
        const completedClass = player.game_played === 100 ? ' completed' : '';
        
        // Add live class for players who are currently playing
        const isGameComplete = player.game_played === 100;
        const hasRealPoints = player.points > 0;
        const isGameLive = player.game_played > 0 && player.game_played < 100;
        const liveClass = (isGameLive || hasRealPoints) && !isGameComplete ? ' live' : '';
        
        // Add clown class for opponent players when clownMode is enabled (but not for D/ST)
        const isDST = player.slot_position === 'D/ST' || (player.name && player.name.includes('D/ST'));
        const shouldShowClown = this.config.clownMode && isOpponent && !isDST;
        const clownClass = shouldShowClown ? ' clown-mode' : '';
        
        // Add team color class for player avatar
        const teamColorClass = this.getTeamColorClass(player.pro_team);
        
        return `
            <div class="player-row${completedClass}${liveClass}">
                <div class="player-avatar${clownClass} ${teamColorClass}">
                    ${imageInfo.html}
                </div>
                <div class="player-info">
                    <div class="player-name">${this.formatPlayerName(player.name)}</div>
                    <div class="player-details">${player.pro_team} vs ${player.pro_opponent || 'BYE'}</div>
                </div>
                <div class="player-position">${this.formatSlotPosition(player.slot_position)}</div>
                <div class="${scoreInfo.class}">${scoreInfo.display}</div>
                <div class="game-status ${statusInfo.class}">${statusInfo.icon}</div>
                ${shouldShowClown ? '<div class="clown-wig-overlay"></div>' : ''}
            </div>
        `;
    },

    // Get team stats HTML
    getTeamStats: function(team) {
        const starters = team.lineup.filter(player => 
            player.slot_position !== 'BE' && player.slot_position !== 'IR'
        );
        
        // Use improved logic for counting live games
        const inPlay = starters.filter(player => {
            const isGameLive = player.game_played > 0 && player.game_played < 100;
            const hasRealPoints = player.points > 0;
            return isGameLive || hasRealPoints;
        }).length;
        
        const toPlay = starters.filter(player => {
            const isGameComplete = player.game_played === 100;
            const isGameLive = player.game_played > 0 && player.game_played < 100;
            const hasRealPoints = player.points > 0;
            return !isGameComplete && !isGameLive && !hasRealPoints;
        }).length;
        
        const projectedTotal = team.projected || 0;
        
        return `
            <div class="team-stats player-row">
                <div class="player-avatar"></div>
                <div class="player-info">
                    <div class="player-name">In Play: ${inPlay} | To Play: ${toPlay}</div>
                </div>
                <div class="player-position"></div>
                <div class="player-score projected">${projectedTotal.toFixed(1)}</div>
                <div class="game-status"></div>
            </div>
        `;
    },

    // Get refresh info
    getRefreshInfo: function() {
        const now = new Date();
        return `
            <div class="refresh-info">
                Last updated: ${now.toLocaleTimeString()} | 
                Auto-refresh: Enabled
            </div>
        `;
    },

    // Utility functions (converted from standalone JS)
    calculateWinProbability: function(yourTeam, opponent) {
        if (yourTeam.projected && opponent.projected && (yourTeam.projected + opponent.projected) > 0) {
            const projectedTotal = yourTeam.projected + opponent.projected;
            return Math.max(5, Math.min(95, Math.round((yourTeam.projected / projectedTotal) * 100)));
        }
        return 50;
    },

    findPrimaryPlayer: function(lineup) {
        const qb = lineup.find(player => player.position === 'QB');
        if (qb) return qb;
        
        const activeStarters = lineup.filter(player => 
            player.slot_position !== 'BE' && player.slot_position !== 'IR'
        );
        
        return activeStarters.reduce((highest, player) => 
            player.points > highest.points ? player : highest, 
            activeStarters[0] || lineup[0]
        );
    },

    getOrdinalStanding: function(standing) {
        if (!standing) return '?';
        const num = parseInt(standing);
        const suffix = ['th', 'st', 'nd', 'rd'];
        const v = num % 100;
        return num + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
    },

    getTeamInitials: function(teamName) {
        const words = teamName.split(' ').filter(word => word.length > 0);
        if (words.length >= 2) {
            return words.slice(0, 2).map(word => word[0].toUpperCase()).join('');
        } else if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        return '🏈';
    },

    formatPlayerName: function(name) {
        // Remove redundant D/ST suffix for defense units
        let cleanName = name.replace(/ D\/ST$/, '');
        
        // Progressive name shortening based on length (more aggressive for buffer zone)
        const parts = cleanName.split(' ');
        
        // If short enough, use full name
        if (cleanName.length <= 13) {
            return cleanName;
        }
        
        // If medium length, use First Initial. Lastname
        if (parts.length >= 2 && cleanName.length <= 18) {
            return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
        }
        
        // If still too long, use just lastname
        if (parts.length >= 2 && cleanName.length > 18) {
            return parts[parts.length - 1]; // Last name only
        }
        
        // If single name is too long, truncate with ellipsis
        if (cleanName.length > 12) {
            return cleanName.substring(0, 10) + '...';
        }
        
        return cleanName;
    },

    formatSlotPosition: function(slotPosition) {
        const slotMap = {
            'RB/WR/TE': 'FLEX',
            'QB': 'QB', 'RB': 'RB', 'WR': 'WR', 'TE': 'TE',
            'K': 'K', 'D/ST': 'D/ST', 'BE': 'BENCH', 'IR': 'IR'
        };
        return slotMap[slotPosition] || slotPosition;
    },

    getPlayerStatus: function(player) {
        // Debug logging to see what data we're getting
        console.log(`MMM-FantasyTracker: Player ${player.name} - game_played: ${player.game_played}, points: ${player.points}, projected: ${player.projected_points}`);
        
        // More robust game status detection
        const isGameComplete = player.game_played === 100;
        const hasRealPoints = player.points > 0;
        const isGameLive = player.game_played > 0 && player.game_played < 100;
        
        // If player has real points, game should be live regardless of game_played value
        if (isGameComplete) {
            return { class: 'status-complete', icon: '✓' };
        } else if (isGameLive || hasRealPoints) {
            return { class: 'status-live', icon: 'LIVE' };
        } else {
            return { class: 'status-game-time', icon: this.formatGameTime(player.game_date) };
        }
    },

    getPlayerScore: function(player) {
        if (player.game_played === 100 || player.points > 0) {
            return { class: 'player-score', display: player.points.toFixed(1) };
        } else {
            return { class: 'player-score projected', display: (player.projected_points || 0).toFixed(1) };
        }
    },

    getPlayerImage: function(player) {
        if (player.position === 'D/ST') {
            const teamLogoUrl = `https://a.espncdn.com/i/teamlogos/nfl/500/${player.pro_team.toLowerCase()}.png`;
            return {
                html: `
                    <img src="${teamLogoUrl}" alt="${player.name}" class="player-headshot dst-logo"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="player-fallback" style="display:none;">${player.pro_team}</div>
                `
            };
        } else {
            const playerImageUrl = `https://a.espncdn.com/i/headshots/nfl/players/full/${player.player_id}.png`;
            return {
                html: `
                    <img src="${playerImageUrl}" alt="${player.name}" class="player-headshot"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="player-fallback" style="display:none;">${player.position}</div>
                `
            };
        }
    },

    formatGameTime: function(gameDate) {
        if (!gameDate) return '–';
        
        try {
            const date = new Date(gameDate);
            const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const dayAbbr = dayNames[date.getDay()];
            
            let hour = date.getHours();
            const minutes = date.getMinutes();
            
            if (minutes >= 30) hour += 1;
            
            let displayHour = hour;
            let ampm = 'AM';
            
            if (hour >= 12) {
                ampm = 'PM';
                if (hour > 12) displayHour = hour - 12;
            }
            if (hour === 0) displayHour = 12;
            
            return `${dayAbbr}<br>${displayHour}${ampm.toLowerCase()}`;
        } catch (error) {
            return '–';
        }
    },

    // Dynamically adjust score font size based on content width
    adjustScoreFontSize: function() {
        const scoreElement = document.querySelector('.mmm-fantasy-tracker .current-score');
        if (!scoreElement) return;
        
        const opponentScore = parseInt(scoreElement.dataset.opponentScore) || 0;
        const yourScore = parseInt(scoreElement.dataset.yourScore) || 0;
        
        // Calculate the total character width needed
        const totalChars = opponentScore.toString().length + yourScore.toString().length + 3; // +3 for " - "
        
        // Base font size calculation
        let fontSize = 48; // Default size
        
        // Adjust based on character count
        if (totalChars >= 8) { // 100-100 = 7 chars, so 8+ is very wide
            fontSize = 32;
        } else if (totalChars >= 6) { // 99-99 = 5 chars, so 6+ is wide
            fontSize = 40;
        } else if (totalChars >= 4) { // 9-9 = 3 chars, so 4+ is normal
            fontSize = 48;
        }
        
        // Apply the calculated font size
        scoreElement.style.fontSize = fontSize + 'px';
        
        // Log for debugging
        console.log(`MMM-FantasyTracker: Adjusted score font size to ${fontSize}px for scores ${opponentScore}-${yourScore} (${totalChars} chars)`);
    },

    // Get CSS class name for NFL team color
    getTeamColorClass: function(teamName) {
        if (!teamName) return '';
        
        // Map NFL team names to their CSS class names
        const teamMap = {
            'ARI': 'team-ARI', 'Arizona': 'team-ARI', 'Cardinals': 'team-ARI',
            'ATL': 'team-ATL', 'Atlanta': 'team-ATL', 'Falcons': 'team-ATL',
            'BAL': 'team-BAL', 'Baltimore': 'team-BAL', 'Ravens': 'team-BAL',
            'BUF': 'team-BUF', 'Buffalo': 'team-BUF', 'Bills': 'team-BUF',
            'CAR': 'team-CAR', 'Carolina': 'team-CAR', 'Panthers': 'team-CAR',
            'CHI': 'team-CHI', 'Chicago': 'team-CHI', 'Bears': 'team-CHI',
            'CIN': 'team-CIN', 'Cincinnati': 'team-CIN', 'Bengals': 'team-CIN',
            'CLE': 'team-CLE', 'Cleveland': 'team-CLE', 'Browns': 'team-CLE',
            'DAL': 'team-DAL', 'Dallas': 'team-DAL', 'Cowboys': 'team-DAL',
            'DEN': 'team-DEN', 'Denver': 'team-DEN', 'Broncos': 'team-DEN',
            'DET': 'team-DET', 'Detroit': 'team-DET', 'Lions': 'team-DET',
            'GB': 'team-GB', 'Green Bay': 'team-GB', 'Packers': 'team-GB',
            'HOU': 'team-HOU', 'Houston': 'team-HOU', 'Texans': 'team-HOU',
            'IND': 'team-IND', 'Indianapolis': 'team-IND', 'Colts': 'team-IND',
            'JAX': 'team-JAX', 'Jacksonville': 'team-JAX', 'Jaguars': 'team-JAX',
            'KC': 'team-KC', 'Kansas City': 'team-KC', 'Chiefs': 'team-KC',
            'LV': 'team-LV', 'Las Vegas': 'team-LV', 'Raiders': 'team-LV',
            'LAC': 'team-LAC', 'Los Angeles Chargers': 'team-LAC', 'Chargers': 'team-LAC',
            'LAR': 'team-LAR', 'Los Angeles Rams': 'team-LAR', 'Rams': 'team-LAR',
            'MIA': 'team-MIA', 'Miami': 'team-MIA', 'Dolphins': 'team-MIA',
            'MIN': 'team-MIN', 'Minnesota': 'team-MIN', 'Vikings': 'team-MIN',
            'NE': 'team-NE', 'New England': 'team-NE', 'Patriots': 'team-NE',
            'NO': 'team-NO', 'New Orleans': 'team-NO', 'Saints': 'team-NO',
            'NYG': 'team-NYG', 'New York Giants': 'team-NYG', 'Giants': 'team-NYG',
            'NYJ': 'team-NYJ', 'New York Jets': 'team-NYJ', 'Jets': 'team-NYJ',
            'PHI': 'team-PHI', 'Philadelphia': 'team-PHI', 'Eagles': 'team-PHI',
            'PIT': 'team-PIT', 'Pittsburgh': 'team-PIT', 'Steelers': 'team-PIT',
            'SF': 'team-SF', 'San Francisco': 'team-SF', '49ers': 'team-SF',
            'SEA': 'team-SEA', 'Seattle': 'team-SEA', 'Seahawks': 'team-SEA',
            'TB': 'team-TB', 'Tampa Bay': 'team-TB', 'Buccaneers': 'team-TB',
            'TEN': 'team-TEN', 'Tennessee': 'team-TEN', 'Titans': 'team-TEN',
            'WSH': 'team-WSH', 'Washington': 'team-WSH', 'Commanders': 'team-WSH'
        };
        
        // Try to find a match (case insensitive)
        const teamKey = Object.keys(teamMap).find(key => 
            key.toLowerCase() === teamName.toLowerCase()
        );
        
        return teamKey ? teamMap[teamKey] : '';
    }
});
