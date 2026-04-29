# Admin Module Refactoring - Segurança, Manutenção e Organização

## Resumo das Mudanças

Reorganização da solução para garantir **segurança**, **fácil manutenção** e **organização clara** do código de admin.

## Arquivos Criados/Modificados

### 1. **AdminEndpoints.cs** (Novo)
📂 `backend/SkinAnalysis.Api/Endpoints/AdminEndpoints.cs`

- **Propósito**: Centralizar todos os endpoints de admin em um único lugar
- **Padrão**: Extensão method `MapAdminEndpoints()` para manter coesão com `RecommendationEndpoints`
- **Endpoints**:
  - `GET /admin/me` - Verifica status de admin (sem query ao BD)
  - `POST /admin/setup-first-admin/{userId}` - Bootstrap do primeiro admin
  - `POST /admin/promote/{userId}` - Promove usuário a admin (requer autorização)

**Benefício**: Endpoints bem documentados com XML comments, validação de inputs, tratamento de erros, e logging adequado.

---

### 2. **AdminService.cs** (Novo)
📂 `backend/SkinAnalysis.Api/Services/AdminService.cs`

- **Propósito**: Service para lógica de autorização e promoção de usuários
- **Responsabilidades**:
  - `IsUserAdminAsync()` - Verifica se usuário é admin
  - `AdminExistsAsync()` - Verifica se algum admin existe
  - `SetupFirstAdminAsync()` - Promove primeiro admin (bootstrap)
  - `PromoteUserToAdminAsync()` - Promove usuário a admin (requer admin)
  - `ExtractUserIdFromClaims()` - Extrai ID do JWT

**Benefício**: Logging detalhado, tratamento de exceções, reutilizável em outros endpoints.

---

### 3. **Program.cs** (Refatorado)
📂 `backend/SkinAnalysis.Api/Program.cs`

**Mudanças**:

✅ **Adicionado**:
- Registro de `AdminService` no DI: `builder.Services.AddScoped<AdminService>()`
- Chamada para mapear endpoints: `app.MapAdminEndpoints()`

✅ **Removido**:
- 3 endpoints inline de admin (`/admin/me`, `/admin/setup-first-admin`, `/admin/promote`)
- Lógica duplicada de autorização

✅ **Benefício**: Program.cs mais limpo, lógica centralizada e fácil de manter.

---

### 4. **AdminProductDto.cs** (Aprimorado)
📂 `backend/SkinAnalysis.Api/DTOs/AdminProductDto.cs`

**Adicionado**:
- `AdminStatusResponse` - Response para `/admin/me`
- `AdminOperationResponse` - Response para promoções
- `AdminErrorResponse` - Respostas de erro padronizadas
- `AdminProductPageResponse` - Pagination helper

**Benefício**: DTOs bem documentados com XML comments para toda a API.

---

## Arquitetura & Padrões

### Fluxo de Requisição

```
Request (com JWT)
    ↓
AdminEndpoints (handler)
    ↓ validação + extração de ID
AdminService (lógica)
    ↓
AppDbContext (BD)
    ↓
Response (JSON com logging)
```

### Segurança Implementada

1. **Validação de Inputs**
   - UUID vazio é rejeitado
   - JWT claims sempre validados
   - Mensagens de erro genéricas para não expor dados internos

2. **Autenticação & Autorização**
   - Endpoints protegidos com `RequireAuthorization()`
   - Status de admin verificado antes de promover usuários
   - Bootstrap só funciona se nenhum admin existe

3. **Logging Estruturado**
   - Cada operação registra ID do usuário
   - Tentativas não autorizadas são detectadas
   - Erros foram tratados e logados

4. **Tratamento de Erros**
   - OperationCanceledException → 408 (Timeout)
   - Unauthorized → 401
   - Forbidden → 403
   - Validation errors → 400

---

## Manutenibilidade

### Separação de Responsabilidades

| Componente | Responsabilidade |
|---|---|
| **AdminEndpoints** | HTTP handling, validação, respostas |
| **AdminService** | Lógica de negócio, autorização, DB |
| **DTOs** | Contratos de API |
| **Program.cs** | Registro no DI, mapeamento |

### Fácil Extensão

Adicionar novo endpoint de admin é simples:

```csharp
group.MapPost("/new-action/{userId:guid}", NewActionHandler)
    .WithName("NewAdminAction")
    .WithDescription("...")
    .RequireAuthorization(); // se precisa auth

private static async Task<IResult> NewActionHandler(
    Guid param,
    AdminService adminService,
    ILogger<AdminService> logger,
    CancellationToken cancellationToken)
{
    // Implementação aqui
}
```

---

## Documentação & Diálogo de API

### Pontos de Entrada

**1. `/admin/me` (GET)**
```
Autenticado: Requer JWT
Função: Verificar se usuário é admin
Resposta: { "isAdmin": true|false }
```

**2. `/admin/setup-first-admin/{userId}` (POST)**
```
Autenticado: NÃO (apenas bootstrap)
Função: Promover primeiro usuário a admin
Restrição: Falha se admin já existe
Resposta: 
  Sucesso: { "message": "...", "isAdmin": true }
  Erro: { "error": "..." }
```

**3. `/admin/promote/{userId}` (POST)**
```
Autenticado: SIM (requer ser admin)
Função: Promover usuário x para admin
Restrição: Apenas admins podem fazer isso
Resposta: 
  Sucesso: { "message": "...", "isAdmin": true }
  Erro: 401/403
```

---

## Próximos Passos (Opcional)

1. **Refatorar endpoints CRUD de produtos**
   - Mover para `ProductEndpoints.cs`
   - Centralizar lógica em `ProductService`

2. **Adicionar testes unitários**
   - `AdminServiceTests.cs`
   - `AdminEndpointsTests.cs`

3. **Auditoria & Compliance**
   - Registrar todas as promoções de admin
   - Histórico de alterações

4. **Rate Limiting**
   - Limitar tentativas de login/promoção
   - Proteger contra brute force

---

## Como Testar

### Backend Build
```bash
cd backend/SkinAnalysis.Api
dotnet build --no-restore
```

### Endpoints (via PowerShell)
```powershell
# Check admin status
$token = "seu-jwt-aqui"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:5172/admin/me" -Headers $headers -UseBasicParsing

# Setup first admin
$userId = "57b9be3c-9834-4a62-951a-6f8d16d3c92b"
Invoke-WebRequest -Uri "http://localhost:5172/admin/setup-first-admin/$userId" -Method Post -UseBasicParsing

# Promote user
Invoke-WebRequest -Uri "http://localhost:5172/admin/promote/$userId" -Method Post -Headers $headers -UseBasicParsing
```

---

## Benefícios Alcançados

✅ **Segurança**
- Validação completa de inputs
- Autorização em camadas
- Logging de tentativas suspeitas

✅ **Manutenção**
- Código organizado e testável
- Separação clara de responsabilidades
- Fácil debugar e estender

✅ **Organização**
- Padrão consistente com RecommendationEndpoints
- DTOs bem documentados
- Endpoints centralizados eme um arquivo

✅ **Documentação**
- XML comments em todas as classes públicas
- Exemplos de uso nos handlers
- Este documento de referência
