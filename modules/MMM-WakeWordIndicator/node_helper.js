const NodeHelper = require("node_helper");
const mqtt = require("mqtt");

module.exports = NodeHelper.create({
    start: function() {
        console.log("WakeWordIndicator node helper started");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "INIT_MQTT") {
            this.initMQTT(payload);
        }
    },

    initMQTT: function(config) {
        const mqttUrl = `mqtt://${config.host}:${config.port}`;
        
        console.log(`WakeWordIndicator: Connecting to MQTT at ${mqttUrl}`);
        
        this.mqttClient = mqtt.connect(mqttUrl);
        
        this.mqttClient.on("connect", () => {
            console.log("WakeWordIndicator: Connected to MQTT broker");
            
            // Subscribe to relevant topics
            const topics = [
                `hermes/hotword/${config.wakeWord}/detected`,
                "hermes/asr/startListening", 
                "hermes/asr/stopListening",
                "hermes/tts/say",
                "hermes/tts/sayFinished",
                "hermes/dialogueManager/sessionStarted",
                "hermes/dialogueManager/sessionEnded"
            ];
            
            topics.forEach(topic => {
                this.mqttClient.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`WakeWordIndicator: Error subscribing to ${topic}:`, err);
                    } else {
                        console.log(`WakeWordIndicator: Subscribed to ${topic}`);
                    }
                });
            });
        });
        
        this.mqttClient.on("message", (topic, message) => {
            const messageStr = message.toString();
            console.log(`WakeWordIndicator: Received ${topic}: ${messageStr}`);
            
            this.sendSocketNotification("MQTT_MESSAGE", {
                topic: topic,
                message: messageStr
            });
        });
        
        this.mqttClient.on("error", (err) => {
            console.error("WakeWordIndicator: MQTT error:", err);
            this.sendSocketNotification("MQTT_ERROR", err.message);
        });
        
        this.mqttClient.on("close", () => {
            console.log("WakeWordIndicator: MQTT connection closed");
            this.sendSocketNotification("MQTT_DISCONNECTED", null);
        });

        this.mqttClient.on("offline", () => {
            console.log("WakeWordIndicator: MQTT offline");
            this.sendSocketNotification("MQTT_OFFLINE", null);
        });
    }
});
