import nodemailer from "nodemailer";
import { NODE_ENV } from "../config/environment.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter based on environment
    if (NODE_ENV === "production") {
      // Production: Use Gmail SMTP
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD, // Use App Password, not regular password
        },
      });
    } else {
      // Development: Use Ethereal Email (fake SMTP for testing)
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: "ethereal.user@ethereal.email",
          pass: "ethereal.pass",
        },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "nfl-picks@example.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (NODE_ENV === "development") {
        console.log("Email sent (development):", nodemailer.getTestMessageUrl(info));
      } else {
        console.log("Email sent successfully:", info.messageId);
      }
      
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendPickReminder(
    userEmail: string,
    userName: string,
    week: number,
    lockTime: Date,
    reminderType: "1hour" | "10min"
  ): Promise<boolean> {
    const timeText = reminderType === "1hour" ? "1 hour" : "10 minutes";
    const urgencyText = reminderType === "10min" ? "URGENT: " : "";
    
    const subject = `${urgencyText}NFL Picks Reminder - Week ${week}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>NFL Picks Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { 
              display: inline-block; 
              background: #dc2626; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              font-weight: bold;
              margin: 20px 0;
            }
            .lock-time { 
              background: #fef3c7; 
              border: 2px solid #f59e0b; 
              padding: 15px; 
              border-radius: 6px; 
              margin: 20px 0;
              text-align: center;
            }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏈 NFL Picks Reminder</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName}!</h2>
              
              <p>This is a friendly reminder that you have <strong>${timeText}</strong> left to submit your picks for <strong>Week ${week}</strong>!</p>
              
              <div class="lock-time">
                <h3>⏰ Picks Lock At:</h3>
                <p style="font-size: 18px; margin: 10px 0;"><strong>${lockTime.toLocaleString()}</strong></p>
              </div>
              
              <p>Don't miss out on this week's action! Make sure to:</p>
              <ul>
                <li>Pick winners against the spread for each game</li>
                <li>Choose your Lock of the Week for double points</li>
                <li>Select a touchdown scorer</li>
                <li>Submit your prop bet (optional)</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/picks" class="button">
                  Submit Your Picks Now
                </a>
              </div>
              
              <p style="margin-top: 30px;">
                <strong>Remember:</strong> Each player can only be selected as a touchdown scorer once per season, 
                so choose wisely!
              </p>
            </div>
            <div class="footer">
              <p>This is an automated reminder from NFL Picks.</p>
              <p>If you have any questions, please contact support.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
NFL Picks Reminder - Week ${week}

Hi ${userName}!

This is a friendly reminder that you have ${timeText} left to submit your picks for Week ${week}!

Picks Lock At: ${lockTime.toLocaleString()}

Don't miss out on this week's action! Make sure to:
- Pick winners against the spread for each game
- Choose your Lock of the Week for double points  
- Select a touchdown scorer
- Submit your prop bet (optional)

Submit your picks at: ${process.env.CLIENT_URL || 'http://localhost:5173'}/picks

Remember: Each player can only be selected as a touchdown scorer once per season, so choose wisely!

This is an automated reminder from NFL Picks.
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
