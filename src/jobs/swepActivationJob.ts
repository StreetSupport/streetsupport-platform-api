import cron from 'node-cron';
import SwepBanner from '../models/swepModel.js';

/**
 * Background job that runs daily to check SWEP banner activation/deactivation dates
 * - Checks swepActiveFrom date to automatically activate banners
 * - Checks swepActiveUntil date to automatically deactivate banners
 * - Runs at midnight daily to ensure timely activation/deactivation
 */
export function startSwepActivationJob() {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running SWEP banner activation/deactivation check job...');
      
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set to start of day UTC for comparison
      
      let activatedCount = 0;
      let deactivatedCount = 0;
      const errors: string[] = [];

      // Find all SWEP banners that have activation dates
      const swepBanners = await SwepBanner.find({
        $or: [
          { SwepActiveFrom: { $exists: true, $ne: null } },
          { SwepActiveUntil: { $exists: true, $ne: null } }
        ]
      });

      console.log(`Found ${swepBanners.length} SWEP banner(s) with scheduled dates to check`);

      for (const swep of swepBanners) {
        try {
          const updateData: any = {
            DocumentModifiedDate: new Date()
          };
          let needsUpdate = false;

          // Check if banner should be activated today
          if (swep.SwepActiveFrom) {
            const activeFromDate = new Date(swep.SwepActiveFrom);
            activeFromDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison

            // If today equals or is after the activeFrom date and banner is not active
            if (activeFromDate.getTime() === today.getTime() && !swep.IsActive) {
              updateData.IsActive = true;
              needsUpdate = true;
              activatedCount++;
              console.log(`SWEP banner activated: ${swep.LocationName} (${swep.LocationSlug})`);
              console.log(`  - Active from: ${swep.SwepActiveFrom.toISOString()}`);
            }
          }

          // Check if banner should be deactivated today
          if (swep.SwepActiveUntil) {
            const activeUntilDate = new Date(swep.SwepActiveUntil);
            activeUntilDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
            activeUntilDate.setDate(activeUntilDate.getDate() + 1); // Add 1 day to active until date

            // If today equals or is after the activeUntil date and banner is active
            if (activeUntilDate.getTime() === today.getTime() && swep.IsActive) {
              updateData.IsActive = false;
              needsUpdate = true;
              deactivatedCount++;
              console.log(`SWEP banner deactivated: ${swep.LocationName} (${swep.LocationSlug})`);
              console.log(`  - Active until: ${swep.SwepActiveUntil.toISOString()}`);
            }
          }

          // Update the banner if needed
          if (needsUpdate) {
            await SwepBanner.findByIdAndUpdate(
              swep._id,
              { $set: updateData },
              { runValidators: true }
            );
          }
        } catch (error) {
          const errorMsg = `Error updating ${swep.LocationName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`SWEP banner activation check completed:
        - Banners checked: ${swepBanners.length}
        - Banners activated: ${activatedCount}
        - Banners deactivated: ${deactivatedCount}
        - Errors: ${errors.length}
      `);

      if (errors.length > 0) {
        console.error('Errors during SWEP activation check:', errors);
      }
    } catch (error) {
      console.error('Fatal error in SWEP activation job:', error);
    }
  });

  console.log('SWEP banner activation job scheduled to run daily at midnight (00:00)');
}

/**
 * One-time check for SWEP banners to activate/deactivate (useful for testing)
 * Returns statistics about the check
 */
export async function runSwepActivationCheckNow() {
  try {
    console.log('Running immediate SWEP activation check...');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
    
    const stats = {
      total: 0,
      needsActivation: 0,
      needsDeactivation: 0,
      alreadyActive: 0,
      alreadyInactive: 0
    };

    const swepBanners = await SwepBanner.find({
      $or: [
        { swepActiveFrom: { $exists: true, $ne: null } },
        { swepActiveUntil: { $exists: true, $ne: null } }
      ]
    });

    stats.total = swepBanners.length;

    for (const swep of swepBanners) {
      // Check activation date
      if (swep.SwepActiveFrom) {
        const activeFromDate = new Date(swep.SwepActiveFrom);
        activeFromDate.setUTCHours(0, 0, 0, 0);
        
        if (activeFromDate.getTime() === today.getTime()) {
          if (!swep.IsActive) {
            stats.needsActivation++;
          } else {
            stats.alreadyActive++;
          }
        }
      }

      // Check deactivation date
      if (swep.SwepActiveUntil) {
        const activeUntilDate = new Date(swep.SwepActiveUntil);
        activeUntilDate.setUTCHours(0, 0, 0, 0);
        
        if (activeUntilDate.getTime() === today.getTime()) {
          if (swep.IsActive) {
            stats.needsDeactivation++;
          } else {
            stats.alreadyInactive++;
          }
        }
      }
    }

    console.log('SWEP activation check stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error in SWEP activation check:', error);
    throw error;
  }
}
