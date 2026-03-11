const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to database as postgres user');

    // Check users
    const users = await client.query('SELECT id, email, role, tenant_id, name FROM users ORDER BY created_at DESC');
    console.log('\nUsers in database:');
    console.table(users.rows);
    console.log('Total users:', users.rows.length);

    // Check tenants
    const tenants = await client.query('SELECT id, name, branch, status FROM tenants');
    console.log('\nTenants in database:');
    console.table(tenants.rows);

    // Check if FORCE RLS is enabled
    const forceRls = await client.query(`
      SELECT
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as force_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname IN ('users', 'tenants', 'agent_profiles')
    `);
    console.log('\nRLS Configuration:');
    console.table(forceRls.rows);

    // Check policies
    const policies = await client.query(`
      SELECT tablename, policyname, cmd, qual
      FROM pg_policies
      WHERE tablename = 'users'
      ORDER BY policyname
    `);
    console.log('\nPolicies on users table:');
    policies.rows.forEach(p => {
      console.log(`\n${p.policyname} (${p.cmd}):`);
      console.log(p.qual);
    });

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
})();
