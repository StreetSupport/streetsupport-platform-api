import cron from 'node-cron';
import Organisation from '../models/organisationModel.js';
import { updateRelatedServices } from '../controllers/organisationController.js';
import { sendVerificationReminderEmail, sendVerificationExpiredEmail } from '../services/emailService.js';

/**
 * Background job that runs daily to check organisation verification status
 * - Sends reminders at 90 days of inactivity
 * - Marks organisations as unverified after 100 days of inactivity
 */
export function startVerificationJob() {
  // Run daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('Running verification check job...');
      
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for consistent day calculations
      let remindersCount = 0;
      let unverifiedCount = 0;
      const errors: string[] = [];

      // Find all organisations with selected administrators
      const organisations = await Organisation.find({
        'Administrators.IsSelected': true,
        // TODO: remove this after testing
        DocumentCreationDate: { $gte: new Date('2025-01-01') }
      });

      for (const org of organisations) {
        try {
          // Calculate days since last update using UTC for consistent calculations
          const lastUpdate = new Date(org.DocumentModifiedDate);
          lastUpdate.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for accurate day comparison
          
          const daysSinceUpdate = Math.floor(
            (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Find selected administrator
          const selectedAdmin = org.Administrators.find(admin => admin.IsSelected);
          const email = selectedAdmin?.Email || org.Email;
          
          if (!email) {
            continue;
          }

          // Check if exactly 90 days (send reminder)
          if (daysSinceUpdate === 90) {
            console.log(`Reminder sent for: ${org.Name} (${email})`);
            const emailSent = await sendVerificationReminderEmail(
              email,
              org.Name,
              daysSinceUpdate
            );
            
            if (emailSent) {
              remindersCount++;
              console.log(`Reminder sent for: ${org.Name} (${email})`);
            } else {
              errors.push(`Failed to send reminder for ${org.Name}`);
            }
          } // Check if 100 days or more (unverify and send notification)
          else if (daysSinceUpdate >= 100 && org.IsVerified) {
            // Mark as unverified and cascade to related services
            org.IsVerified = false;
            await org.save();
            
            // Update related services to unverified status
            const totalUpdated = await updateRelatedServices(
              org.Key,
              { IsVerified: false }
            );

            // Send notification email
            const emailSent = await sendVerificationExpiredEmail(
              email,
              org.Name
            );
            
            if (emailSent) {
              unverifiedCount++;
              console.log(`Organisation unverified: ${org.Name} (${email})`);
              console.log(`  - Related services updated: ${totalUpdated}`);
            } else {
              errors.push(`Failed to send expiration email for ${org.Name}`);
            }
          }
        } catch (error) {
          const errorMsg = `Error processing ${org.Name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Verification check completed:
        - Organisations checked: ${organisations.length}
        - Reminders sent: ${remindersCount}
        - Organisations unverified: ${unverifiedCount}
        - Errors: ${errors.length}
      `);

      if (errors.length > 0) {
        console.error('Errors during verification check:', errors);
      }
    } catch (error) {
      console.error('Fatal error in verification job:', error);
    }
  });

  console.log('Organisation verification job scheduled to run daily at 9:00 AM');
}

/**
 * One-time check for verification status (useful for testing)
 * Returns statistics about the check
 */
export async function runVerificationCheckNow() {
  try {
    console.log('Running immediate verification check...');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for consistent day calculations
    const stats = {
      total: 0,
      needsReminder: 0,
      needsUnverify: 0,
      alreadyUnverified: 0
    };

    const organisations = await Organisation.find({ 
      'Administrators.IsSelected': true 
    });

    stats.total = organisations.length;

    for (const org of organisations) {
      const lastUpdate = new Date(org.DocumentModifiedDate);
      lastUpdate.setUTCHours(0, 0, 0, 0); // Set to UTC midnight for accurate day comparison
      
      const daysSinceUpdate = Math.floor(
        (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUpdate === 90) {
        stats.needsReminder++;
      }

      if (daysSinceUpdate >= 100) {
        if (org.IsVerified) {
          stats.needsUnverify++;
        } else {
          stats.alreadyUnverified++;
        }
      }
    }

    console.log('Verification check stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error in verification check:', error);
    throw error;
  }
}
