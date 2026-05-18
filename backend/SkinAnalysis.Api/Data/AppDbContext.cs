using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Models;

namespace SkinAnalysis.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<SkinAnalysisRecord> SkinAnalyses => Set<SkinAnalysisRecord>();
    public DbSet<SkinProfile> SkinProfiles => Set<SkinProfile>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<UserProduct> UserProducts => Set<UserProduct>();
    public DbSet<UserRoutine> Routines => Set<UserRoutine>();
    public DbSet<UserRoutineStep> RoutineSteps => Set<UserRoutineStep>();
    public DbSet<StepProductSlot> StepProductSlots => Set<StepProductSlot>();
    public DbSet<RoutineVersion> RoutineVersions => Set<RoutineVersion>();
    public DbSet<StepCompletion> StepCompletions => Set<StepCompletion>();
    public DbSet<RoutineTemplateEntity> RoutineTemplates => Set<RoutineTemplateEntity>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<UserCredit> UserCredits => Set<UserCredit>();
    public DbSet<RoutineChangeSuggestion> RoutineChangeSuggestions => Set<RoutineChangeSuggestion>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ── users ─────────────────────────────────────────────
        mb.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Email).HasMaxLength(320).IsRequired().HasColumnName("email");
            e.Property(x => x.IsAdmin).HasColumnName("is_admin");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        // ── skin_analyses ──────────────────────────────────────
        mb.Entity<SkinAnalysisRecord>(e =>
        {
            e.ToTable("skin_analyses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.AiEngine).HasColumnName("ai_engine");
            e.Property(x => x.AiRawResponse).HasColumnName("ai_raw_response").HasColumnType("jsonb");
            e.Property(x => x.SkinType).HasColumnName("skin_type");
            e.Property(x => x.AcneScore).HasColumnName("acne_score");
            e.Property(x => x.OilinessScore).HasColumnName("oiliness_score");
            e.Property(x => x.DarkSpotsScore).HasColumnName("dark_spots_score");
            e.Property(x => x.HydrationScore).HasColumnName("hydration_score");
            e.Property(x => x.SensitivityScore).HasColumnName("sensitivity_score");
            e.Property(x => x.AgingScore).HasColumnName("aging_score");
            e.Property(x => x.RednessScore).HasColumnName("redness_score");
            e.Property(x => x.HasActiveAcne).HasColumnName("has_active_acne");
            e.Property(x => x.HasDarkCircles).HasColumnName("has_dark_circles");
            e.Property(x => x.HasEnlargedPores).HasColumnName("has_enlarged_pores");
            e.Property(x => x.HasBlackheads).HasColumnName("has_blackheads");
            e.Property(x => x.HasFineLines).HasColumnName("has_fine_lines");
            e.Property(x => x.Summary).HasColumnName("summary");
            e.Property(x => x.AdditionalNotes).HasColumnName("additional_notes");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.ProcessedAt).HasColumnName("processed_at");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UsesMakeup).HasColumnName("uses_makeup");
            e.Property(x => x.BudgetRange).HasColumnName("budget_range");
            e.Property(x => x.PregnancySafe).HasColumnName("pregnancy_safe");
            e.Property(x => x.LifestyleData).HasColumnName("lifestyle_data").HasColumnType("jsonb");
            e.Ignore(x => x.OverallScore); // calculated property
            e.HasOne(x => x.User).WithMany(x => x.SkinAnalyses).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.CreatedAt });
        });

        // ── skin_profiles ──────────────────────────────────────
        mb.Entity<SkinProfile>(e =>
        {
            e.ToTable("skin_profiles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.AnalysisId).HasColumnName("analysis_id");
            e.Property(x => x.IsCurrent).HasColumnName("is_current");
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.SkinType).HasColumnName("skin_type");
            e.Property(x => x.AcneScore).HasColumnName("acne_score");
            e.Property(x => x.OilinessScore).HasColumnName("oiliness_score");
            e.Property(x => x.DarkSpotsScore).HasColumnName("dark_spots_score");
            e.Property(x => x.HydrationScore).HasColumnName("hydration_score");
            e.Property(x => x.SensitivityScore).HasColumnName("sensitivity_score");
            e.Property(x => x.AgingScore).HasColumnName("aging_score");
            e.Property(x => x.RednessScore).HasColumnName("redness_score");
            e.Property(x => x.HasActiveAcne).HasColumnName("has_active_acne");
            e.Property(x => x.HasDarkCircles).HasColumnName("has_dark_circles");
            e.Property(x => x.HasEnlargedPores).HasColumnName("has_enlarged_pores");
            e.Property(x => x.HasFineLines).HasColumnName("has_fine_lines");
            e.Property(x => x.UsesMakeup).HasColumnName("uses_makeup");
            e.Property(x => x.BudgetRange).HasColumnName("budget_range");
            e.Property(x => x.PregnancySafe).HasColumnName("pregnancy_safe");
            e.Property(x => x.PrimaryConcerns).HasColumnName("primary_concerns").HasColumnType("text[]");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.User).WithMany(x => x.SkinProfiles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Analysis).WithMany().HasForeignKey(x => x.AnalysisId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.UserId).HasFilter("is_current = true").IsUnique();
        });

        // ── products ───────────────────────────────────────────
        mb.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Brand).HasColumnName("brand");
            e.Property(x => x.StepTypeKey).HasColumnName("step_type_key");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Tagline).HasColumnName("tagline");
            // PrimaryImageId: exists in DB (DEFERRABLE FK) but not mapped as EF Core navigation
            // to avoid circular dependency. Use Product.PrimaryImageUrl (from Images) instead.
            e.Property(x => x.CompatibleSkinTypes).HasColumnName("compatible_skin_types").HasColumnType("text[]");
            e.Property(x => x.TargetsConcerns).HasColumnName("targets_concerns").HasColumnType("text[]");
            e.Property(x => x.SuitablePeriods).HasColumnName("suitable_periods").HasColumnType("text[]");
            e.Property(x => x.RecommendedFrequency).HasColumnName("recommended_frequency");
            e.Property(x => x.StrengthLevel).HasColumnName("strength_level");
            e.Property(x => x.PriceAvg).HasColumnName("price_avg").HasPrecision(8, 2);
            e.Property(x => x.PriceRange).HasColumnName("price_range");
            e.Property(x => x.Currency).HasColumnName("currency");
            e.Property(x => x.CurationScore).HasColumnName("curation_score");
            e.Property(x => x.IsStaffPick).HasColumnName("is_staff_pick");
            e.Property(x => x.IsDermaTested).HasColumnName("is_derma_tested");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasMany(x => x.Images).WithOne(x => x.Product).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.PrimaryImageUrl); // computed property, not a column
            e.HasIndex(x => new { x.StepTypeKey, x.IsActive });
            e.HasIndex(x => x.CompatibleSkinTypes).HasMethod("GIN").HasDatabaseName("idx_products_skin_types");
            e.HasIndex(x => x.TargetsConcerns).HasMethod("GIN").HasDatabaseName("idx_products_concerns");
        });

        mb.Entity<ProductImage>(e =>
        {
            e.ToTable("product_images");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.StoragePath).HasColumnName("storage_path");
            e.Property(x => x.PublicUrl).HasColumnName("public_url");
            e.Property(x => x.Position).HasColumnName("position");
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });

        // ── user_products ──────────────────────────────────────
        mb.Entity<UserProduct>(e =>
        {
            e.ToTable("user_products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.CatalogProductId).HasColumnName("catalog_product_id");
            e.Property(x => x.CustomName).HasColumnName("custom_name");
            e.Property(x => x.CustomBrand).HasColumnName("custom_brand");
            e.Property(x => x.CustomImageUrl).HasColumnName("custom_image_url");
            e.Property(x => x.StepTypeKey).HasColumnName("step_type_key");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Ignore(x => x.DisplayName);
            e.Ignore(x => x.DisplayImageUrl);
            e.HasOne(x => x.User).WithMany(x => x.UserProducts).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.CatalogProduct).WithMany().HasForeignKey(x => x.CatalogProductId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.UserId);
        });

        // ── routines ───────────────────────────────────────────
        mb.Entity<UserRoutine>(e =>
        {
            e.ToTable("routines");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.SkinProfileId).HasColumnName("skin_profile_id");
            e.Property(x => x.Period).HasColumnName("period");
            e.Property(x => x.DisplayName).HasColumnName("display_name");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.IsCustomized).HasColumnName("is_customized");
            e.Property(x => x.CurrentVersion).HasColumnName("current_version");
            e.Property(x => x.GeneratedBy).HasColumnName("generated_by");
            e.Property(x => x.TemplateId).HasColumnName("template_id");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.User).WithMany(x => x.Routines).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.SkinProfile).WithMany(x => x.Routines).HasForeignKey(x => x.SkinProfileId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Steps).WithOne(x => x.Routine).HasForeignKey(x => x.RoutineId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Versions).WithOne(x => x.Routine).HasForeignKey(x => x.RoutineId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.Period }).HasFilter("is_active = true").IsUnique();
        });

        // ── routine_steps ──────────────────────────────────────
        mb.Entity<UserRoutineStep>(e =>
        {
            e.ToTable("routine_steps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RoutineId).HasColumnName("routine_id");
            e.Property(x => x.StepTypeKey).HasColumnName("step_type_key");
            e.Property(x => x.StepOrder).HasColumnName("step_order");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.IsSkipped).HasColumnName("is_skipped");
            e.Property(x => x.IsUserAdded).HasColumnName("is_user_added");
            e.Property(x => x.Recurrence).HasColumnName("recurrence");
            e.Property(x => x.ScheduleDays).HasColumnName("schedule_days").HasColumnType("smallint[]");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasMany(x => x.Slots).WithOne(x => x.Step).HasForeignKey(x => x.StepId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.RoutineId, x.IsActive, x.StepOrder });
        });

        // ── step_product_slots ─────────────────────────────────
        mb.Entity<StepProductSlot>(e =>
        {
            e.ToTable("step_product_slots");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.StepId).HasColumnName("step_id");
            e.Property(x => x.Tier).HasColumnName("tier");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.UserProductId).HasColumnName("user_product_id");
            e.Property(x => x.IsSelected).HasColumnName("is_selected");
            e.Property(x => x.ScoreAtGeneration).HasColumnName("score_at_generation").HasPrecision(6, 2);
            e.Property(x => x.ScoreBreakdown).HasColumnName("score_breakdown").HasColumnType("jsonb");
            e.Property(x => x.RecommendationReason).HasColumnName("recommendation_reason");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.HasOne(x => x.Product).WithMany(x => x.Slots).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.UserProduct).WithMany().HasForeignKey(x => x.UserProductId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.StepId).HasFilter("is_selected = true").IsUnique();
            e.HasIndex(x => new { x.StepId, x.Tier });
        });

        // ── routine_versions ───────────────────────────────────
        mb.Entity<RoutineVersion>(e =>
        {
            e.ToTable("routine_versions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RoutineId).HasColumnName("routine_id");
            e.Property(x => x.Version).HasColumnName("version");
            e.Property(x => x.ChangedBy).HasColumnName("changed_by");
            e.Property(x => x.ChangeType).HasColumnName("change_type");
            e.Property(x => x.ChangeSummary).HasColumnName("change_summary");
            e.Property(x => x.Snapshot).HasColumnName("snapshot").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => new { x.RoutineId, x.Version }).IsUnique();
        });

        // ── step_completions ───────────────────────────────────
        mb.Entity<StepCompletion>(e =>
        {
            e.ToTable("step_completions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.RoutineId).HasColumnName("routine_id");
            e.Property(x => x.StepId).HasColumnName("step_id");
            e.Property(x => x.CompletedDate).HasColumnName("completed_date").HasColumnType("date");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Routine).WithMany().HasForeignKey(x => x.RoutineId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Step).WithMany(x => x.Completions).HasForeignKey(x => x.StepId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.UserId, x.StepId, x.CompletedDate }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.CompletedDate });
        });

        // ── subscriptions ──────────────────────────────────────
        mb.Entity<Subscription>(e =>
        {
            e.ToTable("subscriptions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.Provider).HasMaxLength(50).HasColumnName("provider");
            e.Property(x => x.Gateway).HasMaxLength(50).HasColumnName("gateway");
            e.Property(x => x.PlanKey).HasMaxLength(50).HasColumnName("plan_key");
            e.Property(x => x.PlanName).HasMaxLength(100).HasColumnName("plan_name");
            e.Property(x => x.Status).HasMaxLength(30).HasColumnName("status");
            e.Property(x => x.ExternalReference).HasMaxLength(200).HasColumnName("external_reference");
            e.Property(x => x.ExternalId).HasMaxLength(200).HasColumnName("external_id");
            e.Property(x => x.CheckoutUrl).HasMaxLength(1000).HasColumnName("checkout_url");
            e.Property(x => x.PixQrCode).HasMaxLength(4000).HasColumnName("pix_qr_code");
            e.Property(x => x.PixQrCodeBase64).HasMaxLength(4000).HasColumnName("pix_qr_code_base64");
            e.Property(x => x.AmountCents).HasColumnName("amount_cents");
            e.Property(x => x.Currency).HasMaxLength(10).HasColumnName("currency");
            e.Property(x => x.ActivatedAtUtc).HasColumnName("activated_at_utc");
            e.Property(x => x.ExpiresAtUtc).HasColumnName("expires_at_utc");
            e.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");
            e.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.ExternalReference).IsUnique();
        });

        // ── routine_templates ─────────────────────────────────────
        mb.Entity<RoutineTemplateEntity>(e =>
        {
            e.ToTable("routine_templates");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Period).HasColumnName("period");
            e.Property(x => x.MatchSkinTypes).HasColumnName("match_skin_types").HasColumnType("text[]");
            e.Property(x => x.MatchConcerns).HasColumnName("match_concerns").HasColumnType("text[]");
            e.Property(x => x.RequireFlags).HasColumnName("require_flags").HasColumnType("text[]");
            e.Property(x => x.MinAcneScore).HasColumnName("min_acne_score");
            e.Property(x => x.MinOilinessScore).HasColumnName("min_oiliness_score");
            e.Property(x => x.MinSensitivity).HasColumnName("min_sensitivity");
            e.Property(x => x.StepTypeKeys).HasColumnName("step_type_keys").HasColumnType("text[]");
            e.Property(x => x.SpecificityScore).HasColumnName("specificity_score");
            e.Property(x => x.IsActive).HasColumnName("is_active");
        });

        // ── user_credits ───────────────────────────────────────
        mb.Entity<UserCredit>(e =>
        {
            e.ToTable("user_credits");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.CreditsRemaining).HasColumnName("credits_remaining").HasDefaultValue(1);
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        // ── routine_change_suggestions ─────────────────────────
        mb.Entity<RoutineChangeSuggestion>(e =>
        {
            e.ToTable("routine_change_suggestions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.AnalysisId).HasColumnName("analysis_id");
            e.Property(x => x.SuggestionType).HasColumnName("suggestion_type");
            e.Property(x => x.StepTypeKey).HasColumnName("step_type_key");
            e.Property(x => x.StepPeriod).HasColumnName("step_period");
            e.Property(x => x.CurrentProductName).HasColumnName("current_product_name");
            e.Property(x => x.SuggestedProductId).HasColumnName("suggested_product_id");
            e.Property(x => x.SuggestedProductName).HasColumnName("suggested_product_name");
            e.Property(x => x.SuggestedImageUrl).HasColumnName("suggested_image_url");
            e.Property(x => x.Reason).HasColumnName("reason");
            e.Property(x => x.Priority).HasColumnName("priority");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.ResolvedAt).HasColumnName("resolved_at");
            e.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.Analysis).WithMany().HasForeignKey(s => s.AnalysisId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.SuggestedProduct).WithMany().HasForeignKey(s => s.SuggestedProductId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.UserId, x.Status });
        });
    }
}
