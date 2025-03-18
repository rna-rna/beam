
import mixpanel from "mixpanel-browser";

let isInitialized = false;

export function initMixpanel() {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!token) {
    console.warn("Mixpanel token not found!");
    return;
  }
  
  try {
    mixpanel.init(token, {
      debug: true,
      loaded: function(mixpanel) {
        isInitialized = true;
        console.log("Mixpanel initialized with token");
      }
    });
  } catch (err) {
    console.error("Failed to initialize Mixpanel:", err);
  }
}

function safeTrack(eventName: string, properties?: any) {
  if (!isInitialized) {
    console.warn("Mixpanel not initialized");
    return;
  }
  mixpanel.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString()
  });
}

export const trackSignUpInitiated = (method: 'Email' | 'OAuth', referralCode?: string) => {
  safeTrack('Sign Up Initiated', {
    signUpMethod: method,
    referralCode: referralCode || null,
    pageURL: window.location.href
  });
};

export const trackSignUpCompleted = (method: 'Email' | 'OAuth', timeToComplete: number) => {
  safeTrack('Sign Up Completed', {
    signUpMethod: method,
    planTier: 'Free',
    timeToComplete
  });
};

export const trackSignUpFailed = (reason: string) => {
  safeTrack('Sign Up Failed', {
    reasonForFailure: reason,
    pageURL: window.location.href
  });
};

export const trackUserLoggedIn = (method: 'Email' | 'OAuth') => {
  safeTrack('User Logged In', {
    loginMethod: method,
    pageURL: window.location.href
  });
};

export { mixpanel };
