import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { mixpanel } from '@/lib/analytics';

export function PerformanceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Wait for the page to fully load
    const trackPagePerformance = () => {
      // Get performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintMetrics = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');

      // Calculate key metrics
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      const firstPaint = paintMetrics.find(({ name }) => name === 'first-paint')?.startTime;
      const firstContentfulPaint = paintMetrics.find(({ name }) => name === 'first-contentful-paint')?.startTime;

      // Track the performance data
      mixpanel.track("Page Performance", {
        pageType: pathname.split('/')[1] || 'home', // Extract page type from path
        pathname,
        metrics: {
          loadTime,
          firstPaint,
          firstContentfulPaint,
          domInteractive: navigation.domInteractive,
          domComplete: navigation.domComplete,
        },
        resourceStats: {
          totalCount: resources.length,
          totalSize: resources.reduce((sum, r) => sum + (r.encodedBodySize || 0), 0),
          byType: resources.reduce((acc, r) => {
            const type = r.initiatorType;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        connection: {
          type: (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink,
        },
        timestamp: new Date().toISOString()
      });
    };

    // Track performance after a short delay to ensure metrics are available
    const timeoutId = setTimeout(trackPagePerformance, 1000);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null; // This is a utility component that doesn't render anything
} 