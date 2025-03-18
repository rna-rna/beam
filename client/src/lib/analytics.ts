
// analytics.ts
import mixpanel from "mixpanel-browser";

export function initMixpanel() {
  // In Replit, we can read environment variables with process.env
  const token = process.env.MIXPANEL_TOKEN;
  if (!token) {

// Helper functions for Mixpanel tracking
export const trackSignUpInitiated = (method: 'Email' | 'OAuth', referralCode?: string) => {
  mixpanel.track('Sign Up Initiated', {
    signUpMethod: method,
    referralCode: referralCode || null,
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  });
};

export const trackSignUpCompleted = (method: 'Email' | 'OAuth', timeToComplete: number) => {
  mixpanel.track('Sign Up Completed', {
    signUpMethod: method,
    planTier: 'Free', // Default plan
    timeToComplete,
    timestamp: new Date().toISOString()
  });
};

export const trackSignUpFailed = (reason: string) => {
  mixpanel.track('Sign Up Failed', {
    reasonForFailure: reason,
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  });
};

export const trackUserLoggedIn = (method: 'Email' | 'OAuth') => {
  mixpanel.track('User Logged In', {
    loginMethod: method,
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  });
};

    console.warn("Mixpanel token not found!");
    return;
  }
  mixpanel.init(token, {
    debug: false, // Toggle true for debugging in dev
  });
}

export { mixpanel };
