
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../../config/env';
import { RestaurantModel } from '../../models/restaurant.model';

async function seed(): Promise<void> {
  await mongoose.connect(ENV.DB_URL);
  console.log('Connected to MongoDB — checking if restaurants need seeding...');

  const existing = await RestaurantModel.find().select('_id x_name').lean();

  if (existing.length > 0) {
    console.log(` ${existing.length} restaurant(s) already exist — skipping.`);
    await mongoose.disconnect();
    return;
  }

  const doc = await RestaurantModel.create({
    x_name:          'Main Branch',
    x_location:      'Antigua',
    x_manager_email: 'admin@nextintl.com',
    x_qr_token:      uuidv4(),
  });

  console.log(`Seeded default restaurant (ID: ${doc._id.toString()})`);
  await mongoose.disconnect();
}

seed().catch((err: Error) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});