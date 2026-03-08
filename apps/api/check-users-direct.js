const { DataSource } = require('typeorm');
const { User, Tenant } = require('@drive-insight/database');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '54322'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  entities: [User, Tenant],
  synchronize: false,
});

(async () => {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Direct query bypassing RLS (using admin connection)
    const users = await dataSource.query('SELECT id, email, role, tenant_id, name FROM users ORDER BY created_at DESC');

    console.log('\nDirect query (bypassing RLS):');
    console.table(users);
    console.log('Total users:', users.length);

    // Check RLS settings
    console.log('\n--- Checking RLS Configuration ---');
    const rlsCheck = await dataSource.query(`
      SELECT
        schemaname,
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE tablename IN ('users', 'tenants', 'agent_profiles')
    `);
    console.table(rlsCheck);

    // Check if FORCE RLS is enabled
    const forceRlsCheck = await dataSource.query(`
      SELECT
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as force_rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname IN ('users', 'tenants', 'agent_profiles')
    `);
    console.log('\nForce RLS status:');
    console.table(forceRlsCheck);

    // Check policies
    const policies = await dataSource.query(`
      SELECT
        schemaname,
        tablename,
        policyname,
        cmd,
        qual
      FROM pg_policies
      WHERE tablename = 'users'
      ORDER BY policyname
    `);
    console.log('\nRLS Policies on users table:');
    console.table(policies);

    await dataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
})();
