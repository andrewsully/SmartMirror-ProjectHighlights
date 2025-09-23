Module.register("MMM-EaglesScoreboard", {
    defaults: {
        updateInterval: 2 * 60 * 1000, // 2 minutes
        initialLoadDelay: 10 * 1000, // 10 second initial load delay
        viewStyle: 'smallLogos', // Start with smaller logos
        colored: true,
        showLocalBroadcasts: true,
        localMarkets: ['PHI'],
        showPlayoffStatus: true,
        rolloverHours: 72, // keep showing last game for 3 days
        alwaysShowToday: true, // show upcoming game even during rollover
    },

    start: function() {
        console.log("Starting module: " + this.name);
        this.scores = [];
        this.isLoaded = false;
        
        // Send initial request after delay
        setTimeout(() => {
            this.sendSocketNotification('MMM-EAGLES-SCORES-REQUEST', {
                instanceId: this.identifier,
                league: 'NFL'
            });
        }, this.config.initialLoadDelay);

        // Schedule updates
        setInterval(() => {
            this.sendSocketNotification('MMM-EAGLES-SCORES-REQUEST', {
                instanceId: this.identifier,
                league: 'NFL'
            });
        }, this.config.updateInterval);
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "eagles-scoreboard-wrapper";
        
        if (!this.isLoaded) {
            wrapper.innerHTML = '<div class="loading">Loading Eagles games...</div>';
            return wrapper;
        }

        if (this.scores.length === 0) {
            wrapper.innerHTML = '<div class="no-games">No Eagles games found</div>';
            return wrapper;
        }

        // Create title
        const title = document.createElement("div");
        title.className = "eagles-title";
        title.innerHTML = "Philadelphia Eagles";
        wrapper.appendChild(title);

        // Create scoreboard content
        const content = document.createElement("div");
        content.className = "eagles-content";
        
        this.scores.forEach(game => {
            const gameElement = this.createGameElement(game);
            content.appendChild(gameElement);
        });
        
        wrapper.appendChild(content);
        return wrapper;
    },

    createGameElement: function(game) {
        const gameDiv = document.createElement("div");
        gameDiv.className = `eagles-game ${this.config.viewStyle}`;
        
        // Add game state classes
        if (game.gameMode === 1) {
            gameDiv.classList.add('in-progress');
        } else if (game.gameMode === 2) {
            gameDiv.classList.add('final');
        }
        
        if (this.config.colored) {
            gameDiv.classList.add('colored');
        }

        // Determine winner
        if (game.gameMode === 2) { // Final game
            if (game.hScore > game.vScore) {
                gameDiv.classList.add('winner-h');
            } else if (game.vScore > game.hScore) {
                gameDiv.classList.add('winner-v');
            } else {
                gameDiv.classList.add('tie');
            }
        }

        // Create team elements
        const awayTeam = this.createTeamElement(game.vTeam, game.vScore, 'visitor');
        const homeTeam = this.createTeamElement(game.hTeam, game.hScore, 'home');
        
        // Create status element
        const status = document.createElement("div");
        status.className = "game-status";
        status.innerHTML = game.status ? game.status[0] : 'TBD';
        
        // Create vs element
        const vs = document.createElement("div");
        vs.className = "vs";
        vs.innerHTML = "vs";
        
        // Assemble the game
        gameDiv.appendChild(awayTeam);
        gameDiv.appendChild(vs);
        gameDiv.appendChild(homeTeam);
        gameDiv.appendChild(status);
        
        return gameDiv;
    },

    createTeamElement: function(teamCode, score, homeAway) {
        const teamDiv = document.createElement("div");
        teamDiv.className = `team ${homeAway}`;
        
        // Team code
        const teamCodeEl = document.createElement("div");
        teamCodeEl.className = `team-code ${homeAway}`;
        teamCodeEl.innerHTML = teamCode;
        
        // Score
        const scoreEl = document.createElement("div");
        scoreEl.className = `score ${homeAway}`;
        scoreEl.innerHTML = score || '0';
        
        teamDiv.appendChild(teamCodeEl);
        teamDiv.appendChild(scoreEl);
        
        return teamDiv;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'MMM-EAGLES-SCORES-UPDATE' && payload.instanceId === this.identifier) {
            this.scores = payload.scores || [];
            this.isLoaded = true;
            this.updateDom();
        }
    }
});
