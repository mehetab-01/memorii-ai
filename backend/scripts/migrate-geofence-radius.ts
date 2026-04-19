/**
 * Migration verifier: confirms geofence_radius column exists in patients table.
 * Run after applying the SQL migration:
 *   npx ts-node scripts/migrate-geofence-radius.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

async function verify() {
  // Try reading a patient row — if geofence_radius is present the column exists
  const { data, error } = await supabase
    .from('patients')
    .select('id, geofence_radius')
    .limit(1);

  if (error) {
    if (error.message.includes('geofence_radius')) {
      console.error('Column does not exist yet. Run scripts/migrate-geofence-radius.sql in the Supabase SQL editor first.');
    } else {
      console.error('Query error:', error.message);
    }
    process.exit(1);
  }

  console.log('✓ geofence_radius column exists.');
  if (data && data.length > 0) {
    console.log(`  Sample row: patient ${data[0].id} → ${data[0].geofence_radius}m`);
  }
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
