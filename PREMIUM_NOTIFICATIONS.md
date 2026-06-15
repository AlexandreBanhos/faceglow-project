# Premium Notifications - Guia de Configuração

Receba notificações por email sempre que um novo usuário ativar o plano premium.

## Variáveis de Ambiente Necessárias

### Email SMTP
Configure seu serviço de email (Gmail, SendGrid, etc):

```bash
Email__SmtpHost=smtp.gmail.com
Email__SmtpPort=587
Email__SmtpUser=seu-email@gmail.com
Email__SmtpPassword=sua-senha-ou-app-password
Email__FromEmail=seu-email@gmail.com
```

### Notificações
```bash
Notifications__AdminEmail=seu-email@gmail.com
```

## Exemplo com Gmail

1. **Ativar "Aplicativos com acesso menor seguro"** ou usar **App Password**:
   - Ir para: https://myaccount.google.com/apppasswords
   - Selecionar "Mail" e "Windows Computer" (ou seu dispositivo)
   - Gerar uma senha de 16 caracteres
   - Usar essa senha em `Email__SmtpPassword`

2. **Configurar variáveis**:
```bash
Email__SmtpHost=smtp.gmail.com
Email__SmtpPort=587
Email__SmtpUser=seu-email@gmail.com
Email__SmtpPassword=xxxx xxxx xxxx xxxx  # (16 caracteres)
Email__FromEmail=seu-email@gmail.com
Notifications__AdminEmail=seu-email@gmail.com
```

## Exemplo com SendGrid

1. **Criar API Key** em https://app.sendgrid.com/settings/api_keys
2. **Configurar variáveis**:
```bash
Email__SmtpHost=smtp.sendgrid.net
Email__SmtpPort=587
Email__SmtpUser=apikey
Email__SmtpPassword=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # (sua API key)
Email__FromEmail=seu-email@seudominio.com
Notifications__AdminEmail=admin@seudominio.com
```

## O que é notificado

Quando um usuário **ativar o plano premium** (pagamento confirmado), você recebe um email com:

- ✅ ID do usuário
- ✅ Email do usuário
- ✅ Nome do usuário
- ✅ Plano ativado (Premium Mensal, Premium Anual, etc)
- ✅ Gateway de pagamento (Stripe, Mercado Pago PIX/Cartão)
- ✅ Valor pago
- ✅ Data/hora da ativação

## Testando em Desenvolvimento

Para testar localmente sem usar email real, você pode:

1. **Usar MailHog** (emulador SMTP local):
```bash
# Instalar MailHog
# https://github.com/mailhog/MailHog

# Configurar em appsettings.json
Email__SmtpHost=localhost
Email__SmtpPort=1025
Email__FromEmail=test@faceglow.local
Notifications__AdminEmail=admin@faceglow.local
```

2. **Desabilitar email (opcional)**:
Se não configurar `Notifications__AdminEmail`, as notificações serão **silenciadas** (apenas log).

## Troubleshooting

### "Email service not configured"
Verifique se `Email__SmtpHost` e `Email__FromEmail` estão definidos.

### "Admin email not configured"
Defina `Notifications__AdminEmail` com seu email.

### Erro de autenticação SMTP
- Verifique username/password
- No Gmail, use uma **App Password** (não a senha da conta)
- Certifique-se de que "Acesso a aplicativos menos seguros" está habilitado

### Email não recebido
- Verifique a pasta de **Spam/Junk**
- Veja os logs do backend: `logger.LogError(...)`
- Confirme que o email foi enviado com sucesso no log

## Variáveis de Ambiente Completas

```dotenv
# Email Configuration
Email__SmtpHost=smtp.gmail.com
Email__SmtpPort=587
Email__SmtpUser=seu-email@gmail.com
Email__SmtpPassword=app-password-de-16-caracteres
Email__FromEmail=seu-email@gmail.com

# Notifications
Notifications__AdminEmail=seu-email@gmail.com

# Exemplo para produção (Render, Vercel, etc):
# Adicione essas variáveis no painel de "Environment Variables"
```
