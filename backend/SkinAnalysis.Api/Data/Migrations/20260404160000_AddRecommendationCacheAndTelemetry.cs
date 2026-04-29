using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkinAnalysis.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecommendationCacheAndTelemetry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // User recommendations cache
            // Hash = md5(skin_type + concerns_hash + period_hash)
            // Stores computed recommendations to avoid repeated queries
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
                    hit_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_recommendations_cache", x => x.id);
                    table.ForeignKey(
                        name: "fk_user_recommendations_cache_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_user_recommendations_cache_user_id_hash",
                table: "user_recommendations_cache",
                columns: new[] { "user_id", "recommendation_hash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_user_recommendations_cache_expires_at",
                table: "user_recommendations_cache",
                column: "expires_at",
                descending: new bool[] { false });

            // Recommendation logs: telemetry for AI behavior tracking
            // Tracks: what we recommended, what user chose, quality feedback
            migrationBuilder.CreateTable(
                name: "recommendation_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    analysis_id = table.Column<Guid>(type: "uuid", nullable: true),
                    
                    // Input: what triggered the recommendation?
                    input_skin_type = table.Column<string>(type: "text", nullable: false),
                    input_concerns = table.Column<string[]>(type: "text[]", nullable: false),
                    input_periods = table.Column<string[]>(type: "text[]", nullable: false),
                    
                    // Output: what did we recommend?
                    recommended_product_ids = table.Column<Guid[]>(type: "uuid[]", nullable: false),
                    recommendation_scores = table.Column<decimal[]>(type: "numeric[]", nullable: false),
                    
                    // User feedback: did user accept/reject?
                    selected_product_ids = table.Column<Guid[]>(type: "uuid[]", nullable: true),
                    feedback_rating = table.Column<int>(type: "integer", nullable: true), // 1-5 stars
                    feedback_comment = table.Column<string>(type: "text", nullable: true),
                    
                    // Metadata
                    ai_engine = table.Column<string>(type: "text", nullable: false, defaultValue: "gemini"),
                    routine_type = table.Column<string>(type: "text", nullable: true), // "morning", "night", "weekly"
                    recommendation_count = table.Column<int>(type: "integer", nullable: false),
                    highest_score = table.Column<decimal>(type: "numeric", nullable: false),
                    
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    feedback_provided_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_recommendation_logs", x => x.id);
                    table.ForeignKey(
                        name: "fk_recommendation_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_recommendation_logs_analyses_analysis_id",
                        column: x => x.analysis_id,
                        principalTable: "analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "idx_recommendation_logs_user_id",
                table: "recommendation_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_recommendation_logs_analysis_id",
                table: "recommendation_logs",
                column: "analysis_id");

            migrationBuilder.CreateIndex(
                name: "idx_recommendation_logs_created_at",
                table: "recommendation_logs",
                column: "created_at",
                descending: new bool[] { true });

            migrationBuilder.CreateIndex(
                name: "idx_recommendation_logs_feedback_provided_at",
                table: "recommendation_logs",
                column: "feedback_provided_at");

            // Index for analytics: when did users give feedback?
            migrationBuilder.CreateIndex(
                name: "idx_recommendation_logs_user_feedback",
                table: "recommendation_logs",
                columns: new[] { "user_id", "feedback_provided_at" },
                descending: new bool[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "recommendation_logs");

            migrationBuilder.DropTable(
                name: "user_recommendations_cache");
        }
    }
}
