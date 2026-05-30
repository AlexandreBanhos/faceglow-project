/**
 * Smoke test — sanidade básica antes de qualquer outro teste.
 * 5 VUs, 1 minuto. Todos os endpoints críticos devem responder < 1s.
 *
 * Uso:
 *   k6 run -e BASE_URL=http://localhost:5172 -e TOKEN=seu_jwt tests/load/smoke.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

export const options = {
  vus: 5,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    errors: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5172";
const TOKEN = __ENV.TOKEN || "";

const headers = {
  "Content-Type": "application/json",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

export default function () {
  // Health
  const health = http.get(`${BASE_URL}/health`);
  errorRate.add(!check(health, { "health 200": (r) => r.status === 200 }));

  if (!TOKEN) {
    sleep(1);
    return;
  }

  // Billing status
  const billing = http.get(`${BASE_URL}/billing/status`, { headers });
  errorRate.add(!check(billing, { "billing/status 200": (r) => r.status === 200 }));

  // Credits
  const credits = http.get(`${BASE_URL}/analysis/credits`, { headers });
  errorRate.add(!check(credits, { "analysis/credits 200": (r) => r.status === 200 }));

  // Dashboard
  const dashboard = http.get(`${BASE_URL}/analysis/dashboard`, { headers });
  errorRate.add(!check(dashboard, { "analysis/dashboard 200": (r) => r.status === 200 }));

  sleep(1);
}
