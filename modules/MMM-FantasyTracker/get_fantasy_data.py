#!/usr/bin/env python3
"""
ESPN Fantasy Data Fetcher for MMM-FantasyTracker
Server-side script called by node_helper.js
"""

import sys
import json
from datetime import datetime

try:
    from espn_api.football import League
except ImportError:
    print(json.dumps({"error": "ESPN API not installed. Run: pip install espn_api"}))
    sys.exit(1)

def get_fantasy_matchup(league_id, year, username):
    """Get current fantasy matchup data"""
    try:
        # Initialize ESPN client
        league = League(league_id=int(league_id), year=int(year), debug=False)
        
        # Get current week's box scores
        current_week = league.current_week
        box_scores = league.box_scores(week=current_week)
        
        # Find user's matchup
        user_matchup = None
        for matchup in box_scores:
            home_owners = str(matchup.home_team.owners) if matchup.home_team.owners else ""
            away_owners = str(matchup.away_team.owners) if matchup.away_team.owners else ""
            
            if username in home_owners or username in away_owners:
                user_matchup = matchup
                break
        
        if not user_matchup:
            return {"error": f"Could not find matchup for user: {username}"}
        
        # Determine user's team vs opponent
        if username in str(user_matchup.home_team.owners):
            your_team = user_matchup.home_team
            your_lineup = user_matchup.home_lineup
            your_score = user_matchup.home_score
            your_projected = user_matchup.home_projected
            opp_team = user_matchup.away_team
            opp_lineup = user_matchup.away_lineup
            opp_score = user_matchup.away_score
            opp_projected = user_matchup.away_projected
        else:
            your_team = user_matchup.away_team
            your_lineup = user_matchup.away_lineup
            your_score = user_matchup.away_score
            your_projected = user_matchup.away_projected
            opp_team = user_matchup.home_team
            opp_lineup = user_matchup.home_lineup
            opp_score = user_matchup.home_score
            opp_projected = user_matchup.home_projected
        
        # Format data
        result = {
            'week': current_week,
            'timestamp': datetime.now().isoformat(),
            'matchup_type': user_matchup.matchup_type,
            'is_playoff': user_matchup.is_playoff,
            'your_team': format_team_data(your_team, your_lineup, your_score, your_projected),
            'opponent': format_team_data(opp_team, opp_lineup, opp_score, opp_projected)
        }
        
        return result
        
    except Exception as e:
        return {"error": f"ESPN API error: {str(e)}"}

def format_team_data(team, lineup, score, projected):
    """Format team data for consistent output"""
    owner_info = team.owners[0] if team.owners else {}
    
    return {
        'name': team.team_name,
        'owner': {
            'display_name': owner_info.get('displayName', 'Unknown'),
            'first_name': owner_info.get('firstName', ''),
            'last_name': owner_info.get('lastName', '')
        },
        'record': {
            'wins': team.wins,
            'losses': team.losses,
            'ties': getattr(team, 'ties', 0)
        },
        'logo_url': getattr(team, 'logo_url', None),
        'team_abbrev': getattr(team, 'team_abbrev', ''),
        'team_id': team.team_id,
        'standing': team.standing,
        'score': score,
        'projected': projected,
        'points_for': team.points_for,
        'points_against': team.points_against,
        'lineup': [format_player_data(player) for player in lineup]
    }

def format_player_data(player):
    """Format individual player data"""
    # Debug logging for game status
    print(f"DEBUG: {player.name} ({player.proTeam}) - game_played: {player.game_played}, points: {player.points}, projected: {player.projected_points}", file=sys.stderr)
    
    return {
        'name': player.name,
        'position': player.position,
        'slot_position': player.slot_position,
        'pro_team': player.proTeam,
        'pro_opponent': player.pro_opponent,
        'points': player.points,
        'projected_points': player.projected_points,
        'game_played': player.game_played,
        'game_date': player.game_date.isoformat() if hasattr(player, 'game_date') and player.game_date else None,
        'injured': player.injured,
        'injury_status': player.injuryStatus,
        'active_status': player.active_status,
        'on_bye_week': player.on_bye_week,
        'player_id': player.playerId
    }

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Usage: python3 get_fantasy_data.py <league_id> <year> <username>"}))
        sys.exit(1)
    
    league_id = sys.argv[1]
    year = sys.argv[2]
    username = sys.argv[3]
    
    result = get_fantasy_matchup(league_id, year, username)
    print(json.dumps(result, default=str, indent=2))
