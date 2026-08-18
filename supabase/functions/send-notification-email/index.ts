import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");


// Helper function to get app setting from database
const getAppSetting = async (key: string): Promise<string | null> => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase credentials not configured");
    return null;
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  
  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
  
  return data?.value || null;
};

// HTML escaping to prevent injection attacks in email templates
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface NotificationRequest {
  type: "booking_confirmation" | "booking_status_update" | "grievance_confirmation" | "grievance_status_update" | "payment_success" | "booking_cancelled" | "refund_status_update" | "admin_refund_request" | "noc_status_update";
  email?: string;
  phone?: string;
  recipientName: string;
  data: Record<string, any>;
  preferences?: {
    email: boolean;
    sms: boolean;
  };
}

const getEmailContent = (type: string, rawRecipientName: string, data: Record<string, any>) => {
  // Escape all user-provided content before inserting into HTML
  const recipientName = escapeHtml(rawRecipientName);
  // Escape string values in-place so all template references are safe
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      data[key] = escapeHtml(value);
    }
  }
  switch (type) {
    case "booking_confirmation":
      return {
        subject: "Booking Request Received - Mahal Booking",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a5f4a;">Booking Request Received</h1>
            <p>Dear ${recipientName},</p>
            <p>Thank you for submitting your booking request. We have received your application and it is currently under review.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Booking Details:</h3>
              <p><strong>Event Type:</strong> ${data.eventType}</p>
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
              <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
              <p><strong>Expected Guests:</strong> ${data.expectedGuests || 'Not specified'}</p>
              <p><strong>Amount:</strong> ₹${data.amount}</p>
            </div>
            <p>Our team will review your request and get back to you shortly.</p>
            <p>Best regards,<br>Masjid Management Team</p>
          </div>
        `,
      };

    case "booking_status_update":
      const statusColor = data.status === "approved" ? "#22c55e" : data.status === "rejected" ? "#ef4444" : "#f59e0b";
      const statusMessage = data.status === "approved" 
        ? "We are pleased to inform you that your booking has been approved!"
        : data.status === "rejected"
        ? "We regret to inform you that your booking request has been declined."
        : "Your booking status has been updated.";
      
      return {
        subject: `Booking ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} - Mahal Booking`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a5f4a;">Booking Status Update</h1>
            <p>Dear ${recipientName},</p>
            <p>${statusMessage}</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${data.status.toUpperCase()}</span></p>
              <p><strong>Event Type:</strong> ${data.eventType}</p>
              <p><strong>Event Date:</strong> ${data.eventDate}</p>
            </div>
            ${data.status === "approved" ? "<p>Please contact our office to complete the payment and finalize your booking.</p>" : ""}
            <p>Best regards,<br>Masjid Management Team</p>
          </div>
        `,
      };

    case "grievance_confirmation":
      return {
        subject: `Grievance Received - Ticket #${data.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a5f4a;">Grievance Received</h1>
            <p>Dear ${recipientName},</p>
            <p>We have received your grievance and it has been logged in our system for review.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Grievance Details:</h3>
              <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Category:</strong> ${data.category}</p>
            </div>
            <p>Our team will review your grievance and respond as soon as possible.</p>
            <p>Best regards,<br>Masjid Management Team</p>
          </div>
        `,
      };

    case "grievance_status_update":
      const grievanceStatusColor = data.status === "resolved" ? "#22c55e" : data.status === "in_progress" ? "#3b82f6" : "#f59e0b";
      
      return {
        subject: `Grievance Update - Ticket #${data.ticketNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a5f4a;">Grievance Status Update</h1>
            <p>Dear ${recipientName},</p>
            <p>There has been an update on your grievance.</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Status:</strong> <span style="color: ${grievanceStatusColor}; font-weight: bold;">${data.status.replace('_', ' ').toUpperCase()}</span></p>
              ${data.adminResponse ? `<p><strong>Admin Response:</strong></p><p style="background-color: white; padding: 10px; border-radius: 4px;">${data.adminResponse}</p>` : ''}
            </div>
            <p>Best regards,<br>Masjid Management Team</p>
          </div>
        `,
      };

    case "payment_success":
      const servicesHtml = data.services?.length > 0 
        ? data.services.map((s: { name: string; rate: number }) => 
            `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${s.name}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${s.rate?.toLocaleString()}</td></tr>`
          ).join('')
        : '';
      
      return {
        subject: "Payment Successful - Booking Receipt | இளையான்குடி பள்ளிவாசல்",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background-color: #1a5f4a; color: white; padding: 30px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; font-size: 20px;">இளையான்குடி பள்ளிவாசல்</h2>
                <h1 style="margin: 0; font-size: 24px;">Ilaiyankudi Pallivasal</h1>
                <p style="margin: 15px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Mahal Booking Receipt</p>
              </div>

              <!-- Success Badge -->
              <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold;">
                  ✓ Payment Successful
                </div>
              </div>

              <!-- Greeting -->
              <div style="padding: 0 30px;">
                <p style="color: #333; font-size: 16px;">Dear ${recipientName},</p>
                <p style="color: #666; font-size: 14px;">Your payment has been successfully processed and your booking is now confirmed!</p>
              </div>

              <!-- Booking Details -->
              <div style="margin: 20px 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Name</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${recipientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Type</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Date</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Time</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.startTime} - ${data.endTime}</td>
                  </tr>
                  ${data.expectedGuests ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Expected Guests</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.expectedGuests}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Services -->
              ${data.services?.length > 0 ? `
              <div style="margin: 20px 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Services</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${servicesHtml}
                  <tr style="background-color: #1a5f4a; color: white;">
                    <td style="padding: 12px 8px; font-weight: bold;">Total Amount</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">₹${data.amount?.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
              ` : `
              <div style="margin: 20px 30px; background-color: #1a5f4a; color: white; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0; font-size: 14px;">Total Amount Paid</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold;">₹${data.amount?.toLocaleString()}</p>
              </div>
              `}

              <!-- Transaction ID -->
              <div style="margin: 20px 30px; background-color: #f0f0f0; border-radius: 8px; padding: 15px; text-align: center;">
                <p style="margin: 0 0 5px 0; color: #666; font-size: 12px; text-transform: uppercase;">Transaction ID</p>
                <p style="margin: 0; font-family: monospace; font-weight: bold; color: #333;">${data.transactionId || 'N/A'}</p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 30px; padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #1a5f4a; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: 600;">Thank you for your booking!</p>
                <p style="margin: 0; color: #666; font-size: 12px;">For any queries, please contact the mosque administration.</p>
                <p style="margin: 15px 0 0 0; color: #999; font-size: 11px;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "booking_cancelled":
      return {
        subject: "Booking Cancelled | இளையான்குடி பள்ளிவாசல்",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background-color: #1a5f4a; color: white; padding: 30px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; font-size: 20px;">இளையான்குடி பள்ளிவாசல்</h2>
                <h1 style="margin: 0; font-size: 24px;">Ilaiyankudi Pallivasal</h1>
              </div>

              <!-- Cancelled Badge -->
              <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold;">
                  ✕ Booking Cancelled
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 0 30px;">
                <p style="color: #333; font-size: 16px;">Dear ${recipientName},</p>
                <p style="color: #666; font-size: 14px;">Your booking has been cancelled as per your request.</p>
              </div>

              <!-- Booking Details -->
              <div style="margin: 20px 30px; background-color: #fef2f2; border-radius: 8px; padding: 20px; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Cancelled Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Type</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Date</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Time</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.startTime} - ${data.endTime}</td>
                  </tr>
                  ${data.amount ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Booking Amount</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">₹${data.amount?.toLocaleString()}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Info Note -->
              <div style="margin: 20px 30px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;">
                <p style="margin: 0; color: #0369a1; font-size: 13px;">
                  <strong>Note:</strong> If you paid for this booking and need a refund, please contact the mosque administration.
                </p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 30px; padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #1a5f4a; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: 600;">Need to book again?</p>
                <p style="margin: 0; color: #666; font-size: 12px;">You can make a new booking anytime through our website.</p>
                <p style="margin: 15px 0 0 0; color: #999; font-size: 11px;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "admin_refund_request":
      return {
        subject: `New Refund Request - ₹${data.amount?.toLocaleString()} | Admin Alert`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background-color: #f59e0b; color: white; padding: 30px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; font-size: 20px;">🔔 Admin Alert</h2>
                <h1 style="margin: 0; font-size: 24px;">New Refund Request</h1>
              </div>

              <!-- Alert Badge -->
              <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold;">
                  ⏳ Pending Review
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 0 30px;">
                <p style="color: #333; font-size: 16px;">A new refund request has been submitted and requires your attention.</p>
              </div>

              <!-- Applicant Details -->
              <div style="margin: 20px 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Applicant Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Name</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.applicantName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Phone</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.applicantPhone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Email</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.applicantEmail || 'N/A'}</td>
                  </tr>
                </table>
              </div>

              <!-- Booking Details -->
              <div style="margin: 20px 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Type</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Date</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Refund Amount</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #f59e0b; font-size: 18px;">₹${data.amount?.toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              ${data.reason ? `
              <!-- Reason -->
              <div style="margin: 20px 30px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 5px 0; color: #92400e; font-weight: bold; font-size: 12px; text-transform: uppercase;">Reason for Refund:</p>
                <p style="margin: 0; color: #78350f; font-size: 14px;">${data.reason}</p>
              </div>
              ` : ''}

              <!-- Bank Details -->
              <div style="margin: 20px 30px; background-color: #f0f9ff; border-radius: 8px; padding: 20px; border-left: 4px solid #0284c7;">
                <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Refund Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${data.upiId ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">UPI ID</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.upiId}</td>
                  </tr>
                  ` : ''}
                  ${data.bankAccountName ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Account Name</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.bankAccountName}</td>
                  </tr>
                  ` : ''}
                  ${data.bankAccountNumber ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Account Number</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.bankAccountNumber}</td>
                  </tr>
                  ` : ''}
                  ${data.bankIfsc ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">IFSC Code</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.bankIfsc}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Action Button -->
              <div style="text-align: center; padding: 20px 30px;">
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Please review and process this refund request promptly.</p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 30px; padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #f59e0b; text-align: center;">
                <p style="margin: 0; color: #999; font-size: 11px;">This is an automated admin notification.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "refund_status_update":
      const refundStatusColor = data.status === "approved" ? "#22c55e" : "#ef4444";
      const refundStatusMessage = data.status === "approved"
        ? "Your refund request has been approved and is being processed."
        : "We regret to inform you that your refund request has been declined.";

      return {
        subject: `Refund Request ${data.status.charAt(0).toUpperCase() + data.status.slice(1)} | இளையான்குடி பள்ளிவாசல்`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background-color: #1a5f4a; color: white; padding: 30px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; font-size: 20px;">இளையான்குடி பள்ளிவாசல்</h2>
                <h1 style="margin: 0; font-size: 24px;">Ilaiyankudi Pallivasal</h1>
              </div>

              <!-- Status Badge -->
              <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; background-color: ${refundStatusColor}; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold;">
                  ${data.status === "approved" ? "✓ Refund Approved" : "✕ Refund Rejected"}
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 0 30px;">
                <p style="color: #333; font-size: 16px;">Dear ${recipientName},</p>
                <p style="color: #666; font-size: 14px;">${refundStatusMessage}</p>
              </div>

              <!-- Refund Details -->
              <div style="margin: 20px 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Refund Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Event Type</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.eventType || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Refund Amount</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${refundStatusColor}; font-size: 18px;">₹${data.amount?.toLocaleString()}</td>
                  </tr>
                </table>
              </div>

              ${data.status === "approved" ? `
              <!-- Approved Message -->
              <div style="margin: 20px 30px; padding: 15px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-size: 13px;">
                  <strong>Next Steps:</strong> The refund will be processed to your provided bank account/UPI within 5-7 business days.
                </p>
              </div>
              ` : `
              <!-- Rejected Message -->
              <div style="margin: 20px 30px; padding: 15px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #991b1b; font-size: 13px;">
                  <strong>Reason:</strong> ${data.adminNotes || 'Please contact the administration for more details.'}
                </p>
              </div>
              `}

              <!-- Footer -->
              <div style="margin-top: 30px; padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #1a5f4a; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: 600;">Questions about your refund?</p>
                <p style="margin: 0; color: #666; font-size: 12px;">Please contact the mosque administration for assistance.</p>
                <p style="margin: 15px 0 0 0; color: #999; font-size: 11px;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    case "noc_status_update":
      const nocStatusColor = data.status === "approved" ? "#22c55e" : "#ef4444";
      const nocStatusMessage = data.status === "approved"
        ? "Your NOC (No Objection Certificate) request has been approved!"
        : "We regret to inform you that your NOC request has been declined.";

      return {
        subject: `NOC ${data.status === "approved" ? "Approved" : "Rejected"} | இளையான்குடி பள்ளிவாசல்`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header -->
              <div style="background-color: #1a5f4a; color: white; padding: 30px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; font-size: 20px;">இளையான்குடி பள்ளிவாசல்</h2>
                <h1 style="margin: 0; font-size: 24px;">Ilaiyankudi Pallivasal</h1>
                <p style="margin: 15px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">NOC Certificate</p>
              </div>

              <!-- Status Badge -->
              <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; background-color: ${nocStatusColor}; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold;">
                  ${data.status === "approved" ? "✓ NOC Approved" : "✕ NOC Rejected"}
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 0 30px;">
                <p style="color: #333; font-size: 16px;">Dear ${recipientName},</p>
                <p style="color: #666; font-size: 14px;">${nocStatusMessage}</p>
              </div>

              <!-- NOC Details -->
              <div style="margin: 20px 30px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">NOC Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Applicant</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.applicantName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Father's Name</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.fatherName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Partner's Name</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.partnerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Submitting To</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${data.mosqueToSubmit}</td>
                  </tr>
                </table>
              </div>

              ${data.status === "approved" ? `
              <!-- Approved Message -->
              <div style="margin: 20px 30px; padding: 15px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
                <p style="margin: 0; color: #166534; font-size: 13px;">
                  <strong>Next Steps:</strong> You can now download and print your NOC certificate from your dashboard. Please collect it from the mosque office if needed.
                </p>
              </div>
              ` : `
              <!-- Rejected Message -->
              <div style="margin: 20px 30px; padding: 15px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; color: #991b1b; font-size: 13px;">
                  <strong>Reason:</strong> ${data.adminNotes || 'Please contact the administration for more details.'}
                </p>
              </div>
              `}

              <!-- Footer -->
              <div style="margin-top: 30px; padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #1a5f4a; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: 600;">Questions about your NOC?</p>
                <p style="margin: 0; color: #666; font-size: 12px;">Please contact the mosque administration for assistance.</p>
                <p style="margin: 15px 0 0 0; color: #999; font-size: 11px;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: "Notification from Masjid",
        html: `<p>Dear ${recipientName},</p><p>You have a new notification.</p>`,
      };
  }
};

const getSmsContent = (type: string, recipientName: string, data: Record<string, any>): string => {
  switch (type) {
    case "booking_confirmation":
      return `Dear ${recipientName}, your booking request for ${data.eventType} on ${data.eventDate} has been received. Amount: ₹${data.amount}. We will review and contact you soon. - Masjid Management`;

    case "booking_status_update":
      const statusText = data.status === "approved" 
        ? "APPROVED! Please contact our office to finalize."
        : data.status === "rejected"
        ? "has been declined."
        : `status: ${data.status.toUpperCase()}`;
      return `Dear ${recipientName}, your booking for ${data.eventType} on ${data.eventDate} has been ${statusText} - Masjid Management`;

    case "grievance_confirmation":
      return `Dear ${recipientName}, your grievance (Ticket #${data.ticketNumber}) has been received. Subject: ${data.subject}. We will respond soon. - Masjid Management`;

    case "grievance_status_update":
      return `Dear ${recipientName}, your grievance (Ticket #${data.ticketNumber}) status: ${data.status.replace('_', ' ').toUpperCase()}. ${data.adminResponse ? `Response: ${data.adminResponse.substring(0, 100)}` : ''} - Masjid Management`;

    case "payment_success":
      return `Dear ${recipientName}, payment of ₹${data.amount?.toLocaleString()} received successfully! Your booking for ${data.eventType} on ${data.eventDate} is now confirmed. Thank you! - Masjid Management`;

    case "booking_cancelled":
      return `Dear ${recipientName}, your booking for ${data.eventType} on ${data.eventDate} has been cancelled. If you need a refund, please contact the mosque administration. - Masjid Management`;

    case "admin_refund_request":
      return `ADMIN ALERT: New refund request of ₹${data.amount?.toLocaleString()} from ${data.applicantName} for ${data.eventType}. Please review and process promptly.`;

    case "refund_status_update":
      return data.status === "approved"
        ? `Dear ${recipientName}, your refund of ₹${data.amount?.toLocaleString()} has been APPROVED and will be processed within 5-7 business days. - Masjid Management`
        : `Dear ${recipientName}, your refund request for ₹${data.amount?.toLocaleString()} has been declined. ${data.adminNotes ? `Reason: ${data.adminNotes.substring(0, 80)}` : 'Contact administration for details.'} - Masjid Management`;

    case "noc_status_update":
      return data.status === "approved"
        ? `Dear ${recipientName}, your NOC request has been APPROVED! You can now download/print the certificate from your dashboard. - Masjid Management`
        : `Dear ${recipientName}, your NOC request has been declined. ${data.adminNotes ? `Reason: ${data.adminNotes.substring(0, 80)}` : 'Contact administration for details.'} - Masjid Management`;

    default:
      return `Dear ${recipientName}, you have a new notification from Masjid Management.`;
  }
};

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return { success: false, error: "Email service not configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Masjid Notifications <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  const response = await res.json();

  if (!res.ok) {
    console.error("Resend API error:", response);
    return { success: false, error: response };
  }

  return { success: true, data: response };
};

const sendSms = async (to: string, message: string) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Twilio credentials not configured");
    return { success: false, error: "SMS service not configured" };
  }

  // Format phone number for Twilio (add country code if needed)
  let formattedPhone = to.replace(/\s/g, "");
  if (!formattedPhone.startsWith("+")) {
    // Assume Indian number if no country code
    formattedPhone = formattedPhone.startsWith("91") ? `+${formattedPhone}` : `+91${formattedPhone}`;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: new URLSearchParams({
      To: formattedPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    }),
  });

  const response = await res.json();

  if (!res.ok) {
    console.error("Twilio API error:", response);
    return { success: false, error: response };
  }

  return { success: true, data: response };
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { error: authError } = await requireUser(req, corsHeaders);
    if (authError) return authError;

    let { type, email, phone, recipientName, data, preferences }: NotificationRequest = await req.json();

    // For admin notifications, fetch admin email from settings
    if (type === "admin_refund_request" && !email) {
      const adminEmail = await getAppSetting("admin_email");
      if (adminEmail) {
        email = adminEmail;
        console.log(`Fetched admin email from settings: ${adminEmail}`);
      } else {
        console.error("Admin email not configured in app_settings");
        return new Response(JSON.stringify({ error: "Admin email not configured" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Default to sending both if preferences not provided
    const emailEnabled = preferences?.email ?? true;
    const smsEnabled = preferences?.sms ?? true;

    console.log(`Processing ${type} notification - Email: ${email} (enabled: ${emailEnabled}), Phone: ${phone} (enabled: ${smsEnabled})`);

    const results: { email?: any; sms?: any } = {};

    // Send email if available and enabled
    if (email && emailEnabled) {
      const { subject, html } = getEmailContent(type, recipientName, data);
      console.log(`Sending email to ${email}`);
      const emailResult = await sendEmail(email, subject, html);
      results.email = emailResult;
      console.log("Email result:", emailResult);
    } else if (email && !emailEnabled) {
      console.log(`Email notifications disabled for user, skipping email to ${email}`);
      results.email = { skipped: true, reason: "User disabled email notifications" };
    }

    // Send SMS if phone is available and enabled
    if (phone && smsEnabled && (!email || !emailEnabled || type.includes("status_update") || type === "payment_success")) {
      const smsMessage = getSmsContent(type, recipientName, data);
      console.log(`Sending SMS to ${phone}`);
      const smsResult = await sendSms(phone, smsMessage);
      results.sms = smsResult;
      console.log("SMS result:", smsResult);
    } else if (phone && !smsEnabled) {
      console.log(`SMS notifications disabled for user, skipping SMS to ${phone}`);
      results.sms = { skipped: true, reason: "User disabled SMS notifications" };
    }

    if (!email && !phone) {
      console.log("No contact information provided");
      return new Response(JSON.stringify({ message: "No contact information provided" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
