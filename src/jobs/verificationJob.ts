import cron from 'node-cron';
import Organisation from '../models/organisationModel.js';
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
      let remindersCount = 0;
      let unverifiedCount = 0;
      const errors: string[] = [];

      // Find all organisations with selected administrators
      const organisations = await Organisation.find({ 
        'Administrators.IsSelected': true 
      });

      for (const org of organisations) {
        try {
          // Calculate days since last update
          const lastUpdate = new Date(org.DocumentModifiedDate);
          const daysSinceUpdate = Math.floor(
            (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Find selected administrator
          const selectedAdmin = org.Administrators.find(admin => admin.IsSelected);
          
          if (!selectedAdmin || !selectedAdmin.Email) {
            continue;
          }

          // Check if exactly 90 days (send reminder)
          if (daysSinceUpdate === 90) {
            const emailSent = await sendVerificationReminderEmail(
              selectedAdmin.Email,
              org.Name,
              daysSinceUpdate
            );
            
            if (emailSent) {
              remindersCount++;
              console.log(`Reminder sent for: ${org.Name} (${selectedAdmin.Email})`);
            } else {
              errors.push(`Failed to send reminder for ${org.Name}`);
            }
          }

          // Check if 100 days or more (unverify and send notification)
          if (daysSinceUpdate >= 100 && org.IsVerified) {
            // Mark as unverified
            org.IsVerified = false;
            await org.save();

            // Send notification email
            const emailSent = await sendVerificationExpiredEmail(
              selectedAdmin.Email,
              org.Name
            );
            
            if (emailSent) {
              unverifiedCount++;
              console.log(`Organisation unverified: ${org.Name} (${selectedAdmin.Email})`);
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

  console.log('Verification job scheduled to run daily at 9:00 AM');
}

/**
 * One-time check for verification status (useful for testing)
 * Returns statistics about the check
 */
export async function runVerificationCheckNow() {
  try {
    console.log('Running immediate verification check...');
    
    const today = new Date();
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
