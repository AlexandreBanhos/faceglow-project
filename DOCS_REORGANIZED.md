# 📚 Documentação Reorganizada

A documentação foi organizada em **`docs/`** para manter a raiz limpa.

## ✅ Raiz (mantém apenas 2 arquivos)
- **README.md** — Info principal do projeto
- **CLAUDE.md** — Contexto obrigatório para AI

## 📍 Nova Localização dos Arquivos

Todos os `.md` foram migrados para **`docs/`** com a seguinte estrutura:

```
docs/
├── setup/                               # Configuração & Deploy
│   ├── README.md (index)
│   ├── environment.md                   # ← SETUP_DEV_ENVIRONMENT.md
│   ├── database.md                      # ← DATABASE_*.md + DOCKER_POSTGRES_GUIDE.md
│   ├── storage.md                       # ← SUPABASE_BUCKET_CONFIG.md
│   └── payments.md                      # ← PAYMENT_*.md
│
├── architecture/                        # Design & Schemas
│   ├── README.md (index)
│   ├── structure.md                     # ← STRUCTURE_DOCUMENTATION.md
│   ├── build-status.md                  # ← BUILD_STATUS.md
│   └── schema.md                        # ← DATABASE_SCHEMA_*.md
│
├── implementation/                      # Logs & Detalhes
│   ├── README.md (index)
│   ├── admin-module-refactoring.md      # ← ADMIN_MODULE_REFACTORING.md
│   ├── loading-spinner.md               # ← LOADING_SPINNER_IMPLEMENTATION.md
│   └── refactoring-summary.md           # ← REFACTORING_SUMMARY.md
│
├── archive/                             # Histórico
│   ├── README.md (index)
│   └── final-summary.md                 # ← FINAL_SUMMARY.md
│
├── guides/                              # (Existentes)
├── references/                          # (Existentes)
└── README.md                            # ← Índice principal
```

## 🔗 Acesso Rápido

- **Setup & Config**: [`docs/setup/`](docs/setup/)
- **Architecture & Design**: [`docs/architecture/`](docs/architecture/)
- **Implementações**: [`docs/implementation/`](docs/implementation/)
- **Índice Completo**: [`docs/README.md`](docs/README.md)

## 📝 Arquivos Originais (Raiz)

Os arquivos `.md` originais da raiz ainda existem por compatibilidade.
Eles serão removidos em futuras limpezas — use **`docs/`** como fonte única de verdade.

---

**Atualize seus bookmarks para `docs/README.md`** 📍
