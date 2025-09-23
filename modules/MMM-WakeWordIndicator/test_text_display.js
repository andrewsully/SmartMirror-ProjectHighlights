#!/usr/bin/env node
/**
 * Test script for MMM-WakeWordIndicator text display functionality
 * This script simulates MQTT messages to test the word-by-word display
 */

const mqtt = require('mqtt');

const config = {
    host: 'localhost',
    port: 12183,
    wakeWord: 'Janice'
};

const client = mqtt.connect(`mqtt://${config.host}:${config.port}`);

// Test messages
const testMessages = [
    {
        topic: `hermes/hotword/${config.wakeWord}/detected`,
        message: '{"modelId": "janice", "modelVersion": "1.0", "modelType": "personal", "currentSensitivity": 0.5}'
    },
    {
        topic: 'hermes/asr/startListening',
        message: '{"sessionId": "test-session", "siteId": "default"}'
    },
    {
        topic: 'hermes/asr/stopListening',
        message: '{"sessionId": "test-session", "siteId": "default"}'
    },
    {
        topic: 'hermes/tts/say',
        message: JSON.stringify({
            text: "Hello Andrew! The weather today is sunny... with a high of seventy five degrees... and it's going to be a beautiful day.",
            sessionId: "test-session",
            siteId: "default"
        })
    }
];

client.on('connect', () => {
    console.log('Connected to MQTT broker for testing');
    
    let messageIndex = 0;
    
    const sendNextMessage = () => {
        if (messageIndex < testMessages.length) {
            const msg = testMessages[messageIndex];
            console.log(`Sending: ${msg.topic}`);
            console.log(`Message: ${msg.message}`);
            
            client.publish(msg.topic, msg.message);
            messageIndex++;
            
            // Send next message after delay
            setTimeout(sendNextMessage, messageIndex === 1 ? 1000 : messageIndex === 2 ? 2000 : 3000);
        } else {
            console.log('All test messages sent. Disconnecting...');
            setTimeout(() => {
                client.end();
            }, 2000);
        }
    };
    
    // Start sending messages after a short delay
    setTimeout(sendNextMessage, 1000);
});

client.on('error', (err) => {
    console.error('MQTT Error:', err);
});

client.on('close', () => {
    console.log('MQTT connection closed');
    process.exit(0);
});
