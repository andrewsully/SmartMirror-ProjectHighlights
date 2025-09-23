/* MMM-ScenesLinearBridge.js
 * Listens for custom triggers, queries current scene,
 * then jumps linearly forward/backward by index in your chosen order.
 */
Module.register("MMM-ScenesLinearBridge", {
  // Define the linear order you want to use
  LINEAR_ORDER: ["homepage_page", "jokes_and_facts_page", "fantasy_page", "football_page"],

  start() {
    // no UI
  },

  notificationReceived(notification, payload, sender) {
    if (notification === "SCENES_LINEAR_NEXT" || notification === "SCENES_LINEAR_PREV") {
      this.sendNotification("SCENES_CURRENT", {
        callback: (res) => {
          try {
            const currentName = res?.currentScene?.name;
            const order = this.LINEAR_ORDER;

            let idx = order.indexOf(currentName);
            if (idx === -1) idx = -1; // treat as before the first

            let nextName;
            if (notification === "SCENES_LINEAR_NEXT") {
              nextName = order[(idx + 1) % order.length];
            } else if (notification === "SCENES_LINEAR_PREV") {
              nextName = order[(idx - 1 + order.length) % order.length];
            }

            this.sendNotification("SCENES_PLAY", { scene: nextName });
          } catch (e) {
            this.sendNotification("SCENES_PLAY", { scene: this.LINEAR_ORDER[0] });
          }
        }
      });
    }
  }
});
