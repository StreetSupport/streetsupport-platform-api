import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'info@streetsupport.net';
const SENDGRID_ORG_UPDATE_NOTIFICATION_REMINDER_TEMPLATE_ID = process.env.SENDGRID_ORG_UPDATE_NOTIFICATION_REMINDER_TEMPLATE_ID || '';
const SENDGRID_ORG_VERIFICATION_EXPIRED_NOTIFICATION_TEMPLATE_ID = process.env.SENDGRID_ORG_VERIFICATION_EXPIRED_NOTIFICATION_TEMPLATE_ID || '';
const LOGIN_URL = process.env.ADMIN_URL || '';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Send verification reminder email to organisation administrator
 * @param toEmail - Administrator's email address
 * @param organisationName - Name of the organisation
 * @param daysInactive - Number of days since last update
 */
export async function sendVerificationReminderEmail(
  toEmail: string,
  organisationName: string,
  daysInactive: number
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }

    // Use template if configured, otherwise use custom HTML
    if (SENDGRID_ORG_UPDATE_NOTIFICATION_REMINDER_TEMPLATE_ID) {
      const templateMsg = {
        to: toEmail,
        from: FROM_EMAIL,
        templateId: SENDGRID_ORG_UPDATE_NOTIFICATION_REMINDER_TEMPLATE_ID,
        dynamicTemplateData: {
          org_name: organisationName,
          days_inactive: daysInactive,
          login_url: LOGIN_URL
        }
      };
      await sgMail.send(templateMsg);
    }
    else {
      console.error('SendGrid template ID not configured');
      return false;
    }

    console.log(`Verification reminder email sent to ${toEmail} for ${organisationName}`);
    return true;
  } catch (error) {
    console.error('Error sending verification reminder email:', error);
    return false;
  }
}

/**
 * Send verification expired email (when organisation becomes unverified)
 * @param toEmail - Administrator's email address
 * @param organisationName - Name of the organisation
 */
export async function sendVerificationExpiredEmail(
  toEmail: string,
  organisationName: string
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }
    
    // Use template if configured, otherwise use custom HTML
    if (SENDGRID_ORG_VERIFICATION_EXPIRED_NOTIFICATION_TEMPLATE_ID) {
      const templateMsg = {
        to: toEmail,
        from: FROM_EMAIL,
        templateId: SENDGRID_ORG_VERIFICATION_EXPIRED_NOTIFICATION_TEMPLATE_ID,
        dynamicTemplateData: {
          org_name: organisationName,
          login_url: LOGIN_URL
        }
      };
      await sgMail.send(templateMsg);
    } else {
      console.error('SendGrid template ID not configured');
      return false;
    }

    console.log(`Verification expired email sent to ${toEmail} for ${organisationName}`);
    return true;
  } catch (error) {
    console.error('Error sending verification expired email:', error);
    return false;
  }
}
