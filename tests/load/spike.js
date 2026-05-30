/**
 * Spike test — simula pico súbito de tráfego (ex: lançamento, post viral).
 * Sobe de 0 para 200 VUs em 30s, mantém 1 minuto, desce.
 * Revela onde o Render/Supabase começa a engasgar.
 *
 * Uso:
 *   k6 run -e BASE_URL=https://seu-backend.onrender.com -e TOKEN=jwt tests/load/spike.js
 *
 * Sinais de problema:
 *   - p(99) > 10s      → connection pool esgotado ou cold start
 *   - error rate > 5%  → backend derrubando conexões
 *   - 503/502 em massa → Render não aguenta o pico
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errorRate = new Rate("errors");

export const options = {
  stages: [
    { duration: "30s", target: 200 },  // spike súbito
    { duration: "1m",  target: 200 },  // sustenta
    { duration: "30s", target: 0 },    // desce
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000", "p(99)<10000"],
    errors: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5172";
const TOKEN = __ENV.TOKEN || "";
const headers = { Authorization: `Bearer ${TOKEN}` };

export default function () {
  // Rota mais leve possível para medir capacidade bruta
  const res = http.get(`${BASE_URL}/health`);
  errorRate.add(
    !check(res, {
      "status 200": (r) => r.status === 200,
      "< 2s":       (r) => r.timings.duration < 2000,
    })
  );
  sleep(0.5);
}
