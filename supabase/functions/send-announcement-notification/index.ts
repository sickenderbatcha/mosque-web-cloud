import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnnouncementNotificationRequest {
  announcement_id: string;
  title: string;
  title_tamil?: string;
  content: string;
  content_tamil?: string;
  type: string;
  send_email: boolean;
  send_sms: boolean;
}
// HTML escaping to prevent injection attacks
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-announcement-notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      announcement_id,
      title,
      title_tamil,
      content,
      content_tamil,
      type,
      send_email,
      send_sms,
    }: AnnouncementNotificationRequest = await req.json();

    console.log("Processing announcement notification:", { announcement_id, title, type, send_email, send_sms });

    // Get all users who have enabled notifications
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, notification_email, notification_sms")
      .or("notification_email.eq.true,notification_sms.eq.true");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles with notifications enabled`);

    // Get user emails from auth.users
    const emailResults: { success: number; failed: number } = { success: 0, failed: 0 };
    const smsResults: { success: number; failed: number } = { success: 0, failed: 0 };

    // Type badge color
    const typeColors: Record<string, string> = {
      info: "#3b82f6",
      warning: "#eab308",
      urgent: "#ef4444",
      celebration: "#22c55e",
    };
    const typeLabels: Record<string, string> = {
      info: "Information",
      warning: "Warning",
      urgent: "Urgent",
      celebration: "Celebration",
    };

    // Send email notifications
    if (send_email && profiles && profiles.length > 0) {
      const emailProfiles = profiles.filter((p) => p.notification_email);
      
      for (const profile of emailProfiles) {
        try {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
          const userEmail = userData?.user?.email;

          if (userEmail) {
            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <div style="background-color: #1a5f2a; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">இளையாங்குடி தொழுகை மேடை பள்ளிவாசல்</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Ilayangudi Nesavu Pattadai Tholukai Medai Pallivasal</p>
                  </div>
                  
                  <div style="padding: 24px;">
                    <div style="display: inline-block; background-color: ${typeColors[type] || typeColors.info}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 16px;">
                      ${typeLabels[type] || "Announcement"}
                    </div>
                    
                    <h2 style="color: #333; margin: 0 0 8px; font-size: 24px;">${escapeHtml(title_tamil || title)}</h2>
                    ${title_tamil ? `<p style="color: #666; margin: 0 0 16px; font-size: 14px;">${escapeHtml(title)}</p>` : ""}
                    
                    <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; border-left: 4px solid ${typeColors[type] || typeColors.info};">
                      <p style="color: #333; margin: 0; line-height: 1.6;">${escapeHtml(content_tamil || content)}</p>
                      ${content_tamil ? `<p style="color: #666; margin: 12px 0 0; font-size: 14px;">${escapeHtml(content)}</p>` : ""}
                    </div>
                  </div>
                  
                  <div style="background-color: #f8f9fa; padding: 16px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #888; margin: 0; font-size: 12px;">
                      You received this because you enabled email notifications.<br>
                      Visit our website to manage your preferences.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `;

            await resend.emails.send({
              from: "Mosque Notifications <onboarding@resend.dev>",
              to: [userEmail],
              subject: `${type === "urgent" ? "🚨 " : ""}${title}`,
              html: emailHtml,
            });

            console.log(`Email sent successfully to ${userEmail}`);
            emailResults.success++;
          }
        } catch (emailError) {
          console.error(`Failed to send email to profile ${profile.id}:`, emailError);
          emailResults.failed++;
        }
      }
    }

    // Send SMS notifications
    if (send_sms && profiles && profiles.length > 0) {
      const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        const smsProfiles = profiles.filter((p) => p.notification_sms && p.phone);

        for (const profile of smsProfiles) {
          try {
            const smsBody = `${typeLabels[type] || "Announcement"}: ${title}\n\n${content.substring(0, 140)}${content.length > 140 ? "..." : ""}\n\n- Ilaiyankudi Mosque`;

            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

            const formData = new URLSearchParams();
            formData.append("To", profile.phone!);
            formData.append("From", twilioPhoneNumber);
            formData.append("Body", smsBody);

            const smsResponse = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${authHeader}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            });

            if (smsResponse.ok) {
              console.log(`SMS sent successfully to ${profile.phone}`);
              smsResults.success++;
            } else {
              const errorText = await smsResponse.text();
              console.error(`SMS failed for ${profile.phone}:`, errorText);
              smsResults.failed++;
            }
          } catch (smsError) {
            console.error(`Failed to send SMS to ${profile.phone}:`, smsError);
            smsResults.failed++;
          }
        }
      } else {
        console.log("Twilio credentials not configured, skipping SMS");
      }
    }

    const result = {
      success: true,
      email: send_email ? emailResults : null,
      sms: send_sms ? smsResults : null,
    };

    console.log("Notification results:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-announcement-notification:", error);
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