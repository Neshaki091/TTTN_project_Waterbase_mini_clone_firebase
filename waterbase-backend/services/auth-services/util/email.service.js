const nodemailer = require('nodemailer');

// Email service for sending password reset emails
class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Get email configuration from environment variables
        const emailConfig = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        };

        // Only create transporter if email credentials are configured
        if (emailConfig.auth.user && emailConfig.auth.pass) {
            this.transporter = nodemailer.createTransport(emailConfig);
            console.log('✅ Email service initialized successfully');
        } else {
            console.warn('⚠️ Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD environment variables.');
        }
    }

    /**
     * Send password reset email with temporary password
     * @param {string} recipientEmail - Email address to send to
     * @param {string} temporaryPassword - Temporary password generated for user
     * @param {string} username - Username of the account
     * @returns {Promise<boolean>} - True if email sent successfully
     */
    async sendPasswordResetEmail(recipientEmail, temporaryPassword, username) {
        if (!this.transporter) {
            throw new Error('Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
        }

        const emailFrom = process.env.EMAIL_FROM || 'Waterbase <noreply@waterbase.click>';

        const mailOptions = {
            from: emailFrom,
            to: recipientEmail,
            subject: 'Khôi phục mật khẩu Waterbase',
            html: this.getPasswordResetTemplate(username, temporaryPassword),
            text: `
Xin chào ${username},

Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản Waterbase của mình.

Mật khẩu tạm thời của bạn là: ${temporaryPassword}

Vui lòng đăng nhập bằng mật khẩu tạm thời này và đổi mật khẩu ngay lập tức để bảo mật tài khoản.

Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này.

Trân trọng,
Đội ngũ Waterbase
      `.trim(),
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    /**
     * HTML template for password reset email
     */
    getPasswordResetTemplate(username, temporaryPassword) {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Khôi phục mật khẩu Waterbase</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                💧 Waterbase
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">
                Backend as a Service Platform
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; color: #e2e8f0;">
              <h2 style="margin: 0 0 20px 0; color: #f1f5f9; font-size: 24px;">
                Khôi phục mật khẩu
              </h2>
              
              <p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 16px;">
                Xin chào <strong style="color: #60a5fa;">${username}</strong>,
              </p>
              
              <p style="margin: 0 0 15px 0; line-height: 1.6; font-size: 16px;">
                Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản Waterbase của mình.
              </p>
              
              <p style="margin: 0 0 25px 0; line-height: 1.6; font-size: 16px;">
                Mật khẩu tạm thời của bạn là:
              </p>
              
              <!-- Password Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #334155; border-radius: 6px; padding: 20px; text-align: center; border: 2px dashed #475569;">
                    <code style="font-size: 24px; font-weight: bold; color: #60a5fa; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                      ${temporaryPassword}
                    </code>
                  </td>
                </tr>
              </table>
              
              <div style="margin: 25px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  ⚠️ <strong>Quan trọng:</strong> Vui lòng đăng nhập bằng mật khẩu tạm thời này và đổi mật khẩu ngay lập tức để bảo mật tài khoản của bạn.
                </p>
              </div>
              
              <p style="margin: 25px 0 0 0; line-height: 1.6; font-size: 14px; color: #94a3b8;">
                Nếu bạn không yêu cầu khôi phục mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                Trân trọng,<br>
                <strong style="color: #94a3b8;">Đội ngũ Waterbase</strong>
              </p>
              <p style="margin: 10px 0 0 0; color: #475569; font-size: 12px;">
                © 2025 Waterbase. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
    }

    /**
     * Verify email service connection
     */
    async verifyConnection() {
        if (!this.transporter) {
            return false;
        }

        try {
            await this.transporter.verify();
            console.log('✅ Email service connection verified');
            return true;
        } catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
