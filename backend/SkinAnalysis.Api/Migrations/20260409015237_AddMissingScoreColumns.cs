using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkinAnalysis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingScoreColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "analysis",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    image_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    skin_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    summary = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    routine_json = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: false),
                    acne_score = table.Column<int>(type: "integer", nullable: false),
                    oiliness_score = table.Column<int>(type: "integer", nullable: false),
                    dark_spots_score = table.Column<int>(type: "integer", nullable: false),
                    hydration_score = table.Column<int>(type: "integer", nullable: false),
                    sensitivity_score = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    Poros = table.Column<int>(type: "integer", nullable: false),
                    Olheiras = table.Column<int>(type: "integer", nullable: false),
                    LinhasFinas = table.Column<int>(type: "integer", nullable: false),
                    Vermelhidao = table.Column<int>(type: "integer", nullable: false),
                    EspinhasAtivas = table.Column<int>(type: "integer", nullable: false),
                    Cravos = table.Column<int>(type: "integer", nullable: false),
                    overall_score = table.Column<int>(type: "integer", nullable: false),
                    acne_active = table.Column<bool>(type: "boolean", nullable: false),
                    dark_circles = table.Column<bool>(type: "boolean", nullable: false),
                    enlarged_pores = table.Column<bool>(type: "boolean", nullable: false),
                    pigmentation_spots = table.Column<bool>(type: "boolean", nullable: false),
                    dry_lips = table.Column<bool>(type: "boolean", nullable: false),
                    additional_recommendations = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analysis", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    gateway = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    plan_key = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    plan_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    external_reference = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    external_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    checkout_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    pix_qr_code = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    pix_qr_code_base64 = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    amount_cents = table.Column<int>(type: "integer", nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    activated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscriptions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_credits",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    credits_remaining = table.Column<int>(type: "integer", nullable: false, defaultValue: 5),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_credits", x => x.user_id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    is_admin = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "recommendations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    analysis_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    product = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    image_url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recommendations", x => x.id);
                    table.ForeignKey(
                        name: "FK_recommendations_analysis_analysis_id",
                        column: x => x.analysis_id,
                        principalTable: "analysis",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "products",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    brand = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    skin_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    skin_types = table.Column<string[]>(type: "text[]", nullable: false),
                    concerns = table.Column<string[]>(type: "text[]", nullable: false),
                    actives = table.Column<string[]>(type: "text[]", nullable: false),
                    strength_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    period = table.Column<string[]>(type: "text[]", nullable: false),
                    price_range = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    price_avg = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_user_product = table.Column<bool>(type: "boolean", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                    table.ForeignKey(
                        name: "FK_products_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "recommendation_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    analysis_id = table.Column<Guid>(type: "uuid", nullable: true),
                    input_skin_type = table.Column<string>(type: "text", nullable: false),
                    input_concerns = table.Column<string[]>(type: "text[]", nullable: false),
                    input_periods = table.Column<string[]>(type: "text[]", nullable: false),
                    recommended_product_ids = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    recommendation_scores = table.Column<decimal[]>(type: "numeric[]", nullable: false),
                    selected_product_ids = table.Column<Guid[]>(type: "uuid[]", nullable: true),
                    feedback_rating = table.Column<int>(type: "integer", nullable: true),
                    feedback_comment = table.Column<string>(type: "text", nullable: true),
                    ai_engine = table.Column<string>(type: "text", nullable: false),
                    routine_type = table.Column<string>(type: "text", nullable: true),
                    recommendation_count = table.Column<int>(type: "integer", nullable: false),
                    highest_score = table.Column<decimal>(type: "numeric", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    feedback_provided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recommendation_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_recommendation_logs_analysis_analysis_id",
                        column: x => x.analysis_id,
                        principalTable: "analysis",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_recommendation_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "skin_analysis",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    skin_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    acne_level = table.Column<int>(type: "integer", nullable: false),
                    sensitivity_level = table.Column<int>(type: "integer", nullable: false),
                    has_dark_circles = table.Column<bool>(type: "boolean", nullable: false),
                    has_spots = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skin_analysis", x => x.id);
                    table.ForeignKey(
                        name: "FK_skin_analysis_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_recommendations_cache",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recommendation_hash = table.Column<string>(type: "text", nullable: false),
                    skin_type = table.Column<string>(type: "text", nullable: false),
                    concerns = table.Column<string[]>(type: "text[]", nullable: false),
                    periods = table.Column<string[]>(type: "text[]", nullable: false),
                    recommended_product_ids = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    scores = table.Column<decimal[]>(type: "numeric[]", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    hit_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_recommendations_cache", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_recommendations_cache_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_rules",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    skin_types = table.Column<string[]>(type: "text[]", nullable: false),
                    concerns = table.Column<string[]>(type: "text[]", nullable: false),
                    actives = table.Column<string[]>(type: "text[]", nullable: false),
                    step_types = table.Column<string[]>(type: "text[]", nullable: false),
                    periods = table.Column<string[]>(type: "text[]", nullable: false),
                    strength_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    priority = table.Column<int>(type: "integer", nullable: false),
                    reasoning = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_rules", x => x.id);
                    table.ForeignKey(
                        name: "FK_product_rules_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_products",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    custom_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_products", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_products_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_products_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "routine",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    based_on_analysis_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_routine", x => x.id);
                    table.ForeignKey(
                        name: "FK_routine_skin_analysis_based_on_analysis_id",
                        column: x => x.based_on_analysis_id,
                        principalTable: "skin_analysis",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_routine_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "routine_step",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    routine_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_user_product = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_routine_step", x => x.id);
                    table.ForeignKey(
                        name: "FK_routine_step_products_product_id",
                        column: x => x.product_id,
                        principalTable: "products",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_routine_step_routine_routine_id",
                        column: x => x.routine_id,
                        principalTable: "routine",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_user_id_created_at_utc",
                table: "analysis",
                columns: new[] { "user_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_concerns_gin",
                table: "product_rules",
                column: "concerns")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_periods_gin",
                table: "product_rules",
                column: "periods")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_skin_types_gin",
                table: "product_rules",
                column: "skin_types")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_step_types_gin",
                table: "product_rules",
                column: "step_types")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "IX_product_rules_priority",
                table: "product_rules",
                column: "priority");

            migrationBuilder.CreateIndex(
                name: "IX_product_rules_product_id",
                table: "product_rules",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "idx_products_actives_gin",
                table: "products",
                column: "actives")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_products_concerns_gin",
                table: "products",
                column: "concerns")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_products_period_gin",
                table: "products",
                column: "period")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_products_skin_types_gin",
                table: "products",
                column: "skin_types")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "IX_products_brand_name",
                table: "products",
                columns: new[] { "brand", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_products_category",
                table: "products",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "IX_products_price_range",
                table: "products",
                column: "price_range");

            migrationBuilder.CreateIndex(
                name: "IX_products_user_id",
                table: "products",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_products_user_id_is_user_product",
                table: "products",
                columns: new[] { "user_id", "is_user_product" });

            migrationBuilder.CreateIndex(
                name: "IX_recommendation_logs_analysis_id",
                table: "recommendation_logs",
                column: "analysis_id");

            migrationBuilder.CreateIndex(
                name: "IX_recommendation_logs_created_at",
                table: "recommendation_logs",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "IX_recommendation_logs_feedback_provided_at",
                table: "recommendation_logs",
                column: "feedback_provided_at");

            migrationBuilder.CreateIndex(
                name: "IX_recommendation_logs_user_id",
                table: "recommendation_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_recommendation_logs_user_id_feedback_provided_at",
                table: "recommendation_logs",
                columns: new[] { "user_id", "feedback_provided_at" },
                descending: new[] { false, true });

            migrationBuilder.CreateIndex(
                name: "IX_recommendations_analysis_id",
                table: "recommendations",
                column: "analysis_id");

            migrationBuilder.CreateIndex(
                name: "IX_routine_based_on_analysis_id",
                table: "routine",
                column: "based_on_analysis_id");

            migrationBuilder.CreateIndex(
                name: "IX_routine_user_id",
                table: "routine",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_routine_user_id_is_active",
                table: "routine",
                columns: new[] { "user_id", "is_active" },
                unique: true,
                filter: "is_active = true");

            migrationBuilder.CreateIndex(
                name: "IX_routine_step_product_id",
                table: "routine_step",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_routine_step_routine_id",
                table: "routine_step",
                column: "routine_id");

            migrationBuilder.CreateIndex(
                name: "IX_skin_analysis_user_id",
                table: "skin_analysis",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_skin_analysis_user_id_created_at",
                table: "skin_analysis",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_external_id",
                table: "subscriptions",
                column: "external_id");

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_external_reference",
                table: "subscriptions",
                column: "external_reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_subscriptions_user_id",
                table: "subscriptions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_products_product_id",
                table: "user_products",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_products_user_id",
                table: "user_products",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_products_user_id_product_id",
                table: "user_products",
                columns: new[] { "user_id", "product_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_recommendations_cache_expires_at",
                table: "user_recommendations_cache",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_user_recommendations_cache_user_id_recommendation_hash",
                table: "user_recommendations_cache",
                columns: new[] { "user_id", "recommendation_hash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_rules");

            migrationBuilder.DropTable(
                name: "recommendation_logs");

            migrationBuilder.DropTable(
                name: "recommendations");

            migrationBuilder.DropTable(
                name: "routine_step");

            migrationBuilder.DropTable(
                name: "subscriptions");

            migrationBuilder.DropTable(
                name: "user_credits");

            migrationBuilder.DropTable(
                name: "user_products");

            migrationBuilder.DropTable(
                name: "user_recommendations_cache");

            migrationBuilder.DropTable(
                name: "analysis");

            migrationBuilder.DropTable(
                name: "routine");

            migrationBuilder.DropTable(
                name: "products");

            migrationBuilder.DropTable(
                name: "skin_analysis");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
