Module.register("MMM-WakeWordIndicator", {
    defaults: {
        mqttHost: "localhost",
        mqttPort: 12183,
        wakeWord: "Janice",
        showDuration: 3000, // Show for 3 seconds after wake word
        listeningDuration: 10000, // Show listening for 10 seconds max
        position: "top_center",
        showSpokenText: true, // Show text being spoken
        wordsPerMinute: 150, // Average speaking speed for timing
        textDisplayDuration: 5000, // How long to show text after speaking ends
        ellipsisPauseMs: 500 // Pause duration in milliseconds when encountering "..."
    },

    start: function() {
        this.status = "idle"; // idle, wake, listening, processing
        this.mqttClient = null;
        this.timeouts = {};
        this.spokenText = "";
        this.currentWords = [];
        this.currentWordIndex = 0;
        this.wordTimers = [];
        
        this.sendSocketNotification("INIT_MQTT", {
            host: this.config.mqttHost,
            port: this.config.mqttPort,
            wakeWord: this.config.wakeWord
        });
    },

    getStyles: function() {
        return ["MMM-WakeWordIndicator.css"];
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "wake-word-indicator";
        
        if (this.status === "idle") {
            return wrapper; // Empty when idle
        }
        
        const indicator = document.createElement("div");
        indicator.className = `wake-indicator ${this.status}`;
        
        // Add GIF indicator
        const gifContainer = document.createElement("div");
        gifContainer.className = "gif-container";
        
        if (this.status === "wake") {
            gifContainer.innerHTML = `
                <img src="modules/MMM-WakeWordIndicator/voice_assistant_gifs/Getting Unmute.gif" class="voice-gif" alt="Wake word detected">
            `;
        } else if (this.status === "listening") {
            gifContainer.innerHTML = `
                <img src="modules/MMM-WakeWordIndicator/voice_assistant_gifs/3Dots - Listening.gif" class="voice-gif" alt="Listening">
            `;
        } else if (this.status === "processing") {
            gifContainer.innerHTML = `
                <img src="modules/MMM-WakeWordIndicator/voice_assistant_gifs/3Dots - Thinking.gif" class="voice-gif" alt="Processing">
            `;
        } else if (this.status === "speaking") {
            gifContainer.innerHTML = `
                <img src="modules/MMM-WakeWordIndicator/voice_assistant_gifs/3Dots - Speaking.gif" class="voice-gif" alt="Speaking">
            `;
        } else if (this.status === "error") {
            gifContainer.innerHTML = `
                <img src="modules/MMM-WakeWordIndicator/voice_assistant_gifs/Getting Mute.gif" class="voice-gif" alt="Error">
            `;
        }
        
        indicator.appendChild(gifContainer);
        
        // Add text display if enabled and we have spoken text (only during speaking state)
        if (this.config.showSpokenText && this.spokenText && this.status === "speaking") {
            const textContainer = document.createElement("div");
            textContainer.className = "spoken-text-container";
            
            const textDisplay = document.createElement("div");
            textDisplay.className = "spoken-text";
            textDisplay.id = "spoken-text-display";
            
            this.renderSpokenText(textDisplay);
            
            textContainer.appendChild(textDisplay);
            indicator.appendChild(textContainer);
        }
        
        wrapper.appendChild(indicator);
        return wrapper;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MQTT_MESSAGE") {
            this.handleMQTTMessage(payload.topic, payload.message);
        } else if (notification === "MQTT_ERROR") {
            console.error("WakeWordIndicator: MQTT Error:", payload);
            this.status = "error";
            this.updateDom();
        } else if (notification === "MQTT_DISCONNECTED" || notification === "MQTT_OFFLINE") {
            console.log("WakeWordIndicator: MQTT disconnected/offline");
            this.status = "idle";
            this.updateDom();
        }
    },

    handleMQTTMessage: function(topic, message) {
        console.log(`WakeWordIndicator: ${topic} - ${message}`);
        
        // Clear any existing timeouts
        Object.values(this.timeouts).forEach(timeout => clearTimeout(timeout));
        this.timeouts = {};
        
        if (topic === `hermes/hotword/${this.config.wakeWord}/detected`) {
            this.status = "wake";
            this.updateDom();
            
            // Auto-hide after wake duration
            this.timeouts.wake = setTimeout(() => {
                this.status = "idle";
                this.updateDom();
            }, this.config.showDuration);
            
        } else if (topic === "hermes/dialogueManager/sessionStarted") {
            // If we haven't shown wake yet, show it now
            if (this.status === "idle") {
                this.status = "wake";
                this.updateDom();
                
                // Quick transition to listening
                this.timeouts.wake = setTimeout(() => {
                    this.status = "listening";
                    this.updateDom();
                }, 500);
            }
            
        } else if (topic === "hermes/asr/startListening") {
            this.status = "listening";
            this.updateDom();
            
            // Auto-hide after listening duration
            this.timeouts.listening = setTimeout(() => {
                this.status = "idle";
                this.updateDom();
            }, this.config.listeningDuration);
            
        } else if (topic === "hermes/asr/stopListening") {
            this.status = "processing";
            this.updateDom();
            
            // Hide after processing
            this.timeouts.processing = setTimeout(() => {
                this.status = "idle";
                this.updateDom();
            }, 2000);
            
        } else if (topic === "hermes/tts/say") {
            this.status = "speaking";
            
            // Parse the TTS message to extract text
            try {
                const ttsData = JSON.parse(message);
                if (ttsData.text) {
                    this.spokenText = ttsData.text;
                    this.startWordByWordDisplay();
                }
            } catch (e) {
                // If not JSON, treat the whole message as text
                this.spokenText = message;
                this.startWordByWordDisplay();
            }
            
            this.updateDom();
            
            // Add a reasonable timeout as fallback in case sessionEnded doesn't come
            this.timeouts.speaking = setTimeout(() => {
                this.status = "idle";
                this.spokenText = "";
                this.updateDom();
            }, 30000); // 30 second fallback timeout
            
        } else if (topic === "hermes/tts/sayFinished") {
            // TTS has finished speaking - close immediately
            this.status = "idle";
            this.spokenText = "";
            this.updateDom();
            
        } else if (topic === "hermes/dialogueManager/sessionEnded") {
            this.status = "idle";
            this.spokenText = ""; // Clear text immediately
            this.updateDom();
        }
    },

    startWordByWordDisplay: function() {
        if (!this.config.showSpokenText || !this.spokenText) return;
        
        // Clear any existing word timers
        this.clearWordTimers();
        
        // Split text into words
        this.currentWords = this.spokenText.split(' ').filter(word => word.trim() !== '');
        this.currentWordIndex = 0;
        
        // Calculate timing based on words per minute
        const millisecondsPerWord = (60 / this.config.wordsPerMinute) * 1000;
        
        // Start the word-by-word display
        this.displayNextWord(millisecondsPerWord);
    },

    displayNextWord: function(interval) {
        if (this.currentWordIndex < this.currentWords.length) {
            // Update only the text display, not the entire DOM
            this.updateTextDisplay();
            
            // Check if current word contains ellipsis for pause
            const currentWord = this.currentWords[this.currentWordIndex];
            const hasEllipsis = currentWord && currentWord.includes('...');
            const nextInterval = hasEllipsis ? interval + this.config.ellipsisPauseMs : interval;
            
            // Schedule next word
            const timer = setTimeout(() => {
                this.currentWordIndex++;
                this.displayNextWord(interval);
            }, nextInterval);
            
            this.wordTimers.push(timer);
        }
    },

    clearWordTimers: function() {
        this.wordTimers.forEach(timer => clearTimeout(timer));
        this.wordTimers = [];
    },

    renderSpokenText: function(textDisplay) {
        if (!this.currentWords || this.currentWords.length === 0) {
            textDisplay.innerHTML = this.spokenText || '';
            return;
        }
        
        let html = '';
        
        // Only show words that have been spoken (up to and including current word)
        const wordsToShow = Math.min(this.currentWordIndex + 1, this.currentWords.length);
        
        for (let i = 0; i < wordsToShow; i++) {
            const word = this.currentWords[i];
            const isCurrentWord = i === this.currentWordIndex;
            
            // Simple styling: current word highlighted, previous words normal
            const wordClass = isCurrentWord ? 'word current-word' : 'word spoken-word';
            const wordSpan = `<span class="${wordClass}">${word}</span>`;
            
            // Add word with a space (natural text flow)
            html += wordSpan + ' ';
        }
        
        textDisplay.innerHTML = html;
    },

    updateTextDisplay: function() {
        // Update only the text content without rebuilding the entire DOM
        const textDisplay = document.getElementById('spoken-text-display');
        if (textDisplay && this.config.showSpokenText && this.spokenText) {
            this.renderSpokenText(textDisplay);
        }
    }
});
