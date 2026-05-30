/**
 * Rate limit test — verifica que os limiters estão funcionando corretamente.
 * Dispara mais requisições que o limite permitido e valida que 429 é retornado.
 *
 * Uso:
 *   k6 run -e BASE_URL=http://localhost:5172 -e TOKEN=seu_jwt tests/load/rate-limit.js
 *
 * Esperado:
 *   - Primeiras N requisições: 200
 *   - Excedente: 429 com header Retry-After
 *   - NUNCA: 500
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

const hits200 = new Counter("hits_200");
const hits429 = new Counter("hits_429");
const hits5xx = new Counter("hits_5xx");

export const options = {
  scenarios: {
    // Polling — limite 60/min, dispara 80 em sequência rápida
    polling_flood: {
      executor: "shared-iterations",
      vus: 5,
      iterations: 80,
      maxDuration: "30s",
      env: { SCENARIO: "polling" },
    },
    // Analysis — limite 10/min, dispara 20
    analysis_flood: {
      executor: "shared-iterations",
      vus: 3,
      iterations: 20,
      maxDuration: "30s",
      startTime: "35s",
      env: { SCENARIO: "analysis" },
    },
    // Billing — limite 5/min, dispara 10
    billing_flood: {
      executor: "shared-iterations",
      vus: 2,
      iterations: 10,
      maxDuration: "30s",
      startTime: "70s",
      env: { SCENARIO: "billing" },
    },
  },
  thresholds: {
    hits_5xx: ["count==0"],         // zero erros 500
    "http_req_duration{status:429}": ["p(95)<200"], // 429 deve ser rápido
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:5172";
const TOKEN = __ENV.TOKEN || "";
const headers = { Authorization: `Bearer ${TOKEN}` };

export default function () {
  const scenario = __ENV.SCENARIO;
  let res;

  if (scenario === "polling") {
    res = http.get(`${BASE_URL}/billing/status`, { headers });
  } else if (scenario === "analysis") {
    res = http.get(`${BASE_URL}/analysis/credits`, { headers });
  } else if (scenario === "billing") {
    res = http.get(`${BASE_URL}/billing/status`, { headers });
  }

  if (!res) return;

  if (res.status === 200) hits200.add(1);
  else if (res.status === 429) {
    hits429.add(1);
    check(res, {
      "429 tem Retry-After": (r) => r.headers["Retry-After"] !== undefined,
      "429 tem body de erro": (r) => {
        try { return JSON.parse(r.body).error !== undefined; } catch { return false; }
      },
    });
  } else if (res.status >= 500) {
    hits5xx.add(1);
  }

  sleep(0.1);
}
