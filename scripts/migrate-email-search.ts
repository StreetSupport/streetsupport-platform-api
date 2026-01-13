/**
 * Migration script: Populate EmailSearch field for all existing users
 *
 * This script decrypts existing user emails and populates the new EmailSearch
 * field with lowercase plaintext for partial search functionality.
 *
 * Usage: npx tsx scripts/migrate-email-search.ts
 *
 * Prerequisites:
 * - MONGODB_CONN_STRING environment variable must be set
 * - Run against staging first before production
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { decryptEmail } from '../src/utils/encryption.js';

dotenv.config();

// Define a simple schema for the migration (matches User model)
const userSchema = new mongoose.Schema({
  Email: Buffer,
  EmailSearch: String,
}, { collection: 'Users', strict: false });

const User = mongoose.model('MigrationUser', userSchema);

interface MigrationStats {
  total: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function migrate(): Promise<void> {
  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  console.log('='.repeat(60));
  console.log('EmailSearch Migration Script');
  console.log('='.repeat(60));

  // Connect to database
  if (!process.env.MONGODB_CONN_STRING) {
    console.error('Error: MONGODB_CONN_STRING environment variable is not set');
    process.exit(1);
  }

  console.log('\nConnecting to database...');
  await mongoose.connect(process.env.MONGODB_CONN_STRING, {
    dbName: 'streetsupport'
  });
  console.log('Connected successfully\n');

  // Get all users
  const users = await User.find({}).lean();
  stats.total = users.length;

  console.log(`Found ${stats.total} users to process\n`);
  console.log('Processing users...');

  // Process in batches for better performance
  const batchSize = 100;
  const batches = Math.ceil(users.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, users.length);
    const batch = users.slice(start, end);

    const bulkOps: any[] = [];

    for (const user of batch) {
      try {
        // Skip if EmailSearch already populated
        if (user.EmailSearch) {
          stats.skipped++;
          continue;
        }

        // Decrypt the email
        const decryptedEmail = decryptEmail(user.Email);

        if (!decryptedEmail) {
          stats.failed++;
          stats.errors.push(`User ${user._id}: Failed to decrypt email`);
          continue;
        }

        // Prepare bulk update operation
        bulkOps.push({
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { EmailSearch: decryptedEmail.toLowerCase() } }
          }
        });

        stats.updated++;
      } catch (error) {
        stats.failed++;
        stats.errors.push(`User ${user._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Execute bulk operations for this batch
    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
    }

    // Progress update
    const progress = Math.round((end / stats.total) * 100);
    process.stdout.write(`\rProgress: ${progress}% (${end}/${stats.total})`);
  }

  console.log('\n');

  // Print summary
  console.log('='.repeat(60));
  console.log('Migration Complete');
  console.log('='.repeat(60));
  console.log(`Total users:     ${stats.total}`);
  console.log(`Updated:         ${stats.updated}`);
  console.log(`Skipped:         ${stats.skipped} (already had EmailSearch)`);
  console.log(`Failed:          ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more errors`);
    }
  }

  // Disconnect
  await mongoose.disconnect();
  console.log('\nDisconnected from database');
}

// Run migration
migrate()
  .then(() => {
    console.log('\nMigration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
