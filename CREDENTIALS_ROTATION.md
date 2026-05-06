# 🔐 Guia: Rotação de Credenciais Sensíveis

## ⚠️ CRÍTICO — Credenciais Expostas Detectadas

As seguintes credenciais estavam localmente em `.env` e foram **removidas do arquivo de exemplo**:
- PostgreSQL (Supabase)
- Stripe Secret & Webhook Keys
- MercadoPago Access Tokens
- Gemini API Key
- Supabase ANON Key

---

## ✅ Ações Recomendadas

### 1️⃣ Rotacionar Credenciais Imediatamente

Você deve gerar **novas chaves** para cada serviço (as antigas estão potencialmente comprometidas):

#### **Supabase (PostgreSQL)**
```
1. Acesse: https://app.supabase.com
2. Projeto → Settings → Database
3. Clique em "Reset Password" para o usuário `postgres`
4. Atualize a senha em .env → ConnectionStrings:DefaultConnection
```

#### **Stripe**
```
1. Acesse: https://dashboard.stripe.com/apikeys
2. Em "Secret keys", clique em "Reveal"
3. Copie a chave e atualize .env → Stripe:SecretKey
4. Para Webhook Secret:
   - Vá para Settings → Webhooks
   - Delete o webhook antigo
   - Crie um novo e atualize .env → Stripe:WebhookSecret
```

#### **MercadoPago**
```
1. Acesse: https://www.mercadopago.com/developers/panel
2. Em "Credenciais", gere novo token de acesso
3. Atualize .env → MercadoPago:AccessToken (prod) e AccessTokenTest
```

#### **Gemini API**
```
1. Acesse: https://aistudio.google.com/apikey
2. Clique em "Create API Key"
3. Atualize .env → Gemini:ApiKey
```

---

### 2️⃣ Monitorar Atividade Suspeita

Verifique nos últimos dias:
- **Stripe**: Transações não autorizadas via dashboard
- **MercadoPago**: Cobranças estranhas no histórico
- **Supabase**: Conexões inusitadas (Logs → Database Logs)

---

### 3️⃣ Configurar `.env` Seguramente

**Nunca commit `.env` no repositório!**

Para novos devs:
```bash
# 1. Clone o repositório
git clone <repo>

# 2. Copie o exemplo
cp .env.example .env

# 3. Preencha com suas credenciais (NOT REAL ONES, use test keys)
# Para desenvolvimento local, use:
# - Stripe: test keys (pk_test_*, sk_test_*)
# - MercadoPago: sandbox tokens
# - Supabase: projeto de staging
```

---

### 4️⃣ Atualizar Render.yaml (Deploy)

Se estiver deployando em Render, use as **novas credenciais**:
```yaml
# Em render.yaml, as variáveis já estão configuradas com sync: false
# Atualize manualmente no painel Render:
# https://dashboard.render.com → Select Project → Environment
```

Vá para cada chave:
- `Gemini__ApiKey`
- `Stripe__SecretKey`
- `Stripe__WebhookSecret`
- `MercadoPago__AccessToken`
- `ConnectionStrings__DefaultConnection`

E atualize com os **novos valores**.

---

## 📋 Checklist

- [ ] Rotacionada senha PostgreSQL (Supabase)
- [ ] Gerada nova chave Stripe Secret
- [ ] Gerado novo webhook secret Stripe
- [ ] Gerado novo token MercadoPago
- [ ] Gerada nova chave Gemini API
- [ ] Atualizado `.env` localmente
- [ ] Atualizado Render.yaml (painel)
- [ ] Testado acesso ao banco de dados
- [ ] Testado pagamentos (Stripe + MercadoPago)
- [ ] Verificado histórico de transações para atividade suspeita

---

## 🛡️ Boas Práticas Daqui em Diante

1. **Nunca commit `.env`** — Use `.env.example` com placeholders
2. **Sincronize secrets via Render Dashboard** — Não via arquivo
3. **Rotacione credenciais periodicamente** (a cada 3-6 meses)
4. **Use variáveis de ambiente no CI/CD** — Nunca hardcode
5. **Monitore logs** — Configure alertas para atividade inusitada

---

## 📚 Referências

- [Supabase Docs](https://supabase.com/docs/guides/database/overview)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [MercadoPago Credentials](https://www.mercadopago.com.br/developers/es/guides/additional-content/your-integrations/credentials/)
- [Gemini API Setup](https://ai.google.dev/tutorials/setup)
