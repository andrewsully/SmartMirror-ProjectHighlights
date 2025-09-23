/*
 * MMM-AllGamesLive Node Helper - Live ESPN data
 */

const NodeHelper = require("node_helper");
const { getData } = require("./espn");

function formatGameTime(ts) {
    if (!ts) return "";
    try {
        const d = new Date(ts);
        const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
        const day = days[d.getDay()];
        let hours = d.getHours();
        const minutes = `${d.getMinutes()}`.padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        return `${day} ${hours}:${minutes}${ampm}`;
    } catch (e) {
        return "";
    }
}

function mapStatus(espnStatus) {
    if (!espnStatus) return { status: "UPCOMING", quarter: "" };
    if (typeof espnStatus === 'string') {
        if (espnStatus.startsWith('final')) return { status: 'FINAL', quarter: '' };
        if (espnStatus === 'pregame') return { status: 'UPCOMING', quarter: '' };
        if (espnStatus === 'halftime') return { status: 'LIVE', quarter: 'HALF' };
        if (espnStatus === 'overtime') return { status: 'LIVE', quarter: 'OT' };
        // numeric period encoded as string? fallthrough
    }
    if (typeof espnStatus === 'number') {
        const ord = ['','1ST','2ND','3RD','4TH'][espnStatus] || `${espnStatus}TH`;
        return { status: 'LIVE', quarter: ord };
    }
    return { status: 'LIVE', quarter: '' };
}

module.exports = NodeHelper.create({
    start: function() {
        console.log("MMM-AllGamesLive node helper started (ESPN)");
        this._devPreview = false;
        // Poll ESPN every 30 minutes
        this._interval = setInterval(() => this.fetchAndBroadcast(), 30 * 60 * 1000);
    },

    stop: function() {
        if (this._interval) clearInterval(this._interval);
    },

    async fetchAndBroadcast() {
        try {
            const { details, scores } = await getData();
            const games = (scores || []).map(s => {
                const mapped = mapStatus(s.status);
                return {
                    awayTeam: s.awayTeam,            // abbreviations (e.g., KC)
                    homeTeam: s.homeTeam,            // abbreviations (e.g., NYG)
                    awayScore: Number(s.awayScore ?? 0),
                    homeScore: Number(s.homeScore ?? 0),
                    awayLogo: s.awayLogo || "",
                    homeLogo: s.homeLogo || "",
                    status: mapped.status,           // 'UPCOMING' | 'LIVE' | 'FINAL'
                    clock: s.remainingTime || null,  // '14:55'
                    quarter: mapped.quarter,         // '2ND' | 'HALF' | 'OT'
                    gameTime: mapped.status === 'UPCOMING' ? formatGameTime(s.timestamp) : null,
                    downDistance: s.downDistance || null,
                    ballPossession: s.ballPossession || null,
                    inRedZone: !!s.inRedZone
                };
            });
            this.sendSocketNotification("AGLIVE_GAMES_DATA", games);
        } catch (err) {
            console.error("MMM-AllGamesLive: failed to fetch ESPN data", err);
        }
    },

    sendDevMixed: function() {
        const games = [
            // FINAL examples
            { awayTeam: "Kansas City Chiefs", homeTeam: "New York Giants", awayScore: 22, homeScore: 32, awayLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png", homeLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png", status: "FINAL", clock: null, quarter: "", gameTime: null, downDistance: null, ballPossession: null, awayRecord: "11-6", homeRecord: "9-8" },
            { awayTeam: "Buffalo Bills", homeTeam: "Miami Dolphins", awayScore: 31, homeScore: 14, awayLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png", homeLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png", status: "FINAL", clock: null, quarter: "", gameTime: null, downDistance: null, ballPossession: null, awayRecord: "12-5", homeRecord: "8-9" },
            // LIVE examples (with possession and D&D)
            { awayTeam: "Detroit Lions", homeTeam: "Baltimore Ravens", awayScore: 38, homeScore: 30, awayLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png", homeLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png", status: "LIVE", clock: "0:27", quarter: "4TH", gameTime: null, downDistance: "1st & 10", ballPossession: "Detroit Lions", inRedZone: false },
            { awayTeam: "San Francisco 49ers", homeTeam: "Seattle Seahawks", awayScore: 17, homeScore: 10, awayLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png", homeLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png", status: "LIVE", clock: "8:42", quarter: "1ST", gameTime: null, downDistance: "1st & 10", ballPossession: "San Francisco 49ers" },
            // UPCOMING with records
            { awayTeam: "Philadelphia Eagles", homeTeam: "Dallas Cowboys", awayScore: 0, homeScore: 0, awayLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png", homeLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png", status: "UPCOMING", clock: null, quarter: "", gameTime: "SUN 4:25PM", downDistance: null, ballPossession: null, awayRecord: "3-0", homeRecord: "2-1" },
            { awayTeam: "Green Bay Packers", homeTeam: "Minnesota Vikings", awayScore: 0, homeScore: 0, awayLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png", homeLogo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png", status: "UPCOMING", clock: null, quarter: "", gameTime: "MON 8:15PM", downDistance: null, ballPossession: null, awayRecord: "1-2", homeRecord: "2-1" }
        ];
        // Repeat to fill 16 rows
        const full = Array.from({ length: 16 }, (_, i) => games[i % games.length]);
        this.sendSocketNotification("AGLIVE_GAMES_DATA", full);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "AGLIVE_CONFIG") {
            this._devPreview = !!(payload && payload.devPreview);
        } else if (notification === "AGLIVE_GET_GAMES") {
            if (this._devPreview) {
                this.sendDevMixed();
            } else {
                this.fetchAndBroadcast();
            }
        }
    }
});