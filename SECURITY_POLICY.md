# 🔒 Políticas de Segurança — FaceGlow

## 1. Gerenciamento de Credenciais

### ✅ Permitido
- Usar variáveis de ambiente (`.env` local, **nunca commitado**)
- Usar secrets no Render.yaml (configurados via painel)
- Usar chaves de teste/sandbox para desenvolvimento

### ❌ PROIBIDO
- Committar `.env` com credenciais reais
- Hardcoding de chaves no código-fonte
- Expor chaves em comentários ou documentação
- Usar credenciais de produção em desenvolvimento local

---

## 2. Arquivo `.env`

### Estrutura Segura
```
1. `.env` — Ignorado pelo git, usado localmente
2. `.env.example` — Commitado com placeholders
3. Render.yaml — Secrets sincronizados via painel
```

### Checklist
- [ ] `.env` está no `.gitignore`
- [ ] Nunca fazer `git add .env`
- [ ] `.env.example` contém apenas placeholders (YOUR_*)
- [ ] Sincronizar secrets via Render Dashboard, nunca via arquivo

---

## 3. Credenciais Críticas (Status: REVISADAS)

| Serviço | Tipo | Localização | Prioridade |
|---------|------|-------------|-----------|
| Supabase (DB) | Password + Username | `.env` (local) | 🔴 CRÍTICA |
| Stripe | Secret Key + Webhook | `.env` (local) | 🔴 CRÍTICA |
| MercadoPago | Access Token | `.env` (local) | 🔴 CRÍTICA |
| Gemini | API Key | `.env` (local) | 🟡 ALTA |
| Supabase | ANON Key | `.env.example` (removida) | 🟡 ALTA |

---

## 4. Detectar Exposições

Se suspeitar de vazamento, procure em:
1. **Código**: `grep -r "sk_test_\|whsec_\|APP_USR_" src/`
2. **Docs**: Buscar por URLs com credenciais
3. **Git History**: `git log --all -S "secret_key_pattern"`
4. **Backups**: Verificar se `.env` foi copiado

---

## 5. Rotação de Credenciais

**Quando rotacionar:**
- ✓ Após detectar possível exposição
- ✓ Antes de fazer push para repo público
- ✓ A cada 6 meses (rotation policy)
- ✓ Quando onboard novo desenvolvedor

**Como rotacionar:** Ver [CREDENTIALS_ROTATION.md](./CREDENTIALS_ROTATION.md)

---

## 6. Acesso e Permissões

### Render Dashboard (Deploy)
- [ ] Apenas admins podem acessar Secrets
- [ ] Ativar 2FA para contas
- [ ] Auditar quem tem acesso

### Supabase
- [ ] Usar SSO/OAuth quando possível
- [ ] Criar usuários específicos por ambiente (dev/staging/prod)
- [ ] Revogar acesso de devs que saem do projeto

### Stripe & MercadoPago
- [ ] Usar restricted API keys por aplicação
- [ ] Desabilitar chaves não utilizadas
- [ ] Monitorar webhooks inusitados

---

## 7. Desenvolvimento Seguro

### Local Development
```bash
# ✓ Crie um arquivo .env COM valores de teste/sandbox
cp .env.example .env

# Preencha com chaves de teste:
# - Stripe: sk_test_*, pk_test_*
# - MercadoPago: sandbox token
# - Gemini: chave de teste
# - Supabase: projeto staging
```

### CI/CD (GitHub Actions, Render)
- Use variáveis de ambiente protegidas
- Nunca logue secrets em builds públicos
- Configure webhooks seguramente

---

## 8. Resposta a Incidentes

### Se credencial foi exposta:
1. **IMEDIATAMENTE**: Rotacione a credencial
2. **Verificar**: Logs de atividade suspeita (último dia)
3. **Notificar**: Notifique o time se for comprometimento
4. **Audit**: Procure por outras exposições similares
5. **Document**: Registre o incidente e ações tomadas

---

## 9. Ferramentas de Scanning

Para detectar secrets em repositórios:
```bash
# GitGuardian: https://www.gitguardian.com/
# TruffleHog: https://github.com/trufflesecurity/trufflehog
# git-secrets: https://github.com/awslabs/git-secrets

# Instalar git-secrets (recomendado)
brew install git-secrets
git secrets --install
```

---

## 10. Recursos

- [OWASP Secrets Management](https://owasp.org/www-community/injection/Path_Traversal)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [Supabase Security Guidelines](https://supabase.com/docs/guides/platform/security)
- [12 Factor App (Configuration)](https://12factor.net/config)

---

**Última atualização**: May 6, 2026  
**Próxima review**: November 6, 2026
