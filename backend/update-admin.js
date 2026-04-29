import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.hemoqtqlczjgtrfibudj',
  password: '142920@databaseSenha',
  ssl: { rejectUnauthorized: true }
});

(async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Connected to Supabase');
    
    // Add column if not exists
    await client.query('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;');
    console.log('✓ Column is_admin added (or already exists)');
    
    // Update user to admin
    const result = await client.query(
      'UPDATE public.users SET is_admin = true WHERE id = $1 RETURNING id, email, is_admin;',
      ['57b9be3c-9834-4a62-951a-6f8d16d3c92b']
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log('✓ User promoted to admin:');
      console.log(`  ID: ${row.id}`);
      console.log(`  Email: ${row.email}`);
      console.log(`  IsAdmin: ${row.is_admin}`);
    } else {
      console.log('⚠ User not found');
    }
    
    client.release();
    console.log('\n✓ Success!');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
})();
