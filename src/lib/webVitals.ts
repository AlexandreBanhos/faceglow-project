import { captureEvent } from "@sentry/react";
import type { Metric } from "web-vitals";

export function reportWebVitals() {
  import("web-vitals").then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    const report = (metric: Metric) => {
      if (import.meta.env.DEV) {
        console.debug(`[WebVital] ${metric.name}:`, metric.value.toFixed(1), `(${metric.rating})`);
      }
      // captureEvent é no-op se Sentry não estiver inicializado
      captureEvent({
        message: `Web Vital: ${metric.name}`,
        level: "info",
        tags: { metric_name: metric.name },
        extra: { value: metric.value, rating: metric.rating, id: metric.id },
      });
    };
    onCLS(report);
    onFCP(report);
    onLCP(report);
    onTTFB(report);
    onINP(report);
  });
}
