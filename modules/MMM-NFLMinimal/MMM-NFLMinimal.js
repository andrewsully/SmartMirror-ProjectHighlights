/* global Module Log moment config */

/* Magic Mirror
 * Module: MMM-NFLMinimal
 * 
 * Based on MMM-NFL by fewieden
 * Minimal display - just logos, scores, and possession
 * MIT Licensed.
 */

Module.register('MMM-NFLMinimal', {
    // Copy exact same structure as MMM-NFL
    modes: {
        PRE: 'Preseason',
        REG: 'Regular-Season',
        POST: 'Post-Season',
        OFF: 'Offseason',
    },

    details: {
        season: new Date().getFullYear(),
        stage: 'REG'
    },

    states: {
        1: '1ST_QUARTER',
        2: '2ND_QUARTER',
        3: '3RD_QUARTER',
        4: '4TH_QUARTER',
        halftime: 'HALF_TIME',
        overtime: 'OVER_TIME',
        final: 'FINAL',
        'final-overtime': 'FINAL_OVERTIME',
        pregame: 'UPCOMING'
    },

    defaults: {
        colored: false,
        focus_on: false,
        reloadInterval: 30 * 60 * 1000, // every 30 minutes
        reverseTeams: false,
        showPossession: true, // Show possession indicators
        showRedZone: true, // Show red zone indicators
        showDownDistance: true, // Show down & distance
    },

    getScripts() {
        return ['moment.js'];
    },

    getStyles() {
        return ['MMM-NFLMinimal.css'];
    },

    findTeamInScores(team) {
        return this.scores.find(m => team === m.homeTeam || team === m.awayTeam);
    },

    getFocusedTeamsWithByeWeeks() {
        if (!Array.isArray(this.config.focus_on) || !Array.isArray(this.scores)) {
            return [];
        }
        return this.config.focus_on.filter(team => !this.findTeamInScores(team));
    },

    getFilteredScores() {
        if (!Array.isArray(this.config.focus_on) || !Array.isArray(this.scores)) {
            return this.scores;
        }
        return this.scores.filter(m => this.config.focus_on.includes(m.homeTeam) || this.config.focus_on.includes(m.awayTeam));
    },


    // Custom minimal DOM generation
    getDom() {
        const wrapper = document.createElement('div');
        wrapper.className = 'MMM-NFLMinimal';

        if (!this.scores || this.scores.length === 0) {
            wrapper.innerHTML = '<div class="loading">Loading NFL scores...</div>';
            return wrapper;
        }


        // Get filtered scores and make even number
        let games = this.getFilteredScores();
        if (games.length % 2 !== 0) {
            games = games.slice(0, -1); // Remove last game if odd number
        }

        // Split into two columns
        const halfPoint = Math.ceil(games.length / 2);
        const leftGames = games.slice(0, halfPoint);
        const rightGames = games.slice(halfPoint);

        // Create two-column container
        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'columns-container';

        // Left column
        const leftColumn = document.createElement('div');
        leftColumn.className = 'games-column left';
        leftGames.forEach(game => {
            leftColumn.appendChild(this.createGameRow(game));
        });

        // Right column
        const rightColumn = document.createElement('div');
        rightColumn.className = 'games-column right';
        rightGames.forEach(game => {
            rightColumn.appendChild(this.createGameRow(game));
        });

        columnsContainer.appendChild(leftColumn);
        columnsContainer.appendChild(rightColumn);
        wrapper.appendChild(columnsContainer);

        return wrapper;
    },

    createGameRow(game) {
        const gameRow = document.createElement('div');
        gameRow.className = 'game-row';

        // Add background rectangle as a dedicated element
        const backgroundRect = document.createElement('div');
        backgroundRect.className = 'matchup-background';
        gameRow.appendChild(backgroundRect);

        // Left side container (away team)
        const leftSide = document.createElement('div');
        leftSide.className = 'team-side left';

        // Away team score (moved to left of logo)
        const awayScore = document.createElement('span');
        awayScore.className = 'team-score';
        // Hide score if game hasn't started OR if game is final
        if (game.status === 'pregame' || (!game.awayScore && !game.homeScore && !game.remainingTime) ||
            game.status === 'FINAL' || game.status === 'final' || game.status === 'final-overtime') {
            awayScore.style.opacity = '0'; // Hide scores for upcoming and final games
        }
        awayScore.textContent = game.awayScore || 0;
        
        // Away team logo
        const awayLogo = document.createElement('img');
        awayLogo.className = 'team-logo';
        awayLogo.src = game.awayLogo || `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${game.awayTeam.toLowerCase()}.png`;
        awayLogo.alt = game.awayTeam;
        
        // Style teams based on final game results
        if (game.status === 'FINAL' || game.status === 'final' || game.status === 'final-overtime') {
            if (game.awayScore < game.homeScore) {
                // Away team lost
                awayScore.classList.add('losing-score');
                awayLogo.classList.add('losing-logo');
            } else if (game.awayScore > game.homeScore) {
                // Away team won
                awayScore.classList.add('winning-score');
                awayLogo.classList.add('winning-logo');
            }
        }
        
        leftSide.appendChild(awayScore);
        leftSide.appendChild(awayLogo);

        // Away team possession indicator (moved to right of logo)
        const awayPossession = document.createElement('span');
        awayPossession.className = 'possession-indicator';
        if (this.config.showPossession && game.ballPossession === game.awayTeam) {
            // Red dot if in red zone, green if not
            awayPossession.innerHTML = '●';
            awayPossession.classList.add(game.inRedZone ? 'redzone' : 'normal');
        } else {
            awayPossession.innerHTML = '&nbsp;'; // Reserve space
        }
        leftSide.appendChild(awayPossession);

        gameRow.appendChild(leftSide);

        // Center container (clock and down/distance)
        const centerContainer = document.createElement('div');
        centerContainer.className = 'center-info';

        // Handle different game states in center
        if (game.status === 'FINAL' || game.status === 'final' || game.status === 'final-overtime') {
            // Final game - show score with different opacity for losing team
            const topInfo = document.createElement('div');
            topInfo.className = 'top-info final-score';
            
            // Create separate spans for each score to control opacity
            const awayScoreSpan = document.createElement('span');
            awayScoreSpan.textContent = game.awayScore || 0;
            
            const separatorSpan = document.createElement('span');
            separatorSpan.textContent = ' - ';
            
            const homeScoreSpan = document.createElement('span');
            homeScoreSpan.textContent = game.homeScore || 0;
            
            // Apply CSS classes based on win/loss
            if (game.awayScore < game.homeScore) {
                // Away team lost, home team won
                awayScoreSpan.className = 'losing-score-number';
                homeScoreSpan.className = 'winning-score-number';
                separatorSpan.className += ' losing-color'; // Separator matches losing team
            } else if (game.homeScore < game.awayScore) {
                // Home team lost, away team won
                homeScoreSpan.className = 'losing-score-number';
                awayScoreSpan.className = 'winning-score-number';
                separatorSpan.className += ' losing-color'; // Separator matches losing team
            } else {
                // Tie game
                awayScoreSpan.className = 'tie-score-number';
                homeScoreSpan.className = 'tie-score-number';
                separatorSpan.className += ' tie-color';
            }
            
            topInfo.appendChild(awayScoreSpan);
            topInfo.appendChild(separatorSpan);
            topInfo.appendChild(homeScoreSpan);
            centerContainer.appendChild(topInfo);
            
            const bottomInfo = document.createElement('div');
            bottomInfo.className = 'bottom-info final-text';
            bottomInfo.textContent = 'FINAL';
            centerContainer.appendChild(bottomInfo);
            
            // Add greyscale class to logos for final games
            gameRow.classList.add('final-game');
        } else if (game.remainingTime && game.status !== 'pregame') {
            // Live game - show clock and down/distance
            const topInfo = document.createElement('div');
            topInfo.className = 'top-info game-clock';
            topInfo.textContent = game.remainingTime;
            centerContainer.appendChild(topInfo);

            const bottomInfo = document.createElement('div');
            bottomInfo.className = 'bottom-info';
            if (this.config.showDownDistance && game.downDistance && game.ballPossession) {
                bottomInfo.textContent = game.downDistance;
                bottomInfo.classList.add('down-distance');
            } else {
                bottomInfo.innerHTML = '&nbsp;';
            }
            centerContainer.appendChild(bottomInfo);
        } else {
            // Upcoming game - show day and time
            const topInfo = document.createElement('div');
            topInfo.className = 'top-info game-day';
            const gameDate = new Date(game.timestamp);
            const dayName = gameDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            topInfo.textContent = dayName;
            centerContainer.appendChild(topInfo);

            const bottomInfo = document.createElement('div');
            bottomInfo.className = 'bottom-info game-time';
            const hour = gameDate.getHours();
            const period = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            bottomInfo.textContent = `${displayHour}${period.toLowerCase()}`;
            centerContainer.appendChild(bottomInfo);
        }

        gameRow.appendChild(centerContainer);

        // Right side container (home team)
        const rightSide = document.createElement('div');
        rightSide.className = 'team-side right';

        // Home team possession indicator (moved to left of logo)
        const homePossession = document.createElement('span');
        homePossession.className = 'possession-indicator';
        if (this.config.showPossession && game.ballPossession === game.homeTeam) {
            // Red dot if in red zone, green if not
            homePossession.innerHTML = '●';
            homePossession.classList.add(game.inRedZone ? 'redzone' : 'normal');
        } else {
            homePossession.innerHTML = '&nbsp;'; // Reserve space
        }
        rightSide.appendChild(homePossession);

        // Home team logo
        const homeLogo = document.createElement('img');
        homeLogo.className = 'team-logo';
        homeLogo.src = game.homeLogo || `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${game.homeTeam.toLowerCase()}.png`;
        homeLogo.alt = game.homeTeam;

        // Home team score (moved to right of logo)
        const homeScore = document.createElement('span');
        homeScore.className = 'team-score';
        // Hide score if game hasn't started OR if game is final
        if (game.status === 'pregame' || (!game.awayScore && !game.homeScore && !game.remainingTime) ||
            game.status === 'FINAL' || game.status === 'final' || game.status === 'final-overtime') {
            homeScore.style.opacity = '0'; // Hide scores for upcoming and final games
        }
        homeScore.textContent = game.homeScore || 0;
        
        // Style teams based on final game results
        if (game.status === 'FINAL' || game.status === 'final' || game.status === 'final-overtime') {
            if (game.homeScore < game.awayScore) {
                // Home team lost
                homeScore.classList.add('losing-score');
                homeLogo.classList.add('losing-logo');
            } else if (game.homeScore > game.awayScore) {
                // Home team won
                homeScore.classList.add('winning-score');
                homeLogo.classList.add('winning-logo');
            }
        }
        
        rightSide.appendChild(homeLogo);
        rightSide.appendChild(homeScore);

        gameRow.appendChild(rightSide);

        return gameRow;
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.sendSocketNotification('CONFIG', this.config);
        moment.locale(config.locale);
    },

    suspend() {
        this.sendSocketNotification('SUSPEND', this.config);
    },

    resume() {
        this.sendSocketNotification('CONFIG', this.config);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'SCORES') {
            this.scores = payload.scores;
            this.details = payload.details;
            this.updateDom(300);
        }
    }
});
