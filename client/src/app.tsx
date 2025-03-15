import { useEffect } from 'react';
import { mixpanel } from '@/lib/analytics';

// ... other imports ...

export default function App() {
  useEffect(() => {
    // Session Tracking
    const sessionStartTime = new Date();
    mixpanel.track("Session Started", {
      deviceType: "web",
      referrer: document.referrer,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: window.navigator.userAgent,
      timestamp: sessionStartTime.toISOString(),
      pathname: window.location.pathname,
      searchParams: window.location.search
    });

    // Track session end on unmount
    return () => {
      const sessionEndTime = new Date();
      const sessionDuration = sessionEndTime.getTime() - sessionStartTime.getTime();
      
      mixpanel.track("Session Ended", {
        duration: sessionDuration,
        durationMinutes: Math.round(sessionDuration / 60000),
        endTimestamp: sessionEndTime.toISOString(),
        pathname: window.location.pathname
      });
    };
  }, []);

  // Performance Tracking
  useEffect(() => {
    const trackPagePerformance = () => {
      // Get performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintMetrics = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');

      // Calculate key metrics
      const loadTime = navigation.loadEventEnd;
      const firstPaint = paintMetrics.find(({ name }) => name === 'first-paint')?.startTime;
      const firstContentfulPaint = paintMetrics.find(({ name }) => name === 'first-contentful-paint')?.startTime;

      // Track the performance data
      mixpanel.track("Page Performance", {
        pageType: window.location.pathname.split('/')[1] || 'home',
        pathname: window.location.pathname,
        metrics: {
          loadTime,
          firstPaint,
          firstContentfulPaint,
          domInteractive: navigation.domInteractive,
          domComplete: navigation.domComplete,
          timeToFirstByte: navigation.responseStart,
          resourceLoadTime: navigation.loadEventEnd - navigation.responseEnd
        },
        resourceStats: {
          totalCount: resources.length,
          totalSize: resources.reduce((sum, r) => sum + ((r as any).encodedBodySize || 0), 0),
          byType: resources.reduce((acc, r) => {
            const type = (r as any).initiatorType || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        connection: {
          type: (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString()
      });
    };

    // Track performance after a short delay to ensure metrics are available
    const timeoutId = setTimeout(trackPagePerformance, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    // ... your existing App JSX ...
  );
} 