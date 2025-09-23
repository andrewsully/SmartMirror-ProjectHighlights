const Log = require('logger')
const NodeHelper = require('node_helper')
const moment = require('moment-timezone')
const fs = require('node:fs')
const path = require('node:path')

module.exports = NodeHelper.create({

  providers: {},

  start: function () {
    Log.log('Starting node_helper for: ' + this.name)

    this.providers.SNET = require('./providers/SNET.js')
    this.providers.SNET_YD = require('./providers/SNET_YD.js')
    this.providers.ESPN = require('./providers/ESPN.js')
    this.providers.Scorepanel = require('./providers/ESPN_Scorepanel.js')

    this.localLogos = {}
    var fsTree = this.getDirectoryTree('./modules/MMM-MyScoreboard/logos')
    fsTree.forEach((league) => {
      if (league.children) {
        var logoFiles = []
        league.children.forEach((file) => {
          logoFiles.push(file.name)
        })
        this.localLogos[league.name] = logoFiles
      }
    })

    this.localLogosCustom = {}
    fsTree = this.getDirectoryTree('./modules/MMM-MyScoreboard/logos_custom')
    fsTree.forEach((league) => {
      if (league.children) {
        var logoFiles = []
        league.children.forEach((file) => {
          logoFiles.push(file.name)
        })
        this.localLogosCustom[league.name] = logoFiles
      }
    })
  },

  getDirectoryTree(dirPath) {
    const result = []
    const files = fs.readdirSync(dirPath, { withFileTypes: true })

    files.forEach((file) => {
      const filePath = path.join(dirPath, file.name)
      if (file.name.endsWith('.svg') || file.name.endsWith('.png')) {
        result.push({ name: file.name })
      }
      else if (file.isDirectory()) {
        const children = this.getDirectoryTree(filePath)
        if (children.length > 0) {
          result.push({ name: file.name, children })
        }
      }
    })

    return result
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification == 'MMM-MYSCOREBOARD-GET-SCORES') {
      /*
        payload contains:
          provider to get data from
          game date for which to retrive scores,
          league
          teams
          module instance identifier
          sport's index from the config's order
      */

      var self = this
      var provider = this.providers[payload.provider]
      var provider2 = this.providers[payload.provider]
      if (payload.provider == 'SNET') {
        provider2 = this.providers['SNET_YD']
      }

      if (payload.whichDay.today) {
        // For NFL weekly mode, we need to fetch games for the entire week
        if (payload.isWeekly && payload.league === 'NFL') {
          self.getNFLWeeklyScores(payload, provider, function (scores, sortIdx) {
            self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE', { instanceId: payload.instanceId, index: payload.league, scores: scores, label: payload.label, sortIdx: sortIdx })
          })
        } else {
          // Regular daily mode for other sports
          provider.getScores(payload, moment(payload.gameDate), function (scores, sortIdx) {
            self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE', { instanceId: payload.instanceId, index: payload.league, scores: scores, label: payload.label, sortIdx: sortIdx })
          })
        }
      }
      else {
        self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE', { instanceId: payload.instanceId, index: payload.league, scores: [], notRun: true, label: payload.label, sortIdx: 999 })
      }
      if (payload.whichDay.yesterday === 'yes') {
        // For NFL weekly mode, get previous week's games
        if (payload.isWeekly && payload.league === 'NFL') {
          self.getNFLWeeklyScores(payload, provider2, function (scores, sortIdx) {
            self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE-YD', { instanceId: payload.instanceId, index: payload.league, scores: scores, label: payload.label, sortIdx: sortIdx })
          }, true) // true indicates previous week
        } else {
          // Regular daily mode for other sports
          provider2.getScores(payload, moment(payload.gameDate).subtract(1, 'day'), function (scores, sortIdx) {
            self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE-YD', { instanceId: payload.instanceId, index: payload.league, scores: scores, label: payload.label, sortIdx: sortIdx })
          })
        }
      }
      /* else if (payload.whichDay.yesterday === 'erase') {
        Log.debug('it\'s suppsoed to erase')
        self.sendSocketNotification('MMM-MYSCOREBOARD-SCORE-UPDATE-YD', { instanceId: payload.instanceId, index: payload.league, scores: [], label: payload.label, sortIdx: 999 })
      } */
    }
    else if (notification == 'MMM-MYSCOREBOARD-GET-LOCAL-LOGOS') {
      this.sendSocketNotification('MMM-MYSCOREBOARD-LOCAL-LOGO-LIST', { instanceId: payload.instanceId, index: payload.league, logos: this.localLogos, logosCustom: this.localLogosCustom })
    }
  },

  getNFLWeeklyScores: function (payload, provider, callback, isPreviousWeek) {
    var self = this
    var weekStart = moment(payload.gameDate)
    
    if (isPreviousWeek) {
      weekStart = weekStart.clone().subtract(1, 'week')
    }
    
    var allScores = []
    var completedRequests = 0
    var totalRequests = 7 // Tuesday through Monday
    
    // Fetch scores for each day of the NFL week (Tuesday to Monday)
    for (var i = 0; i < 7; i++) {
      var currentDate = weekStart.clone().add(i, 'days')
      
      // Create a modified payload for this specific day
      var dayPayload = Object.assign({}, payload, {
        gameDate: currentDate,
        isWeekly: false // Tell the provider this is a single day request
      })
      
      provider.getScores(dayPayload, currentDate, function (scores, sortIdx) {
        if (scores && scores.length > 0) {
          allScores = allScores.concat(scores)
        }
        completedRequests++
        
        // When all days are processed, return the combined results
        if (completedRequests === totalRequests) {
          // Sort the combined scores by date/time
          allScores.sort(function (a, b) {
            var aTime = moment(a.competitions ? a.competitions[0].date : a.date)
            var bTime = moment(b.competitions ? b.competitions[0].date : b.date)
            return aTime - bTime
          })
          
          callback(allScores, payload.index)
        }
      })
    }
  },

})
