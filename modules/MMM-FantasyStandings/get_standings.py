#!/usr/bin/env python3
"""
Get fantasy standings data for MagicMirror module
Usage: python3 get_standings.py <league_id> <year> <username>
"""

import sys
import json
from espn_standings_client import FantasyStandingsClient

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 get_standings.py <league_id> <year> <username>")
        sys.exit(1)
    
    league_id = int(sys.argv[1])
    year = int(sys.argv[2])
    username = sys.argv[3]
    
    try:
        client = FantasyStandingsClient(league_id, year, username)
        standings = client.get_league_standings()
        
        if standings:
            # Output JSON to stdout for node_helper
            print(json.dumps(standings, default=str))
        else:
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
