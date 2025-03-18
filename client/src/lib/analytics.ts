
import mixpanel from "mixpanel-browser";

let isInitialized = false;

export function initMixpanel() {
  if (isInitialized) return;
  
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!token) {
    console.warn("Mixpanel token not found!");
    return;
  }
  
  mixpanel.init(token, {
    debug: true,
  });
  isInitialized = true;
  console.log("Mixpanel initialized with token");
}

function safeTrack(eventName: string, properties?: any) {
  if (!isInitialized) {
    console.warn(`Attempted to track "${eventName}" before Mixpanel initialization`);
    return;
  }
  mixpanel.track(eventName, properties);
}

export const trackSignUpInitiated = (method: 'Email' | 'OAuth', referralCode?: string) => {
  safeTrack('Sign Up Initiated', {
    signUpMethod: method,
    referralCode: referralCode || null,
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  });
};

export const trackSignUpCompleted = (method: 'Email' | 'OAuth', timeToComplete: number) => {
  safeTrack('Sign Up Completed', {
    signUpMethod: method,
    planTier: 'Free',
    timeToComplete,
    timestamp: new Date().toISOString()
  });
};

export const trackSignUpFailed = (reason: string) => {
  safeTrack('Sign Up Failed', {
    reasonForFailure: reason,
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  });
};

export const trackUserLoggedIn = (method: 'Email' | 'OAuth') => {
  safeTrack('User Logged In', {
    loginMethod: method,
    pageURL: window.location.href,
    timestamp: new Date().toISOString()
  });
};

export { mixpanel };
