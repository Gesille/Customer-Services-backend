/**
 * seed.ts — run once to create the default restaurant if none exist.
 * Usage: npx ts-node src/scripts/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { v4 as uuidv4 }   from 'uuid';
import { odooRequest } from '../../odoo/odoo-client';


async function seed(): Promise<void> {
  console.log(' Checking if restaurants need seeding...');

  const existing = await odooRequest('x_restaurant', 'search_read', [[]], {
    fields: ['id', 'x_name'],
  });

  if (existing.length > 0) {
    console.log(`✅ ${existing.length} restaurant(s) already exist — skipping.`);
    return;
  }

  const id = await odooRequest('x_restaurant', 'create', [[{
    x_name:          'Main Branch',
    x_location:      'Antigua',
    x_manager_email: 'admin@nextintl.com',
    x_qr_token:      uuidv4(),
  }]]);

  console.log(`✅ Seeded default restaurant (ID: ${id})`);
}

seed().catch((err: Error) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});