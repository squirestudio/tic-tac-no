import { registerPlugin, Capacitor } from '@capacitor/core';

interface AnalyticsPlugin {
  logEvent(options: { name: string; params?: Record<string, unknown> }): Promise<void>;
}

const Analytics = registerPlugin<AnalyticsPlugin>('Analytics');

export function logEvent(name: string, params?: Record<string, unknown>): void {
  if (!Capacitor.isNativePlatform()) return;
  Analytics.logEvent({ name, params }).catch(() => {});
}
