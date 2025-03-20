
// analytics.ts
import mixpanel from "mixpanel-browser";

export function initMixpanel() {
  // In Replit, we can read environment variables with process.env
  const token = process.env.MIXPANEL_TOKEN;
  if (!token) {
    console.warn("Mixpanel token not found!");
    return;
  }
  mixpanel.init(token, {
    debug: false, // Toggle true for debugging in dev
  });
}

export { mixpanel };
