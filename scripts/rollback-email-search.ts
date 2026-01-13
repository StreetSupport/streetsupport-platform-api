/**
 * Rollback script: Remove EmailSearch field from all users
 *
 * This script removes the EmailSearch field from all user documents,
 * reverting the database to its previous state.
 *
 * Usage: npx tsx scripts/rollback-email-search.ts
 *
 * Prerequisites:
 * - MONGODB_CONN_STRING environment variable must be set
 *
 * Note: This does not revert code changes - use git for that:
 *   git checkout -- src/models/userModel.ts src/types/IUser.ts src/controllers/userController.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function rollback(): Promise<void> {
  console.log('='.repeat(60));
  console.log('EmailSearch Rollback Script');
  console.log('='.repeat(60));

  // Connect to database
  if (!process.env.MONGODB_CONN_STRING) {
    console.error('Error: MONGODB_CONN_STRING environment variable is not set');
    process.exit(1);
  }

  console.log('\nConnecting to database...');
  await mongoose.connect(process.env.MONGODB_CONN_STRING);
  console.log('Connected successfully\n');

  // Get the Users collection directly
  const db = mongoose.connection.db;
  if (!db) {
    console.error('Error: Could not get database connection');
    process.exit(1);
  }

  const usersCollection = db.collection('Users');

  // Count users with EmailSearch field
  const usersWithField = await usersCollection.countDocuments({ EmailSearch: { $exists: true } });
  console.log(`Found ${usersWithField} users with EmailSearch field\n`);

  if (usersWithField === 0) {
    console.log('No users have EmailSearch field - nothing to rollback');
    await mongoose.disconnect();
    return;
  }

  // Confirm before proceeding
  console.log('This will remove the EmailSearch field from all users.');
  console.log('Press Ctrl+C within 5 seconds to cancel...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Proceeding with rollback...\n');

  // Remove EmailSearch field from all users
  const result = await usersCollection.updateMany(
    { EmailSearch: { $exists: true } },
    { $unset: { EmailSearch: '' } }
  );

  console.log('='.repeat(60));
  console.log('Rollback Complete');
  console.log('='.repeat(60));
  console.log(`Documents matched:  ${result.matchedCount}`);
  console.log(`Documents modified: ${result.modifiedCount}`);

  // Drop the index if it exists
  try {
    const indexes = await usersCollection.indexes();
    const emailSearchIndex = indexes.find(idx => idx.key && 'EmailSearch' in idx.key);
    if (emailSearchIndex && emailSearchIndex.name) {
      await usersCollection.dropIndex(emailSearchIndex.name);
      console.log(`Dropped index: ${emailSearchIndex.name}`);
    }
  } catch (error) {
    // Index might not exist, which is fine
    console.log('No EmailSearch index to drop');
  }

  // Disconnect
  await mongoose.disconnect();
  console.log('\nDisconnected from database');

  console.log('\nTo revert code changes, run:');
  console.log('  git checkout -- src/models/userModel.ts src/types/IUser.ts src/controllers/userController.ts');
}

// Run rollback
rollback()
  .then(() => {
    console.log('\nRollback script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nRollback script failed:', error);
    process.exit(1);
  });
