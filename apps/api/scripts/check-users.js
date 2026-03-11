const { createClient } = require('@supabase/supabase-js');

const client = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const { data, error } = await client
      .from('users')
      .select('id, email, role, tenant_id, name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Current users in database:');
      console.table(data);
      console.log('\nTotal users:', data.length);
    }
  } catch (err) {
    console.error('Exception:', err);
  } finally {
    process.exit(0);
  }
})();
