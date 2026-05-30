/**
 * Dashboard load test — simula 50 usuários simultâneos navegando pelo app.
 * Mede se o Render aguenta carga real sem degradar.
 *
 * Uso:
 *   k6 run -e BASE_URL=http://localhost:5172 -e TOKEN=seu_jwt tests/load/dashboard.js
 *
 * Interpretação:
 *   p(95) < 2000ms = aceitável para cold start do Render free tier
 *   p(95) < 800ms  = bom
 *   error rate < 1% = aprovado
 */
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const dashboardDuration = new Trend("dashboard_load_ms");

export const options = {
  stages: [
    { duration: "30s", target: 10 },   // ramp up
    { duration: "2m",  target: 50 },   // carga sustentada
    { duration: "30s", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    errors: ["rate<0.02"],
    dashboard_load_ms: ["p(95)<2000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5172";
const TOKEN = __ENV.TOKEN || "";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  group("dashboard mount", () => {
    const start = Date.now();

    // Requisições paralelas que o frontend faz ao montar o dashboard
    const responses = http.batch([
      ["GET", `${BASE_URL}/billing/status`,          null, { headers }],
      ["GET", `${BASE_URL}/analysis/credits`,         null, { headers }],
      ["GET", `${BASE_URL}/analysis/dashboard`,       null, { headers }],
      ["GET", `${BASE_URL}/analysis/profile-summary`, null, { headers }],
    ]);

    dashboardDuration.add(Date.now() - start);

    const ok = responses.every((r) =>
      check(r, {
        "status 200 ou 404": (res) => res.status === 200 || res.status === 404,
        "não é 500": (res) => res.status !== 500,
        "não é 429": (res) => res.status !== 429,
      })
    );
    errorRate.add(!ok);
  });

  sleep(Math.random() * 3 + 1); // 1–4s de pausa (simula leitura do usuário)
}
