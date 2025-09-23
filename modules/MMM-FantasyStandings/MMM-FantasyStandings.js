/* global Module Log */

/* Magic Mirror
 * Module: MMM-FantasyStandings
 * 
 * Fantasy Football League Standings
 * MIT Licensed.
 */

Module.register('MMM-FantasyStandings', {
    defaults: {
        updateInterval: 24 * 60 * 60 * 1000, // Update once per day (24 hours)
        leagueId: null, // Set via environment variable
        year: 2025,
        username: null, // Set via environment variable
        showRotation: false, // No rotation needed
        animationSpeed: 0, // No animation
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.standings = null;
        this.showPlayoffPct = false;
        this.sendSocketNotification('CONFIG', this.config);
        
        // No rotation - just show points for consistently
    },

    getStyles() {
        return ['MMM-FantasyStandings.css'];
    },

    getDom() {
        const wrapper = document.createElement('div');
        wrapper.className = 'fantasy-standings';

        if (!this.standings) {
            wrapper.innerHTML = '<div class="loading">Loading standings...</div>';
            return wrapper;
        }

        // Create the standings table
        const table = document.createElement('table');
        table.className = 'standings-table';

        // Header row with split layout
        const headerRow = document.createElement('tr');
        headerRow.className = 'header-row';

        // Left side of header - empty as per test environment
        const leftSide = document.createElement('td');
        leftSide.className = 'left-side';
        // No content added to left side

        // Right side of header
        const rightSide = document.createElement('td');
        rightSide.className = 'right-side';
        
        const rightBottom = document.createElement('div');
        rightBottom.className = 'header-right-bottom';
        
        // Column headers
        const wHeader = document.createElement('div');
        wHeader.className = 'header-stat';
        wHeader.textContent = 'W';
        
        const lHeader = document.createElement('div');
        lHeader.className = 'header-stat';
        lHeader.textContent = 'L';
        
        const pfHeader = document.createElement('div');
        pfHeader.className = 'header-stat';
        pfHeader.textContent = this.showPlayoffPct ? 'P%' : 'PF';
        
        rightBottom.appendChild(wHeader);
        rightBottom.appendChild(lHeader);
        rightBottom.appendChild(pfHeader);
        
        rightSide.appendChild(rightBottom);
        
        headerRow.appendChild(leftSide);
        headerRow.appendChild(rightSide);
        table.appendChild(headerRow);

        // Team rows
        this.standings.standings.forEach(team => {
            const teamRow = document.createElement('tr');
            if (team.is_your_team) {
                teamRow.className = 'your-team-row';
            }

            // Left side - photo and name
            const teamLeftSide = document.createElement('td');
            teamLeftSide.className = 'left-side';
            
            const photoContainer = document.createElement('div');
            photoContainer.className = 'team-photo-container';
            photoContainer.setAttribute('data-team', team.team_name); // Add team name for color styling
            
            const photo = document.createElement('img');
            photo.className = 'team-photo';
            photo.src = team.logo_url;
            photo.alt = team.team_name;
            photo.onerror = function() {
                this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="75" height="47" viewBox="0 0 75 47"><rect width="75" height="47" fill="%23333"/><text x="37.5" y="28" text-anchor="middle" fill="%23fff" font-size="12">?</text></svg>';
            };
            
            photoContainer.appendChild(photo);
            
            // Create team name container with both team name and owner name
            const teamNameContainer = document.createElement('div');
            teamNameContainer.className = 'team-name-container';
            
            const teamName = document.createElement('div');
            teamName.className = 'team-name';
            teamName.textContent = team.team_name;
            
            const ownerName = document.createElement('div');
            ownerName.className = 'owner-name';
            ownerName.textContent = team.owner_name;
            
            teamNameContainer.appendChild(teamName);
            teamNameContainer.appendChild(ownerName);
            
            teamLeftSide.appendChild(photoContainer);
            teamLeftSide.appendChild(teamNameContainer);

            // Right side - stats
            const teamRightSide = document.createElement('td');
            teamRightSide.className = 'right-side';
            
            const statsContainer = document.createElement('div');
            statsContainer.className = 'stats-container';
            
            const wins = document.createElement('div');
            wins.className = 'stat-value';
            wins.textContent = team.wins;
            
            const losses = document.createElement('div');
            losses.className = 'stat-value';
            losses.textContent = team.losses;
            
            const lastStat = document.createElement('div');
            lastStat.className = 'stat-value';
            lastStat.textContent = this.showPlayoffPct ? 
                `${team.playoff_pct}%` : 
                Math.round(team.points_for); // Remove decimals from PF
            
            statsContainer.appendChild(wins);
            statsContainer.appendChild(losses);
            statsContainer.appendChild(lastStat);
            
            teamRightSide.appendChild(statsContainer);
            
            teamRow.appendChild(teamLeftSide);
            teamRow.appendChild(teamRightSide);
            table.appendChild(teamRow);
        });

        wrapper.appendChild(table);
        return wrapper;
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'STANDINGS_DATA') {
            this.standings = payload;
            this.updateDom(0); // No animation to prevent fading
        }
    }
});
