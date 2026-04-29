using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SkinAnalysis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRoutineCompletions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Vermelhidao",
                table: "analysis",
                newName: "vermelhidao");

            migrationBuilder.RenameColumn(
                name: "Poros",
                table: "analysis",
                newName: "poros");

            migrationBuilder.RenameColumn(
                name: "Olheiras",
                table: "analysis",
                newName: "olheiras");

            migrationBuilder.RenameColumn(
                name: "Cravos",
                table: "analysis",
                newName: "cravos");

            migrationBuilder.RenameColumn(
                name: "LinhasFinas",
                table: "analysis",
                newName: "linhas_finas");

            migrationBuilder.RenameColumn(
                name: "EspinhasAtivas",
                table: "analysis",
                newName: "espinhas_ativas");

            migrationBuilder.CreateTable(
                name: "routine_completions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    completion_date = table.Column<DateTime>(type: "date", nullable: false),
                    morning_completed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    night_completed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_routine_completions", x => x.id);
                    table.ForeignKey(
                        name: "FK_routine_completions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_routine_completions_user_id",
                table: "routine_completions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_routine_completions_user_id_completion_date",
                table: "routine_completions",
                columns: new[] { "user_id", "completion_date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "routine_completions");

            migrationBuilder.RenameColumn(
                name: "vermelhidao",
                table: "analysis",
                newName: "Vermelhidao");

            migrationBuilder.RenameColumn(
                name: "poros",
                table: "analysis",
                newName: "Poros");

            migrationBuilder.RenameColumn(
                name: "olheiras",
                table: "analysis",
                newName: "Olheiras");

            migrationBuilder.RenameColumn(
                name: "cravos",
                table: "analysis",
                newName: "Cravos");

            migrationBuilder.RenameColumn(
                name: "linhas_finas",
                table: "analysis",
                newName: "LinhasFinas");

            migrationBuilder.RenameColumn(
                name: "espinhas_ativas",
                table: "analysis",
                newName: "EspinhasAtivas");
        }
    }
}
