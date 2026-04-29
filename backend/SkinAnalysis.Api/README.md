# SkinAnalysis API (.NET 8)

Minimal, production-ready API for AI-powered skin analysis.

## Stack choices

- .NET 8 + Minimal API
- EF Core + Npgsql for PostgreSQL (Supabase)
- HttpClient for OpenAI Vision call

Why EF Core here: it keeps persistence simple and strongly typed, supports async out of the box, and is straightforward for one-to-many save operations (analysis + recommendations) with transaction safety.

## Endpoint

POST /analysis

Request body:

{
  "userId": "7a3b2e08-2e2b-4711-91b8-57b89257a4d0",
  "imageUrl": "https://your-supabase-storage-url/image.jpg"
}

Response example:

{
  "id": "fa36ab13-6e1e-4f15-9773-ff9b5ea8d1e2",
  "userId": "7a3b2e08-2e2b-4711-91b8-57b89257a4d0",
  "imageUrl": "https://your-supabase-storage-url/image.jpg",
  "skinType": "combination",
  "acneScore": 4,
  "oilinessScore": 6,
  "darkSpotsScore": 3,
  "overallScore": 78,
  "createdAtUtc": "2026-04-01T21:23:17.0000000Z",
  "recommendations": [
    {
      "type": "best",
      "product": "Niacinamide Serum 10%",
      "description": "Helps balance oil and reduce acne lesions."
    },
    {
      "type": "premium",
      "product": "Retinal Night Complex",
      "description": "Improves tone and texture with high-performance retinal."
    },
    {
      "type": "value",
      "product": "Gentle Gel Cleanser",
      "description": "Budget-friendly daily cleanser for combination skin."
    }
  ]
}

## Local run

1. Open backend/SkinAnalysis.Api.
2. Set values in appsettings.Development.json:
   - ConnectionStrings:DefaultConnection
   - OpenAI:ApiKey
3. Restore and build:

   dotnet restore
   dotnet build

4. Create database schema.

   Option A (recommended): EF migrations
   - Install tool: dotnet tool install --global dotnet-ef
   - Create migration: dotnet ef migrations add InitialCreate
   - Apply migration: dotnet ef database update

   Option B: create tables manually in Supabase/PostgreSQL based on entities:
   - analysis
   - recommendations (FK to analysis.id)

5. Run API:

   dotnet run

6. Test endpoint:

   curl -X POST "http://localhost:5000/analysis" -H "Content-Type: application/json" -d "{\"userId\":\"7a3b2e08-2e2b-4711-91b8-57b89257a4d0\",\"imageUrl\":\"https://your-supabase-storage-url/image.jpg\"}"

## Project structure

- DTOs
  - AnalysisRequestDto
  - AnalysisResponseDto
  - OpenAiAnalysisDto
- Models
  - Analysis
  - Recommendation
- Data
  - AppDbContext
- Services
  - IAnalysisService
  - AnalysisService
- Program.cs
  - dependency injection setup
  - POST /analysis endpoint
