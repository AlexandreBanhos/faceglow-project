# 🗂️ Estrutura de Arquivos - Admin Module

## Hierarquia Final

```
faceglow-project/
│
├── backend/
│   └── SkinAnalysis.Api/
│       │
│       ├── Endpoints/
│       │   ├── AdminEndpoints.cs ⭐ (NOVO)
│       │   │   ├── MapAdminEndpoints() - Extensão method
│       │   │   ├── CheckAdminStatusHandler()
│       │   │   ├── SetupFirstAdminHandler()
│       │   │   └── PromoteUserToAdminHandler()
│       │   │
│       │   └── RecommendationEndpoints.cs
│       │
│       ├── Services/
│       │   ├── AdminService.cs ⭐ (NOVO)
│       │   │   ├── IsUserAdminAsync()
│       │   │   ├── AdminExistsAsync()
│       │   │   ├── SetupFirstAdminAsync()
│       │   │   ├── PromoteUserToAdminAsync()
│       │   │   └── ExtractUserIdFromClaims()
│       │   │
│       │   ├── GeminiAnalysisService.cs
│       │   ├── BillingService.cs
│       │   └── ... (outros serviços)
│       │
│       ├── DTOs/
│       │   ├── AdminProductDto.cs ⭐ (APRIMORADO)
│       │   │   ├── AdminStatusResponse (NOVO)
│       │   │   ├── AdminOperationResponse (NOVO)
│       │   │   ├── AdminErrorResponse (NOVO)
│       │   │   ├── AdminProductPageResponse (NOVO)
│       │   │   ├── AdminProductDto
│       │   │   ├── CreateAdminProductDto
│       │   │   └── UpdateAdminProductDto
│       │   │
│       │   └── ... (outros DTOs)
│       │
│       ├── Models/
│       │   ├── User.cs (com IsAdmin property)
│       │   ├── Product.cs (com Image Url property)
│       │   └── ... (outros modelos)
│       │
│       ├── Program.cs ⭐ (REFATORADO)
│       │   ├── ✅ Adicionado: builder.Services.AddScoped<AdminService>()
│       │   ├── ✅ Adicionado: app.MapAdminEndpoints()
│       │   └── ✅ Removido: 3 endpoints inline de admin
│       │
│       └── ... (outros arquivos)
│
├── src/
│   └── pages/
│       └── AdminProducts.tsx (usa AdminService no frontend)
│
├── ADMIN_MODULE_REFACTORING.md ⭐ (DOCUMENTAÇÃO COMPLETA)
├── REFACTORING_SUMMARY.md ⭐ (ESTE ARQUIVO)
└── ... (outros arquivos)
```

---

## 📄 Arquivos Modificados/Criados

### 1. **AdminEndpoints.cs** ⭐ NOVO
**Caminho**: `backend/SkinAnalysis.Api/Endpoints/AdminEndpoints.cs`  
**Tamanho**: ~200 linhas  
**Propósito**: Centralizar todos os endpoints de admin  

**Conteúdo**:
```csharp
namespace SkinAnalysis.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/admin")
            .WithTags("Admin")
            .WithOpenApi();

        group.MapGet("/me", CheckAdminStatusHandler)...
        group.MapPost("/setup-first-admin/{targetUserId:guid}", SetupFirstAdminHandler)...
        group.MapPost("/promote/{targetUserId:guid}", PromoteUserToAdminHandler)...
    }

    private static IResult CheckAdminStatusHandler(...)
    private static async Task<IResult> SetupFirstAdminHandler(...)
    private static async Task<IResult> PromoteUserToAdminHandler(...)
}
```

---

### 2. **AdminService.cs** ⭐ NOVO
**Caminho**: `backend/SkinAnalysis.Api/Services/AdminService.cs`  
**Tamanho**: ~150 linhas  
**Propósito**: Lógica de autorização e promoção de usuários  

**Conteúdo**:
```csharp
namespace SkinAnalysis.Api.Services;

public class AdminService
{
    public async Task<bool> IsUserAdminAsync(Guid userId, CancellationToken ct)
    public static Guid? ExtractUserIdFromClaims(ClaimsPrincipal user)
    public async Task<bool> AdminExistsAsync(CancellationToken ct)
    public async Task<(bool, string)> SetupFirstAdminAsync(Guid userId, CancellationToken ct)
    public async Task<(bool, string)> PromoteUserToAdminAsync(Guid requesterId, Guid targetId, CancellationToken ct)
}
```

---

### 3. **AdminProductDTO.cs** ⭐ APRIMORADO
**Caminho**: `backend/SkinAnalysis.Api/DTOs/AdminProductDto.cs`  
**Tamanho**: ~80 linhas (adiconados 4 novos DTOs)  
**Mudanças**:
- ✅ `AdminStatusResponse` (NOVO)
- ✅ `AdminOperationResponse` (NOVO)
- ✅ `AdminErrorResponse` (NOVO)
- ✅ `AdminProductPageResponse` (NOVO)
- Todos com XML comments

---

### 4. **Program.cs** ⭐ REFATORADO
**Caminho**: `backend/SkinAnalysis.Api/Program.cs`  
**Mudanças** (3 alterações):

#### ✅ Adição de AdminService ao DI (linha ~159)
```csharp
builder.Services.AddScoped<AdminService>();
```

#### ✅ Mapeamento de endpoints (linha ~1798)
```csharp
// Map admin endpoints (authorization, user promotion, CRUD operations)
app.MapAdminEndpoints();
```

#### ✅ Remoção de endpoints inline (linhas ~1798-1884)
❌ REMOVIDOS 3 blocos de code (~90 linhas):
- `app.MapGet("/admin/me", ...)`
- `app.MapPost("/admin/setup-first-admin", ...)`
- `app.MapPost("/admin/promote", ...)`

**Resultado**: Program.cs mais limpo (-90 LOC de admin logic)

---

## 🔄 Mapeamento de Imports

### AdminEndpoints.cs
```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using SkinAnalysis.Api.Services;
```

### AdminService.cs
```csharp
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Data;
using SkinAnalysis.Api.Models;
```

---

## 📊 Comparação: Antes vs Depois

### Organização de Endpoints

**ANTES**:
```
Program.cs
├── Endpoints inline de admin (~90 linhas)
├── Endpoints CRUD de produtos (~200 linhas)
├── Endpoints de análise (~500 linhas)
└── ... (tudo misturado)
```

**DEPOIS**:
```
AdminEndpoints.cs (extensão method)
├── CheckAdminStatusHandler()
├── SetupFirstAdminHandler()
└── PromoteUserToAdminHandler()

Program.cs (limpo)
├── app.MapAdminEndpoints()
├── app.MapProductEndpoints() [futura refatoração]
└── app.MapAnalysisEndpoints() [futura refatoração]
```

### Lógica de Autorização

**ANTES**:
```csharp
// Inline no Program.cs, duplicada em 3 endpoints
var userId = user.FindFirst(...)?.Value;
if (!Guid.TryParse(userId, out var guid)) return Unauthorized();
var isAdmin = await IsUserAdminAsync(guid, dbContext, ct);
```

**DEPOIS**:
```csharp
// AdminService - reutilizável
var userId = AdminService.ExtractUserIdFromClaims(user);
if (userId == null) return Unauthorized();
var isAdmin = await adminService.IsUserAdminAsync(userId.Value, ct);
```

---

## ✅ Checklist de Verificação

- [x] AdminEndpoints.cs criado com handlers bem documentados
- [x] AdminService.cs criado com lógica centralizada
- [x] DTOs aprimorados com novos tipos
- [x] Program.cs refatorado (Admin service adicionado ao DI)
- [x] Program.cs refatorado (MapAdminEndpoints() chamado)
- [x] Program.cs refatorado (Endpoints inline removidos)
- [x] Build bem-sucedido (`dotnet build --no-restore`)
- [x] Backend iniciado sem erros
- [x] `/health` respondendo normalmente
- [x] Documentação criada (ADMIN_MODULE_REFACTORING.md)
- [x] Sumário criado (REFACTORING_SUMMARY.md)
- [x] Estrutura documentada (este arquivo)

---

## 🚀 Próximas Refatorações Recomendadas

### Fase 2: Product Management
```csharp
// Endpoints/ProductEndpoints.cs
public static void MapProductEndpoints(this WebApplication app)
{
    app.MapGroup("/admin/products")
        .MapGet("", GetProductsHandler)
        .MapPost("", CreateProductHandler)
        .MapPut("{id}", UpdateProductHandler)
        .MapDelete("{id}", DeleteProductHandler);
}

// Services/ProductService.cs
public class ProductService
{
    public async Task<List<Product>> GetProductsAsync(...)
    public async Task<Product> CreateProductAsync(...)
    public async Task UpdateProductAsync(...)
    public async Task DeleteProductAsync(...)
}
```

### Fase 3: Analysis Management
```csharp
// Endpoints/AnalysisEndpoints.cs
// Endpoints/RecommendationEndpoints.cs (já existe)
```

---

## 📝 Notas de Manutenção

1. **AdminService é Scoped**: Cria nova instância por request (ideal para autorização)
2. **Logging no AdminService**: Sempre loga operação com user IDs
3. **DTOs são Records**: Imutáveis, performance melhor
4. **Endpoints agrupados**: Todos sob `/admin` com tags para Swagger
5. **XML Comments**: Todos as públicas classes documentadas

---

**Atualizado**: 7 de Abril de 2026  
**Status**: ✅ Refatoração Completa
