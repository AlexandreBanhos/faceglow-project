/**
 * Soak test — carga moderada por longa duração para detectar degradação gradual.
 * Revela: memory leak, connection pool esgotado, GC pressure, cold start acumulado.
 *
 * Uso:
 *   k6 run -e BASE_URL=https://api.faceglow-soora.me -e TOKEN=seu_jwt tests/load/soak.js
 *
 * Interpretação:
 *   p(95) estável ao longo do tempo = sem degradação
 *   p(95) subindo progressivamente  = memory leak ou pool esgotado
 *   error rate > 1% no final        = sistema não aguenta carga sustentada
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const dashboardDuration = new Trend("dashboard_load_ms");
const healthDuration = new Trend("health_ms");

export const options = {
  stages: [
    { duration: "2m",  target: 20 },   // ramp up suave
    { duration: "30m", target: 20 },   // carga sustentada
    { duration: "2m",  target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration:  ["p(95)<3000", "p(99)<6000"],
    errors:             ["rate<0.01"],
    dashboard_load_ms:  ["p(95)<3000"],
    health_ms:          ["p(95)<500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5172";
const TOKEN    = __ENV.TOKEN    || "";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  group("health check", () => {
    const t = Date.now();
    const res = http.get(`${BASE_URL}/health`);
    healthDuration.add(Date.now() - t);
    errorRate.add(!check(res, { "health 200": (r) => r.status === 200 }));
  });

  if (!TOKEN) {
    sleep(2);
    return;
  }

  group("dashboard mount", () => {
    const t = Date.now();
    const responses = http.batch([
      ["GET", `${BASE_URL}/billing/status`,          null, { headers }],
      ["GET", `${BASE_URL}/analysis/credits`,         null, { headers }],
      ["GET", `${BASE_URL}/analysis/dashboard`,       null, { headers }],
      ["GET", `${BASE_URL}/analysis/profile-summary`, null, { headers }],
    ]);
    dashboardDuration.add(Date.now() - t);

    const ok = responses.every((r) =>
      check(r, {
        "status ok":  (res) => res.status === 200 || res.status === 404,
        "não é 500":  (res) => res.status !== 500,
        "não é 429":  (res) => res.status !== 429,
      })
    );
    errorRate.add(!ok);
  });

  sleep(Math.random() * 4 + 2); // 2–6s pausa (simula uso real)
}
