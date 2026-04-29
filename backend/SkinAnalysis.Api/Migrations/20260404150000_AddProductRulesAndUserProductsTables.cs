using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkinAnalysis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductRulesAndUserProductsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Create product_rules table
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

            // Create user_products table
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

            // Create indexes for product_rules
            migrationBuilder.CreateIndex(
                name: "IX_product_rules_product_id",
                table: "product_rules",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_product_rules_priority",
                table: "product_rules",
                column: "priority");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_skin_types_gin",
                table: "product_rules",
                column: "skin_types")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_concerns_gin",
                table: "product_rules",
                column: "concerns")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_step_types_gin",
                table: "product_rules",
                column: "step_types")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_product_rules_periods_gin",
                table: "product_rules",
                column: "periods")
                .Annotation("Npgsql:IndexMethod", "GIN");

            // Create indexes for user_products
            migrationBuilder.CreateIndex(
                name: "IX_user_products_user_id",
                table: "user_products",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_products_product_id",
                table: "user_products",
                column: "product_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_products_user_id_product_id",
                table: "user_products",
                columns: new[] { "user_id", "product_id" },
                unique: true);

            // Add GIN indexes to existing products table for array columns
            migrationBuilder.CreateIndex(
                name: "idx_products_skin_types_gin",
                table: "products",
                column: "skin_types")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_products_concerns_gin",
                table: "products",
                column: "concerns")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_products_actives_gin",
                table: "products",
                column: "actives")
                .Annotation("Npgsql:IndexMethod", "GIN");

            migrationBuilder.CreateIndex(
                name: "idx_products_period_gin",
                table: "products",
                column: "period")
                .Annotation("Npgsql:IndexMethod", "GIN");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_products");

            migrationBuilder.DropTable(
                name: "product_rules");

            migrationBuilder.DropIndex(
                name: "idx_products_skin_types_gin",
                table: "products");

            migrationBuilder.DropIndex(
                name: "idx_products_concerns_gin",
                table: "products");

            migrationBuilder.DropIndex(
                name: "idx_products_actives_gin",
                table: "products");

            migrationBuilder.DropIndex(
                name: "idx_products_period_gin",
                table: "products");
        }
    }
}
