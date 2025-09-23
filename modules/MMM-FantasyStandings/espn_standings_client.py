#!/usr/bin/env python3
"""
ESPN Fantasy Football Standings API Client - CLEAN VERSION
"""

from espn_api.football import League
from datetime import datetime
import json
import sys
import os

class FantasyStandingsClient:
    """Simple client for fetching ESPN Fantasy Football league standings"""
    
    def __init__(self, league_id, year, your_username=None):
        self.league_id = league_id
        self.year = year
        self.your_username = your_username
        self.league = None
        self._connect()
    
    def _connect(self):
        """Initialize connection to ESPN API"""
        try:
            self.league = League(league_id=self.league_id, year=self.year, debug=False)
            # No console output - only JSON for MagicMirror
        except Exception as e:
            raise Exception(f"Failed to connect to ESPN API: {e}")
    
    def get_league_standings(self):
        """Get league standings using ESPN's built-in method"""
        if not self.league:
            return None
        
        # Use ESPN's official standings method
        sorted_teams = self.league.standings()
        
        standings_data = {
            'league_info': {
                'name': self.league.settings.name,
                'size': len(self.league.teams),
                'current_week': self.league.current_week,
                'timestamp': datetime.now().isoformat()
            },
            'standings': []
        }
        
        for team in sorted_teams:
            team_data = {
                'rank': team.standing,
                'team_name': team.team_name,
                'owner_name': team.owners[0].get('displayName', 'Unknown') if team.owners else 'Unknown',
                'wins': team.wins,
                'losses': team.losses,
                'ties': team.ties,
                'points_for': round(team.points_for, 1),
                'points_against': round(team.points_against, 1),
                'logo_url': team.logo_url,
                'playoff_pct': round(team.playoff_pct, 1) if hasattr(team, 'playoff_pct') else 0,
                'is_your_team': self._is_your_team(team)
            }
            standings_data['standings'].append(team_data)
        
        return standings_data
    
    def _is_your_team(self, team):
        """Check if this team belongs to the specified user"""
        if not self.your_username:
            return False
        
        owner_info = team.owners[0] if team.owners else {}
        display_name = owner_info.get('displayName', '')
        
        return self.your_username.lower() in display_name.lower()

# Test the client - only when run directly
if __name__ == "__main__":
    import sys
    
    client = FantasyStandingsClient(
        league_id=1295880,
        year=2025,
        your_username='sully296rocks'
    )
    
    standings = client.get_league_standings()
    if standings:
        # Only output JSON when used by MagicMirror
        if len(sys.argv) > 1 and sys.argv[1] == '--json':
            print(json.dumps(standings, default=str))
        else:
            # Console output for testing
            print(f"\n🏈 {standings['league_info']['name']} - Week {standings['league_info']['current_week']}")
            print("=" * 60)
            for team in standings['standings']:
                your_marker = " 👤" if team['is_your_team'] else ""
                print(f"{team['rank']:2d}. {team['team_name']:<20} {team['wins']}-{team['losses']} {team['points_for']:6.1f}{your_marker}")
    else:
        sys.exit(1)
