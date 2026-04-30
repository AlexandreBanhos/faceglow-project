# 🚀 Guia de Deploy - Vercel + Render

## Status
- ✅ Repositório: https://github.com/AlexandreBanhos/faceglow-project
- ✅ Branch: main
- ✅ Código: Sincronizado

---

## 1️⃣ Deploy Backend (Render)

### Passo 1: Criar conta Render
- Ir para https://render.com
- Sign up com GitHub
- Autorizar acesso ao repositório

### Passo 2: Criar Web Service
1. Dashboard → New → Web Service
2. Conectar repositório `faceglow-project`
3. Configurar:
   - **Name:** `faceglow-api`
   - **Root Directory:** `backend/SkinAnalysis.Api`
   - **Environment:** `.NET 8`
   - **Build Command:** `dotnet build -c Release`
   - **Start Command:** `dotnet SkinAnalysis.Api.dll`
   - **Plan:** Standard (recomendado) ou Starter

### Passo 3: Adicionar Variáveis de Ambiente
No dashboard do Render, ir para Settings → Environment:

```
Supabase:Url=https://hemoqtqlczjgtrfibudj.supabase.co
ConnectionStrings:DefaultConnection=Host=aws-1-sa-east-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.hemoqtqlczjgtrfibudj;Password=<SEU_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true
Gemini:ApiKey=AIzaSyDyhr5xhnHDovVJ5pqE6JBhPt34aUQSzY4
Stripe:SecretKey=sk_test_...
Stripe:PublishableKey=pk_test_...
MercadoPago:AccessToken=APP_USR-...
MercadoPago:ClientId=...
Cors:AllowedOrigins=https://faceglow.vercel.app,http://localhost:3000,http://localhost:8081
JWT:Secret=<GERE_UMA_SECRET_FORTE>
JWT:Issuer=faceglow-api
JWT:Audience=faceglow-web
```

### Passo 4: Deploy
- Clicar em "Create Web Service"
- Render faz auto-deploy na primeira vez
- Aguardar ~2-3 minutos

**Resultado:** API rodando em `https://faceglow-api.onrender.com`

---

## 2️⃣ Deploy Frontend (Vercel)

### Passo 1: Criar conta Vercel
- Ir para https://vercel.com
- Sign up com GitHub
- Autorizar acesso

### Passo 2: Importar Projeto
1. Dashboard → Add New → Project
2. Selecionar repositório `faceglow-project`
3. Configurar:
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (raiz)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Passo 3: Adicionar Variáveis de Ambiente
No "Environment Variables":

```
VITE_SUPABASE_URL=https://hemoqtqlczjgtrfibudj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlbW9xdHFsY3pqZ3RyZmlidWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODgzNDksImV4cCI6MjA5MDY2NDM0OX0.hqNLSdRZ8OxVOyBcEeYTrXWF6e4na_VefiN-sXN1JHA
VITE_API_URL=https://faceglow-api.onrender.com
VITE_ENVIRONMENT=production
```

### Passo 4: Deploy
- Clicar em "Deploy"
- Vercel faz build e deploy automaticamente
- Aguardar ~2-3 minutos

**Resultado:** App rodando em `https://<SEU_PROJECT>.vercel.app`

---

## 3️⃣ Configurações Importantes

### CORS - Backend
O backend deve aceitar requisições do frontend:
```json
"Cors:AllowedOrigins": [
  "https://<seu-vercel-app>.vercel.app",
  "https://faceglow.vercel.app",
  "http://localhost:3000",
  "http://localhost:8081"
]
```

### Variáveis de Ambiente - Frontend
Criar `.env.production` na raiz:
```
VITE_SUPABASE_URL=https://hemoqtqlczjgtrfibudj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://faceglow-api.onrender.com
VITE_ENVIRONMENT=production
```

### Database - Supabase
Ja está configurado em:
- Projeto: `hemoqtqlczjgtrfibudj`
- Database: PostgreSQL (aws-1-sa-east-1.pooler.supabase.com)
- Nenhuma ação necessária

---

## 4️⃣ Monitoramento

### Verificar Backend
```bash
# Testar API
curl https://faceglow-api.onrender.com/health

# Testar auth
curl -X POST https://faceglow-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

### Verificar Frontend
```bash
# Apenas acessar a URL
https://<seu-vercel-app>.vercel.app
```

### Logs
- **Render:** Dashboard → Logs (tail real-time)
- **Vercel:** Dashboard → Deployments → Logs
- **Supabase:** https://app.supabase.com → Logs

---

## 5️⃣ Troubleshooting

### Erro: "Cannot find module"
**Solução:** Verificar que `.env` está configurado no Render

### Erro: "CORS policy"
**Solução:** Adicionar URL do frontend em `Cors:AllowedOrigins`

### Erro: "Connection refused" (backend)
**Solução:** Verificar que variáveis de environment estão corretas no Render

### Erro: "Supabase not configured"
**Solução:** Confirmar que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão no Vercel

---

## 6️⃣ Checklist Final

Deploy Backend (Render):
- [ ] Criar Web Service
- [ ] Adicionar environment variables
- [ ] Aguardar deploy completar
- [ ] Testar `/health` endpoint
- [ ] Copiar URL da API (ex: `https://faceglow-api.onrender.com`)

Deploy Frontend (Vercel):
- [ ] Importar repositório
- [ ] Adicionar environment variables
- [ ] Incluir `VITE_API_URL` com URL do Render
- [ ] Aguardar deploy completar
- [ ] Acessar app pelo Vercel URL

Pós-Deploy:
- [ ] Testar signup/login
- [ ] Testar upload de imagem
- [ ] Testar análise de pele
- [ ] Monitorar logs para erros

---

## 7️⃣ Próximos Passos

### Auto-Deploy
Ambos Render e Vercel fazem auto-deploy quando você faz push em `main`:
```bash
git push origin main
# Render: Auto-rebuild em 1-2 minutos
# Vercel: Auto-rebuild em 1-2 minutos
```

### Domínios Customizados
1. **Vercel:** Adicionar domínio em Project Settings → Domains
2. **Render:** Adicionar domínio em Web Service Settings → Custom Domain

### SSL/TLS
Ambos incluem certificado SSL automaticamente ✅

### Backup do Banco
Supabase faz backups automáticos. Para backup manual:
1. Ir em https://app.supabase.com
2. Database → Backups
3. Clicar "Create backup"

---

## 📞 URLs para Referência

- **Render Dashboard:** https://dashboard.render.com
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **GitHub Repositório:** https://github.com/AlexandreBanhos/faceglow-project

---

**Deploy iniciado! Você está saindo do localhost e indo para produção! 🎉**
