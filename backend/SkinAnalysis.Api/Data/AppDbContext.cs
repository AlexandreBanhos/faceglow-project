using Microsoft.EntityFrameworkCore;
using SkinAnalysis.Api.Models;
using SkinAnalysisEntity = SkinAnalysis.Api.Models.SkinAnalysis;

namespace SkinAnalysis.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<SkinAnalysisEntity> SkinAnalyses => Set<SkinAnalysisEntity>();

    public DbSet<Routine> Routines => Set<Routine>();

    public DbSet<RoutineStep> RoutineSteps => Set<RoutineStep>();

    public DbSet<Analysis> Analyses => Set<Analysis>();

    public DbSet<Recommendation> Recommendations => Set<Recommendation>();

    public DbSet<Product> Products => Set<Product>();

    public DbSet<ProductRule> ProductRules => Set<ProductRule>();

    public DbSet<UserProduct> UserProducts => Set<UserProduct>();

    public DbSet<RecommendationCache> RecommendationCaches => Set<RecommendationCache>();

    public DbSet<RecommendationLog> RecommendationLogs => Set<RecommendationLog>();

    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    public DbSet<UserCredit> UserCredits => Set<UserCredit>();
    
    public DbSet<RoutineCompletion> RoutineCompletions => Set<RoutineCompletion>();

    public DbSet<AnalysisRoutineStep> AnalysisRoutineSteps => Set<AnalysisRoutineStep>();

    public DbSet<RoutineStepCompletion> RoutineStepCompletions => Set<RoutineStepCompletion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Email).HasMaxLength(320).IsRequired().HasColumnName("email");
            entity.Property(x => x.IsAdmin).HasColumnName("is_admin");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<SkinAnalysisEntity>(entity =>
        {
            entity.ToTable("skin_analysis");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.SkinType).HasMaxLength(100).IsRequired().HasColumnName("skin_type");
            entity.Property(x => x.AcneLevel).HasColumnName("acne_level");
            entity.Property(x => x.SensitivityLevel).HasColumnName("sensitivity_level");
            entity.Property(x => x.HasDarkCircles).HasColumnName("has_dark_circles");
            entity.Property(x => x.HasSpots).HasColumnName("has_spots");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.User)
                .WithMany(x => x.SkinAnalyses)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => new { x.UserId, x.CreatedAt });
        });

        modelBuilder.Entity<Routine>(entity =>
        {
            entity.ToTable("routine");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.BasedOnAnalysisId).HasColumnName("based_on_analysis_id");
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");
            entity.Property(x => x.CustomizationsJson).HasColumnName("customizations_json").HasColumnType("jsonb");

            entity.HasOne(x => x.User)
                .WithMany(x => x.Routines)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.BasedOnAnalysis)
                .WithMany(x => x.Routines)
                .HasForeignKey(x => x.BasedOnAnalysisId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.BasedOnAnalysisId);
            entity.HasIndex(x => new { x.UserId, x.IsActive })
                .HasFilter("is_active = true")
                .IsUnique();
        });

        modelBuilder.Entity<RoutineStep>(entity =>
        {
            entity.ToTable("routine_step");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RoutineId).HasColumnName("routine_id");
            entity.Property(x => x.StepType).HasMaxLength(50).IsRequired().HasColumnName("step_type");
            entity.Property(x => x.ProductId).HasColumnName("product_id");
            entity.Property(x => x.IsUserProduct).HasColumnName("is_user_product");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.Routine)
                .WithMany(x => x.Steps)
                .HasForeignKey(x => x.RoutineId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Product)
                .WithMany(x => x.RoutineSteps)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.RoutineId);
            entity.HasIndex(x => x.ProductId);
        });

        modelBuilder.Entity<Analysis>(entity =>
        {
            entity.ToTable("analysis");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.SkinType).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ImageUrl).IsRequired();
            entity.Property(x => x.Summary).HasColumnName("summary");
            entity.Property(x => x.RoutineJson).HasColumnName("routine_json").HasColumnType("jsonb");
            entity.Property(x => x.CustomizationsJson).HasColumnName("customizations_json").HasColumnType("jsonb");
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");

            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.ImageUrl).HasColumnName("image_url");
            entity.Property(x => x.SkinType).HasColumnName("skin_type");
            entity.Property(x => x.AcneScore).HasColumnName("acne_score");
            entity.Property(x => x.OilinessScore).HasColumnName("oiliness_score");
            entity.Property(x => x.DarkSpotsScore).HasColumnName("dark_spots_score");
            entity.Property(x => x.HydrationScore).HasColumnName("hydration_score");
            entity.Property(x => x.SensitivityScore).HasColumnName("sensitivity_score").HasDefaultValue(0);
            entity.Property(x => x.OverallScore).HasColumnName("overall_score");
            entity.Property(x => x.AcneActive).HasColumnName("acne_active");
            entity.Property(x => x.DarkCircles).HasColumnName("dark_circles");
            entity.Property(x => x.EnlargedPores).HasColumnName("enlarged_pores");
            entity.Property(x => x.PigmentationSpots).HasColumnName("pigmentation_spots");
            entity.Property(x => x.DryLips).HasColumnName("dry_lips");
            entity.Property(x => x.AdditionalRecommendations).HasColumnName("additional_recommendations");
            entity.Property(x => x.Poros).HasColumnName("poros");
            entity.Property(x => x.Olheiras).HasColumnName("olheiras");
            entity.Property(x => x.LinhasFinas).HasColumnName("linhas_finas");
            entity.Property(x => x.Vermelhidao).HasColumnName("vermelhidao");
            entity.Property(x => x.EspinhasAtivas).HasColumnName("espinhas_ativas");
            entity.Property(x => x.Cravos).HasColumnName("cravos");

            entity.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
        });

        modelBuilder.Entity<Recommendation>(entity =>
        {
            entity.ToTable("recommendations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Type).HasMaxLength(50).IsRequired().HasColumnName("type");
            entity.Property(x => x.Product).HasMaxLength(300).IsRequired().HasColumnName("product");
            entity.Property(x => x.Description).HasMaxLength(1000).IsRequired().HasColumnName("description");
            entity.Property(x => x.ImageUrl).HasMaxLength(1000).HasColumnName("image_url");
            entity.Property(x => x.AnalysisId).HasColumnName("analysis_id");

            entity.HasOne(x => x.Analysis)
                .WithMany(x => x.Recommendations)
                .HasForeignKey(x => x.AnalysisId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.AnalysisId);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired().HasColumnName("name");
            entity.Property(x => x.Brand).HasMaxLength(100).IsRequired().HasColumnName("brand");
            entity.Property(x => x.Category).HasMaxLength(50).IsRequired().HasColumnName("category");
            entity.Property(x => x.SkinType).HasMaxLength(100).HasColumnName("skin_type");
            entity.Property(x => x.SkinTypes).HasColumnType("text[]").HasColumnName("skin_types");
            entity.Property(x => x.Concerns).HasColumnType("text[]").HasColumnName("concerns");
            entity.Property(x => x.Actives).HasColumnType("text[]").HasColumnName("actives");
            entity.Property(x => x.StrengthLevel).HasMaxLength(20).HasColumnName("strength_level");
            entity.Property(x => x.Period).HasColumnType("text[]").HasColumnName("period");
            entity.Property(x => x.PriceRange).HasMaxLength(20).HasColumnName("price_range");
            entity.Property(x => x.PriceAvg).HasPrecision(10, 2).HasColumnName("price_avg");
            entity.Property(x => x.Priority).HasColumnName("priority");
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.Property(x => x.IsUserProduct).HasColumnName("is_user_product");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Highlight).HasMaxLength(500).HasColumnName("highlight");
            entity.Property(x => x.ImageUrl).HasColumnName("image_url");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.User)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => new { x.Brand, x.Name });
            entity.HasIndex(x => x.Category);
            entity.HasIndex(x => x.PriceRange);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => new { x.UserId, x.IsUserProduct });
            
            // GIN indexes for array searches (Postgres specific)
            entity.HasIndex(x => x.SkinTypes)
                .HasMethod("GIN")
                .HasDatabaseName("idx_products_skin_types_gin");
            entity.HasIndex(x => x.Concerns)
                .HasMethod("GIN")
                .HasDatabaseName("idx_products_concerns_gin");
            entity.HasIndex(x => x.Actives)
                .HasMethod("GIN")
                .HasDatabaseName("idx_products_actives_gin");
            entity.HasIndex(x => x.Period)
                .HasMethod("GIN")
                .HasDatabaseName("idx_products_period_gin");
        });

        modelBuilder.Entity<ProductRule>(entity =>
        {
            entity.ToTable("product_rules");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProductId).HasColumnName("product_id");
            entity.Property(x => x.SkinTypes).HasColumnType("text[]").HasColumnName("skin_types");
            entity.Property(x => x.Concerns).HasColumnType("text[]").HasColumnName("concerns");
            entity.Property(x => x.Actives).HasColumnType("text[]").HasColumnName("actives");
            entity.Property(x => x.StepTypes).HasColumnType("text[]").HasColumnName("step_types");
            entity.Property(x => x.Periods).HasColumnType("text[]").HasColumnName("periods");
            entity.Property(x => x.StrengthLevel).HasMaxLength(20).HasColumnName("strength_level");
            entity.Property(x => x.Priority).HasColumnName("priority");
            entity.Property(x => x.Reasoning).HasMaxLength(500).HasColumnName("reasoning");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.ProductId);
            entity.HasIndex(x => x.Priority);
            
            // GIN indexes for array searches
            entity.HasIndex(x => x.SkinTypes)
                .HasMethod("GIN")
                .HasDatabaseName("idx_product_rules_skin_types_gin");
            entity.HasIndex(x => x.Concerns)
                .HasMethod("GIN")
                .HasDatabaseName("idx_product_rules_concerns_gin");
            entity.HasIndex(x => x.StepTypes)
                .HasMethod("GIN")
                .HasDatabaseName("idx_product_rules_step_types_gin");
            entity.HasIndex(x => x.Periods)
                .HasMethod("GIN")
                .HasDatabaseName("idx_product_rules_periods_gin");
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("subscriptions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Provider).HasMaxLength(50).HasColumnName("provider");
            entity.Property(x => x.Gateway).HasMaxLength(50).HasColumnName("gateway");
            entity.Property(x => x.PlanKey).HasMaxLength(50).HasColumnName("plan_key");
            entity.Property(x => x.PlanName).HasMaxLength(100).HasColumnName("plan_name");
            entity.Property(x => x.Status).HasMaxLength(30).HasColumnName("status");
            entity.Property(x => x.ExternalReference).HasMaxLength(200).HasColumnName("external_reference");
            entity.Property(x => x.ExternalId).HasMaxLength(200).HasColumnName("external_id");
            entity.Property(x => x.CheckoutUrl).HasMaxLength(1000).HasColumnName("checkout_url");
            entity.Property(x => x.PixQrCode).HasMaxLength(4000).HasColumnName("pix_qr_code");
            entity.Property(x => x.PixQrCodeBase64).HasMaxLength(4000).HasColumnName("pix_qr_code_base64");
            entity.Property(x => x.AmountCents).HasColumnName("amount_cents");
            entity.Property(x => x.Currency).HasMaxLength(10).HasColumnName("currency");
            entity.Property(x => x.ActivatedAtUtc).HasColumnName("activated_at_utc");
            entity.Property(x => x.ExpiresAtUtc).HasColumnName("expires_at_utc");
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.ExternalReference).IsUnique();
            entity.HasIndex(x => x.ExternalId);
        });

        modelBuilder.Entity<RecommendationCache>(entity =>
        {
            entity.ToTable("user_recommendations_cache");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.RecommendationHash).HasColumnName("recommendation_hash");
            entity.Property(x => x.SkinType).HasColumnName("skin_type");
            entity.Property(x => x.Concerns).HasColumnType("text[]").HasColumnName("concerns");
            entity.Property(x => x.Periods).HasColumnType("text[]").HasColumnName("periods");
            entity.Property(x => x.RecommendedProductIds).HasColumnType("uuid[]").HasColumnName("recommended_product_ids");
            entity.Property(x => x.Scores).HasColumnType("numeric[]").HasColumnName("scores");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            entity.Property(x => x.HitCount).HasColumnName("hit_count");

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.UserId, x.RecommendationHash }).IsUnique();
            entity.HasIndex(x => x.ExpiresAt);
        });

        modelBuilder.Entity<UserCredit>(entity =>
        {
            entity.ToTable("user_credits");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.CreditsRemaining).HasColumnName("credits_remaining").HasDefaultValue(5);
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<RecommendationLog>(entity =>
        {
            entity.ToTable("recommendation_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.AnalysisId).HasColumnName("analysis_id");
            entity.Property(x => x.InputSkinType).HasColumnName("input_skin_type");
            entity.Property(x => x.InputConcerns).HasColumnType("text[]").HasColumnName("input_concerns");
            entity.Property(x => x.InputPeriods).HasColumnType("text[]").HasColumnName("input_periods");
            entity.Property(x => x.RecommendedProductIds).HasColumnType("uuid[]").HasColumnName("recommended_product_ids");
            entity.Property(x => x.RecommendationScores).HasColumnType("numeric[]").HasColumnName("recommendation_scores");
            entity.Property(x => x.SelectedProductIds).HasColumnType("uuid[]").HasColumnName("selected_product_ids");
            entity.Property(x => x.FeedbackRating).HasColumnName("feedback_rating");
            entity.Property(x => x.FeedbackComment).HasColumnName("feedback_comment");
            entity.Property(x => x.AiEngine).HasColumnName("ai_engine");
            entity.Property(x => x.RoutineType).HasColumnName("routine_type");
            entity.Property(x => x.RecommendationCount).HasColumnName("recommendation_count");
            entity.Property(x => x.HighestScore).HasColumnName("highest_score");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.FeedbackProvidedAt).HasColumnName("feedback_provided_at");

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Analysis)
                .WithMany()
                .HasForeignKey(x => x.AnalysisId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.AnalysisId);
            entity.HasIndex(x => x.CreatedAt).IsDescending();
            entity.HasIndex(x => x.FeedbackProvidedAt);
            entity.HasIndex(x => new { x.UserId, x.FeedbackProvidedAt }).IsDescending(false, true);
        });

        modelBuilder.Entity<RoutineCompletion>(entity =>
        {
            entity.ToTable("routine_completions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.CompletionDate).HasColumnName("completion_date").HasColumnType("date");
            entity.Property(x => x.MorningCompleted).HasColumnName("morning_completed").HasDefaultValue(false);
            entity.Property(x => x.NightCompleted).HasColumnName("night_completed").HasDefaultValue(false);
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc");

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => new { x.UserId, x.CompletionDate }).IsUnique();
        });

        modelBuilder.Entity<UserProduct>(entity =>
        {
            entity.ToTable("user_products");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Name).HasColumnName("name");
            entity.Property(x => x.Brand).HasColumnName("brand");
            entity.Property(x => x.Category).HasColumnName("category");
            entity.Property(x => x.ImageUrl).HasColumnName("image_url");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<AnalysisRoutineStep>(entity =>
        {
            entity.ToTable("analysis_routine_steps");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.AnalysisId).HasColumnName("analysis_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Period).HasMaxLength(20).HasColumnName("period");
            entity.Property(x => x.StepOrder).HasColumnName("step_order");
            entity.Property(x => x.Category).HasColumnName("category");
            entity.Property(x => x.ProductId).HasColumnName("product_id");
            entity.Property(x => x.RecommendationId).HasColumnName("recommendation_id");
            entity.Property(x => x.ProductName).HasColumnName("product_name");
            entity.Property(x => x.ImageUrl).HasColumnName("image_url");
            entity.Property(x => x.Recurrence).HasMaxLength(30).HasColumnName("recurrence").HasDefaultValue("daily");
            entity.Property(x => x.IsExtra).HasColumnName("is_extra");
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(x => x.IsUserAdded).HasColumnName("is_user_added");
            entity.Property(x => x.SelectedTier).HasMaxLength(20).HasColumnName("selected_tier");
            entity.Property(x => x.OverrideProductName).HasColumnName("override_product_name");
            entity.Property(x => x.OverrideImageUrl).HasColumnName("override_image_url");
            entity.Property(x => x.ScheduleDays).HasColumnName("schedule_days");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Analysis).WithMany().HasForeignKey(x => x.AnalysisId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Recommendation).WithMany().HasForeignKey(x => x.RecommendationId).OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.AnalysisId);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => new { x.AnalysisId, x.Period, x.StepOrder });
        });

        modelBuilder.Entity<RoutineStepCompletion>(entity =>
        {
            entity.ToTable("routine_step_completions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.StepId).HasColumnName("step_id");
            entity.Property(x => x.CompletedDate).HasColumnName("completed_date");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Step).WithMany().HasForeignKey(x => x.StepId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.StepId, x.CompletedDate }).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.CompletedDate });
        });
    }
}
