import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@streetsupport.net';
const ADMIN_REMINDER_TEMPLATE_ID = process.env.SENDGRID_ADMIN_REMINDER_TEMPLATE_ID || '';

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

    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: `Action Required: Update ${organisationName} Information`,
      text: `
Dear Administrator,

This is a reminder that the information for ${organisationName} has not been updated for ${daysInactive} days.

To ensure our directory remains accurate and helpful, please review and update your organisation's information or confirm it is still up to date.

If no action is taken within 10 days, your organisation will be marked as unverified.

To update your information:
1. Log in to the Street Support admin panel
2. Navigate to your organisation page
3. Review and update information, or click "Information up to date"

Thank you for helping us maintain an accurate directory of support services.

Best regards,
Street Support Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #38ae8e; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .warning { background-color: #fff3cd; border-left: 4px solid #e1c116; padding: 12px; margin: 16px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #38ae8e; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Action Required</h1>
    </div>
    <div class="content">
      <p>Dear Administrator,</p>
      
      <p>This is a reminder that the information for <strong>${organisationName}</strong> has not been updated for <strong>${daysInactive} days</strong>.</p>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> If no action is taken within 10 days, your organisation will be marked as unverified.
      </div>
      
      <p>To ensure our directory remains accurate and helpful, please review and update your organisation's information or confirm it is still up to date.</p>
      
      <p><strong>To update your information:</strong></p>
      <ol>
        <li>Log in to the Street Support admin panel</li>
        <li>Navigate to your organisation page</li>
        <li>Review and update information, or click "Information up to date"</li>
      </ol>
      
      <p>Thank you for helping us maintain an accurate directory of support services.</p>
      
      <p>Best regards,<br>Street Support Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    };

    // Use template if configured, otherwise use custom HTML
    if (ADMIN_REMINDER_TEMPLATE_ID) {
      const templateMsg = {
        to: toEmail,
        from: FROM_EMAIL,
        templateId: ADMIN_REMINDER_TEMPLATE_ID,
        dynamicTemplateData: {
          organisationName,
          daysInactive,
        }
      };
      await sgMail.send(templateMsg);
    } else {
      await sgMail.send(msg);
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

    const msg = {
      to: toEmail,
      from: FROM_EMAIL,
      subject: `${organisationName} Verification Status Changed`,
      text: `
Dear Administrator,

The verification status for ${organisationName} has been changed to unverified due to no activity for over 100 days.

To restore your verified status, please:
1. Log in to the Street Support admin panel
2. Navigate to your organisation page
3. Update your organisation information
4. Contact an administrator if you need assistance

Thank you,
Street Support Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #a90000; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .alert { background-color: #fef2f2; border-left: 4px solid #a90000; padding: 12px; margin: 16px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Verification Status Changed</h1>
    </div>
    <div class="content">
      <p>Dear Administrator,</p>
      
      <div class="alert">
        <strong>Notice:</strong> The verification status for <strong>${organisationName}</strong> has been changed to <strong>unverified</strong> due to no activity for over 100 days.
      </div>
      
      <p>To restore your verified status, please:</p>
      <ol>
        <li>Log in to the Street Support admin panel</li>
        <li>Navigate to your organisation page</li>
        <li>Update your organisation information</li>
        <li>Contact an administrator if you need assistance</li>
      </ol>
      
      <p>Thank you,<br>Street Support Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    };

    await sgMail.send(msg);
    console.log(`Verification expired email sent to ${toEmail} for ${organisationName}`);
    return true;
  } catch (error) {
    console.error('Error sending verification expired email:', error);
    return false;
  }
}
