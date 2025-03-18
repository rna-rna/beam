
import mixpanel from "mixpanel-browser";

function initMixpanel() {
  const token = process.env.MIXPANEL_TOKEN;
  if (!token) {
    console.warn("Mixpanel token not found!");
    return;
  }
  mixpanel.init(token, {
    debug: false,
  });
}

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
    planTier: 'Free',
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

export { mixpanel, initMixpanel };
