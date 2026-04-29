## When to Apply
SQL queries, schema design, indexes, query optimization, connection pooling, RLS, Postgres performance.

## Rule Categories

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## Usage
1. Read `SKILL.md` first
2. Load specific rule files from `references/` on demand

Each rule file has: rationale, bad/good SQL examples, optional EXPLAIN output, Supabase-specific notes.

Example references: `query-missing-indexes.md`, `schema-partial-indexes.md`, `_sections.md`

## Refs
- https://www.postgresql.org/docs/current/
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security