using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkinAnalysis.Api.Migrations;

public partial class SimplifiedRoutineArchitecture : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.id);
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

        migrationBuilder.AddColumn<string>(
            name: "skin_type",
            table: "products",
            type: "character varying(100)",
            maxLength: 100,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<bool>(
            name: "is_user_product",
            table: "products",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<Guid>(
            name: "user_id",
            table: "products",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "created_at",
            table: "products",
            type: "timestamp with time zone",
            nullable: false,
            defaultValueSql: "now()");

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
            name: "IX_users_email",
            table: "users",
            column: "email",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_skin_analysis_user_id",
            table: "skin_analysis",
            column: "user_id");

        migrationBuilder.CreateIndex(
            name: "IX_skin_analysis_user_id_created_at",
            table: "skin_analysis",
            columns: new[] { "user_id", "created_at" });

        migrationBuilder.CreateIndex(
            name: "IX_products_user_id",
            table: "products",
            column: "user_id");

        migrationBuilder.CreateIndex(
            name: "IX_products_user_id_is_user_product",
            table: "products",
            columns: new[] { "user_id", "is_user_product" });

        migrationBuilder.CreateIndex(
            name: "IX_routine_user_id",
            table: "routine",
            column: "user_id");

        migrationBuilder.CreateIndex(
            name: "IX_routine_based_on_analysis_id",
            table: "routine",
            column: "based_on_analysis_id");

        migrationBuilder.CreateIndex(
            name: "IX_routine_user_id_is_active",
            table: "routine",
            columns: new[] { "user_id", "is_active" },
            unique: true,
            filter: "is_active = true");

        migrationBuilder.CreateIndex(
            name: "IX_routine_step_routine_id",
            table: "routine_step",
            column: "routine_id");

        migrationBuilder.CreateIndex(
            name: "IX_routine_step_product_id",
            table: "routine_step",
            column: "product_id");

        migrationBuilder.AddForeignKey(
            name: "FK_products_users_user_id",
            table: "products",
            column: "user_id",
            principalTable: "users",
            principalColumn: "id",
            onDelete: ReferentialAction.SetNull);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_products_users_user_id",
            table: "products");

        migrationBuilder.DropTable(name: "routine_step");
        migrationBuilder.DropTable(name: "routine");
        migrationBuilder.DropTable(name: "skin_analysis");
        migrationBuilder.DropTable(name: "users");

        migrationBuilder.DropIndex(name: "IX_products_user_id", table: "products");
        migrationBuilder.DropIndex(name: "IX_products_user_id_is_user_product", table: "products");

        migrationBuilder.DropColumn(name: "skin_type", table: "products");
        migrationBuilder.DropColumn(name: "is_user_product", table: "products");
        migrationBuilder.DropColumn(name: "user_id", table: "products");
        migrationBuilder.DropColumn(name: "created_at", table: "products");
    }
}
