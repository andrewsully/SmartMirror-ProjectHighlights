/** *******************************

  Node Helper for MMM-OpenWeatherMapForecast.

  This helper is responsible for the data pull from OpenWeather.
  At a minimum the API key, Latitude and Longitude parameters
  must be provided.  If any of these are missing, the request
  to OpenWeather will not be executed, and instead an error
  will be output the the MagicMirror log.

  Additional, this module supplies two optional parameters:

    units - one of "metric", "imperial", or "" (blank)
    lang - Any of the languages OpenWeather supports, as listed here: https://openweathermap.org/api/one-call-api#multi

  The API request looks like this:

    https://api.openweathermap.org/data/3.0/onecall?lat=LATITUDE&lon=LONGITUDE&units=XXX&lang=YY&appid=API_KEY

*********************************/

const Log = require("logger");
const NodeHelper = require("node_helper");
const moment = require("moment");

module.exports = NodeHelper.create({

    start () {
        Log.log(`Starting node_helper for ${this.name}`);
    },

    async socketNotificationReceived (notification, payload) {
        if (notification === "OPENWEATHER_ONE_CALL_FORECAST_GET") {
            const self = this;

            if (payload.apikey == null || payload.apikey == "") {
                Log.log(`[MMM-OpenWeatherMapForecast] ${moment().format("D-MMM-YY HH:mm")} ** ERROR ** No API key configured. Get an API key at https://openweathermap.org/api/one-call-api`);
            } else if (payload.latitude == null || payload.latitude == "" || payload.longitude == null || payload.longitude == "") {
                Log.log(`[MMM-OpenWeatherMapForecast] ${moment().format("D-MMM-YY HH:mm")} ** ERROR ** Latitude and/or longitude not provided.`);
            } else {
                // make request to OpenWeather onecall API
                const url = payload.endpoint +
                    "?appid=" + payload.apikey +
                    "&lat=" + payload.latitude +
                    "&lon=" + payload.longitude +
                    (payload.units !== "" ? "&units=" + payload.units : "") +
                    "&lang=" + payload.language;
                // "&exclude=minutely"

                // Log.log("[MMM-OpenWeatherMapForecast] Getting data: " + url);
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const resp = await response.json();
                        resp.instanceId = payload.instanceId;
                        self.sendSocketNotification("OPENWEATHER_ONE_CALL_FORECAST_DATA", resp);
                    } else {
                        Log.log(`[MMM-OpenWeatherMapForecast] ${moment().format("D-MMM-YY HH:mm")} ** ERROR ** ${response.status}`);
                    }
                } catch (error) {
                    Log.log(`[MMM-OpenWeatherMapForecast] ${moment().format("D-MMM-YY HH:mm")} ** ERROR ** ${error.message}`);
                }
            }
        }
    }
});
