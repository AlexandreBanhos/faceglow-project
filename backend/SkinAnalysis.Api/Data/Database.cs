using System.Data;
using System.IO;
using Npgsql;

namespace SkinAnalysis.Api.Data;

public class Database(IConfiguration configuration)
{
    public IDbConnection CreateConnection()
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
        }

        return new NpgsqlConnection(connectionString);
    }

    public async Task<int> ExecuteScalarWithRetryAsync(string sql, int maxAttempts = 3, CancellationToken cancellationToken = default)
    {
        var delayMs = 300;
        Exception? lastException = null;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                using var conn = CreateConnection();
                if (conn is NpgsqlConnection npgsqlConnection)
                {
                    await npgsqlConnection.OpenAsync(cancellationToken);
                    await using var cmd = new NpgsqlCommand(sql, npgsqlConnection)
                    {
                        CommandTimeout = 90
                    };
                    return Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken));
                }

                throw new InvalidOperationException("Unsupported database connection type.");
            }
            catch (Exception ex) when (IsTransient(ex) && attempt < maxAttempts)
            {
                lastException = ex;
                await Task.Delay(delayMs, cancellationToken);
                delayMs *= 2;
            }
            catch (Exception ex)
            {
                lastException = ex;
                break;
            }
        }

        throw new InvalidOperationException("Database check failed after retries.", lastException);
    }

    private static bool IsTransient(Exception ex)
    {
        if (ex is TimeoutException || ex is IOException)
        {
            return true;
        }

        if (ex is NpgsqlException npgsqlEx)
        {
            return npgsqlEx.IsTransient;
        }

        if (ex is PostgresException pgEx)
        {
            return pgEx.SqlState is "57P01" or "57P02" or "57P03" or "53300";
        }

        return false;
    }
}
