import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");


interface ContactFormRequest {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

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

// HTML escaping to prevent injection attacks
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  console.log("Contact form submission received");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name: rawName, email: rawEmail, phone: rawPhone, subject: rawSubject, message: rawMessage }: ContactFormRequest = await req.json();
    
    // Sanitize all user inputs
    const name = escapeHtml(rawName || '');
    const email = escapeHtml(rawEmail || '');
    const phone = escapeHtml(rawPhone || '');
    const subject = escapeHtml(rawSubject || '');
    const message = escapeHtml(rawMessage || '');
    
    console.log("Processing contact form:", { name, email, subject });

    // Validate required fields
    if (!rawName || !rawEmail || !rawPhone || !rawSubject || !rawMessage) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin email from settings
    const adminEmail = await getAppSetting("admin_email");
    
    if (!adminEmail) {
      console.error("Admin email not configured in app settings");
      return new Response(
        JSON.stringify({ error: "Admin email not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send notification to admin
    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Mosque Contact <onboarding@resend.dev>",
        to: [adminEmail],
        subject: `New Contact Form Submission: ${subject}`,
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
                <h1 style="margin: 0; font-size: 24px;">New Contact Form Submission</h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #0369a1; font-size: 14px;">
                    <strong>New message received from the website contact form</strong>
                  </p>
                </div>

                <!-- Contact Details -->
                <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Sender Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666; width: 30%;">Name</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #333;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Email</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #333;"><a href="mailto:${email}" style="color: #1a5f4a;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">Phone</td>
                      <td style="padding: 8px 0; font-weight: 600; color: #333;"><a href="tel:${phone}" style="color: #1a5f4a;">${phone}</a></td>
                    </tr>
                  </table>
                </div>

                <!-- Message -->
                <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                  <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Subject: ${subject}</h3>
                  <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #1a5f4a; text-align: center;">
                <p style="margin: 0; color: #666; font-size: 12px;">This message was sent from the mosque website contact form.</p>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">Received at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!adminEmailResponse.ok) {
      const errorData = await adminEmailResponse.text();
      console.error("Failed to send admin notification:", errorData);
      throw new Error(`Failed to send admin notification: ${errorData}`);
    }

    console.log("Admin notification sent successfully");

    // Send confirmation to the sender
    const senderEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ilaiyankudi Pallivasal <onboarding@resend.dev>",
        to: [email],
        subject: "Thank you for contacting us | இளையான்குடி பள்ளிவாசல்",
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
                <p style="margin: 15px 0 0 0; font-size: 14px; opacity: 0.9;">Message Received</p>
              </div>

              <!-- Success Badge -->
              <div style="text-align: center; padding: 20px;">
                <div style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; border-radius: 50px; font-weight: bold;">
                  ✓ Message Received
                </div>
              </div>

              <!-- Content -->
              <div style="padding: 0 30px 20px;">
                <p style="color: #333; font-size: 16px;">Dear ${name},</p>
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  Thank you for contacting Ilaiyankudi Pallivasal. We have received your message and will respond to you as soon as possible.
                </p>
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  நீங்கள் எங்களை தொடர்பு கொண்டதற்கு நன்றி. உங்கள் செய்தியைப் பெற்றுள்ளோம், விரைவில் உங்களுக்கு பதிலளிப்போம்.
                </p>
              </div>

              <!-- Message Summary -->
              <div style="margin: 0 30px 20px; background-color: #f9f9f9; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #1a5f4a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px;">Your Message</h3>
                <p style="margin: 0 0 10px 0; color: #666; font-size: 13px;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin: 0; color: #333; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${message}</p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 30px; padding: 20px 30px; background-color: #f5f5f5; border-top: 2px dashed #1a5f4a; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #333; font-weight: 600;">JazakAllah Khair!</p>
                <p style="margin: 0; color: #666; font-size: 12px;">May Allah bless you and your family.</p>
                <p style="margin: 15px 0 0 0; color: #999; font-size: 11px;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!senderEmailResponse.ok) {
      const errorData = await senderEmailResponse.text();
      console.error("Failed to send confirmation email:", errorData);
      // Don't throw here - admin was already notified
    } else {
      console.log("Confirmation email sent to sender");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-contact-form function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send message" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
