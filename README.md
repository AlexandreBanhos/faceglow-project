# FaceGlow Deploy Guide

## ?? Documentação

Documentação de setup e referência está em `docs/` (local apenas, não versionada).

- **Payment Setup**: `docs/payment-setup/`
- **Guides**: `docs/guides/`
- **References**: `docs/references/`

---

## Stack

- Frontend: React + Vite on Vercel (free)
- Backend: ASP.NET Core on Render (free)
- Domain: Namecheap (`faceglow-soora.me`)

## 1) Deploy Backend on Render

1. Push this repository to GitHub.
2. In Render, create a new `Blueprint` and select this repo.
3. Render will detect [render.yaml](render.yaml).
4. Set secret environment variables in Render dashboard:
	- `Supabase__Url`
	- `ConnectionStrings__DefaultConnection`
	- `Stripe__SecretKey`
	- `Stripe__PublishableKey`
	- `Stripe__WebhookSecret`
	- `Stripe__SuccessUrl`
	- `Stripe__CancelUrl`
	- `MercadoPago__AccessToken`
	- `MercadoPago__NotificationUrl`
	- `Frontend__PremiumUrl`
	- `Frontend__PremiumPendingUrl`
	- `Frontend__PremiumCancelUrl`
	- `Cors__AllowedOrigins__0`
5. Wait for deploy and copy the backend URL, for example:
	- `https://faceglow-api.onrender.com`

## 2) Configure Webhooks

- Stripe webhook URL:
  - `https://faceglow-api.onrender.com/billing/webhook/stripe`
- Mercado Pago webhook URL:
  - `https://faceglow-api.onrender.com/billing/webhook/mercadopago`

## 3) Deploy Frontend on Vercel

1. Import the same repo in Vercel.
2. Framework preset: `Vite`.
3. Add frontend env vars:
	- `VITE_API_BASE_URL=https://faceglow-api.onrender.com`
	- `VITE_SUPABASE_URL=...`
	- `VITE_SUPABASE_ANON_KEY=...`
4. Deploy and copy generated URL, for example:
	- `https://faceglow.vercel.app`

The SPA rewrite is already configured in [vercel.json](vercel.json).

## 4) Connect Domain in Namecheap

Suggested subdomains:

- `app.faceglow-soora.me` -> frontend (Vercel)
- `api.faceglow-soora.me` -> backend (Render)

DNS records in Namecheap:

- `CNAME` `app` -> Vercel target shown in project domains setup
- `CNAME` `api` -> backend host from Render (without https)

After DNS propagation, set final URLs in backend env:

- `Stripe__SuccessUrl=https://app.faceglow-soora.me/premium/success?session_id={CHECKOUT_SESSION_ID}`
- `Stripe__CancelUrl=https://app.faceglow-soora.me/premium/cancel`
- `MercadoPago__NotificationUrl=https://api.faceglow-soora.me/billing/webhook/mercadopago`
- `Frontend__PremiumUrl=https://app.faceglow-soora.me/premium`
- `Frontend__PremiumPendingUrl=https://app.faceglow-soora.me/premium/pending`
- `Frontend__PremiumCancelUrl=https://app.faceglow-soora.me/premium/cancel`
- `Cors__AllowedOrigins__0=https://app.faceglow-soora.me`

## 5) Production Safety Notes

- For production payments, keep backend always available (avoid sleeping instances).
- Do not use local URLs (`localhost`) in production Stripe/Mercado Pago callback settings.
- Keep tokens only in platform secrets, never in committed files.
