import cron from 'node-cron';
import mongoose from 'mongoose';
import Organisation from '../models/organisationModel.js';
import { updateRelatedServices } from '../controllers/organisationController.js';

/**
 * Background job that runs daily to check organisation disabling dates
 * - Checks the last note's Date field for organisations that should be disabled
 * - Automatically disables organisations when the note's Date is reached
 * - Updates all associated services to unpublished state using transactions
 */
export function startDisablingJob() {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running organisation disabling check job...');
      
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set to start of day UTC for comparison
      
      let disabledCount = 0;
      const errors: string[] = [];

      // Find all published organisations that have notes
      const organisations = await Organisation.find({ 
        IsPublished: true,
        'Notes.0': { $exists: true } // Has at least one note
      });

      console.log(`Found ${organisations.length} published organisation(s) with notes to check`);

      for (const org of organisations) {
        // Start a transaction for each organisation
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Get the last note (most recent)
          const lastNote = org.Notes[org.Notes.length - 1];
          
          if (!lastNote || !lastNote.Date) {
            continue; // Skip if no valid note
          }

          // Check if the note's Date has passed or is today
          const noteDate = new Date(lastNote.Date);
          noteDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison

          if (noteDate.getTime() === today.getTime()) {
            // Disable the organisation using findByIdAndUpdate (atomic operation)
            await Organisation.findByIdAndUpdate(
              org._id,
              { 
                $set: { 
                  IsPublished: false,
                  DocumentModifiedDate: new Date()
                } 
              },
              { session }
            );

            // Update all related services using the helper function
            const totalUpdated = await updateRelatedServices(
              org.Key,
              { IsPublished: false },
              session
            );

            // Commit the transaction
            await session.commitTransaction();

            disabledCount++;
            console.log(`Organisation disabled: ${org.Name} (Key: ${org.Key})`);
            console.log(`  - Last note date: ${lastNote.Date.toISOString()}`);
            console.log(`  - Total services updated: ${totalUpdated}`);
          } else {
            // No action needed, abort transaction
            await session.abortTransaction();
          }
        } catch (error) {
          // Rollback transaction on error
          await session.abortTransaction();
          const errorMsg = `Error disabling ${org.Name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        } finally {
          // End the session
          session.endSession();
        }
      }

      console.log(`Organisation disabling check completed:
        - Organisations checked: ${organisations.length}
        - Organisations disabled: ${disabledCount}
        - Errors: ${errors.length}
      `);

      if (errors.length > 0) {
        console.error('Errors during disabling check:', errors);
      }
    } catch (error) {
      console.error('Fatal error in disabling job:', error);
    }
  });

  console.log('Organisation disabling job scheduled to run daily at midnight (00:00)');
}

/**
 * One-time check for organisations to disable (useful for testing)
 * Returns statistics about the check
 */
export async function runDisablingCheckNow() {
  try {
    console.log('Running immediate disabling check...');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
    
    const stats = {
      total: 0,
      needsDisabling: 0,
      alreadyDisabled: 0
    };

    const organisations = await Organisation.find({ 
      'Notes.0': { $exists: true }
    });

    stats.total = organisations.length;

    for (const org of organisations) {
      const lastNote = org.Notes[org.Notes.length - 1];
      
      if (lastNote && lastNote.Date) {
        const noteDate = new Date(lastNote.Date);
        noteDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
        
        if (noteDate.getTime() <= today.getTime()) {
          if (org.IsPublished) {
            stats.needsDisabling++;
          } else {
            stats.alreadyDisabled++;
          }
        }
      }
    }

    console.log('Disabling check stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error in disabling check:', error);
    throw error;
  }
}
