import cron from 'node-cron';
import Banner from '../models/bannerModel.js';

/**
 * Background job that runs daily to check banner activation/deactivation dates
 * - Checks StartDate to automatically activate banners
 * - Checks EndDate to automatically deactivate banners
 * - Runs at 00:05 daily to ensure timely activation/deactivation
 */
export function startBannerActivationJob() {
  // Run daily at 00:05
  cron.schedule('5 0 * * *', async () => {
    try {
      console.log('Running banner activation/deactivation check job...');
      
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Set to start of day UTC for comparison
      
      let activatedCount = 0;
      let deactivatedCount = 0;
      const errors: string[] = [];

      // Find all banners that have scheduling dates
      const banners = await Banner.find({
        $or: [
          { StartDate: { $exists: true, $ne: null } },
          { EndDate: { $exists: true, $ne: null } }
        ]
      });

      console.log(`Found ${banners.length} banner(s) with scheduled dates to check`);

      for (const banner of banners) {
        try {
          const updateData: any = {
            DocumentModifiedDate: new Date()
          };
          let needsUpdate = false;

          // Check if banner should be activated today
          if (banner.StartDate) {
            const startDate = new Date(banner.StartDate);
            startDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison

            // If today equals or is after the start date and banner is not active
            if (startDate.getTime() === today.getTime() && !banner.IsActive) {
              updateData.IsActive = true;
              needsUpdate = true;
              activatedCount++;
              console.log(`Banner activated: ${banner.Title} (ID: ${banner._id})`);
              console.log(`  - Start date: ${banner.StartDate.toISOString()}`);
            }
          }

          // Check if banner should be deactivated today
          if (banner.EndDate) {
            const endDate = new Date(banner.EndDate);
            endDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
            endDate.setDate(endDate.getDate() + 1); // Add 1 day to end date

            // If today equals or is after the end date and banner is active
            if (endDate.getTime() === today.getTime() && banner.IsActive) {
              updateData.IsActive = false;
              needsUpdate = true;
              deactivatedCount++;
              console.log(`Banner deactivated: ${banner.Title} (ID: ${banner._id})`);
              console.log(`  - End date: ${banner.EndDate.toISOString()}`);
            }
          }

          // Update the banner if needed
          if (needsUpdate) {
            await Banner.findByIdAndUpdate(
              banner._id,
              { $set: updateData },
              { runValidators: true }
            );
          }
        } catch (error) {
          const errorMsg = `Error updating ${banner.Title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Banner activation check completed:
        - Banners checked: ${banners.length}
        - Banners activated: ${activatedCount}
        - Banners deactivated: ${deactivatedCount}
        - Errors: ${errors.length}
      `);

      if (errors.length > 0) {
        console.error('Errors during banner activation check:', errors);
      }
    } catch (error) {
      console.error('Fatal error in banner activation job:', error);
    }
  });

  console.log('Banner activation job scheduled to run daily at 00:05');
}

/**
 * One-time check for banners to activate/deactivate (useful for testing)
 * Returns statistics about the check
 */
export async function runBannerActivationCheckNow() {
  try {
    console.log('Running immediate banner activation check...');
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Use UTC for consistent comparison
    
    const stats = {
      total: 0,
      needsActivation: 0,
      needsDeactivation: 0,
      alreadyActive: 0,
      alreadyInactive: 0
    };

    const banners = await Banner.find({
      $or: [
        { StartDate: { $exists: true, $ne: null } },
        { EndDate: { $exists: true, $ne: null } }
      ]
    });

    stats.total = banners.length;

    for (const banner of banners) {
      // Check activation date
      if (banner.StartDate) {
        const startDate = new Date(banner.StartDate);
        startDate.setUTCHours(0, 0, 0, 0);
        
        if (startDate.getTime() === today.getTime()) {
          if (!banner.IsActive) {
            stats.needsActivation++;
          } else {
            stats.alreadyActive++;
          }
        }
      }

      // Check deactivation date
      if (banner.EndDate) {
        const endDate = new Date(banner.EndDate);
        endDate.setUTCHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1); // Add 1 day
        
        if (endDate.getTime() === today.getTime()) {
          if (banner.IsActive) {
            stats.needsDeactivation++;
          } else {
            stats.alreadyInactive++;
          }
        }
      }
    }

    console.log('Banner activation check stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error in banner activation check:', error);
    throw error;
  }
}
