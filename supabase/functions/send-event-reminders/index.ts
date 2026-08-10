import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");


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

const getBookingReminderEmail = (name: string, data: { eventType: string; eventDate: string; startTime: string; endTime: string }) => ({
  subject: "Reminder: Your Mahal Booking is Tomorrow!",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a5f4a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">📅 Booking Reminder</h1>
      </div>
      <div style="padding: 20px; background-color: #fff; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear ${name},</p>
        <p>This is a friendly reminder that your mahal booking is scheduled for <strong>tomorrow</strong>!</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a5f4a;">Booking Details:</h3>
          <p><strong>Event Type:</strong> ${data.eventType}</p>
          <p><strong>Date:</strong> ${data.eventDate}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
        </div>
        <p>Please ensure you arrive on time and have made all necessary arrangements.</p>
        <p>If you have any questions, please contact our office.</p>
        <p>Best regards,<br>Masjid Management Team</p>
      </div>
    </div>
  `,
});

const getEventReminderEmail = (name: string, data: { title: string; eventDate: string; startTime: string; venue: string }) => ({
  subject: `Reminder: ${data.title} is Tomorrow!`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a5f4a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">📅 Event Reminder</h1>
      </div>
      <div style="padding: 20px; background-color: #fff; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Dear ${name},</p>
        <p>This is a friendly reminder that an event you registered for is happening <strong>tomorrow</strong>!</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a5f4a;">Event Details:</h3>
          <p><strong>Event:</strong> ${data.title}</p>
          <p><strong>Date:</strong> ${data.eventDate}</p>
          <p><strong>Time:</strong> ${data.startTime || 'To be announced'}</p>
          <p><strong>Venue:</strong> ${data.venue || 'Masjid Hall'}</p>
        </div>
        <p>We look forward to seeing you there!</p>
        <p>Best regards,<br>Masjid Management Team</p>
      </div>
    </div>
  `,
});

const getBookingReminderSms = (name: string, data: { eventType: string; eventDate: string; startTime: string; endTime: string }) => {
  return `Dear ${name}, reminder: Your mahal booking for ${data.eventType} is tomorrow (${data.eventDate}) at ${data.startTime}-${data.endTime}. Please arrive on time. - Masjid Management`;
};

const getEventReminderSms = (name: string, data: { title: string; eventDate: string; startTime: string; venue: string }) => {
  return `Dear ${name}, reminder: ${data.title} is tomorrow (${data.eventDate}) at ${data.startTime || 'TBA'}. Venue: ${data.venue || 'Masjid Hall'}. See you there! - Masjid Management`;
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Calculate tomorrow's date in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const tomorrow = new Date(istNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`Checking for bookings and events on: ${tomorrowStr}`);

    const results = {
      bookingsProcessed: 0,
      eventsProcessed: 0,
      emailsSent: 0,
      smsSent: 0,
      errors: [] as string[],
    };

    // Fetch approved bookings for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from("mahal_bookings")
      .select("*")
      .eq("event_date", tomorrowStr)
      .eq("status", "approved");

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      results.errors.push(`Bookings fetch error: ${bookingsError.message}`);
    } else if (bookings && bookings.length > 0) {
      console.log(`Found ${bookings.length} approved bookings for tomorrow`);
      
      for (const booking of bookings) {
        results.bookingsProcessed++;
        
        // Get user notification preferences
        let emailEnabled = true;
        let smsEnabled = true;
        
        if (booking.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("notification_email, notification_sms")
            .eq("id", booking.user_id)
            .single();
          
          if (profile) {
            emailEnabled = profile.notification_email !== false;
            smsEnabled = profile.notification_sms !== false;
          }
        }

        const reminderData = {
          eventType: booking.event_type,
          eventDate: booking.event_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
        };

        // Send email if enabled
        if (booking.applicant_email && emailEnabled) {
          const emailContent = getBookingReminderEmail(booking.applicant_name, reminderData);
          const emailResult = await sendEmail(booking.applicant_email, emailContent.subject, emailContent.html);
          if (emailResult.success) {
            results.emailsSent++;
            console.log(`Sent booking email reminder to ${booking.applicant_email}`);
          } else {
            results.errors.push(`Failed to send email to ${booking.applicant_email}: ${JSON.stringify(emailResult.error)}`);
          }
        } else if (booking.applicant_email && !emailEnabled) {
          console.log(`Email notifications disabled for booking user ${booking.user_id}`);
        }

        // Send SMS if enabled
        if (booking.applicant_phone && smsEnabled) {
          const smsMessage = getBookingReminderSms(booking.applicant_name, reminderData);
          const smsResult = await sendSms(booking.applicant_phone, smsMessage);
          if (smsResult.success) {
            results.smsSent++;
            console.log(`Sent booking SMS reminder to ${booking.applicant_phone}`);
          } else {
            results.errors.push(`Failed to send SMS to ${booking.applicant_phone}: ${JSON.stringify(smsResult.error)}`);
          }
        } else if (booking.applicant_phone && !smsEnabled) {
          console.log(`SMS notifications disabled for booking user ${booking.user_id}`);
        }
      }
    } else {
      console.log("No approved bookings found for tomorrow");
    }

    // Fetch events happening tomorrow
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("*")
      .eq("event_date", tomorrowStr)
      .in("status", ["upcoming", "ongoing"]);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      results.errors.push(`Events fetch error: ${eventsError.message}`);
    } else if (events && events.length > 0) {
      console.log(`Found ${events.length} events for tomorrow`);

      for (const event of events) {
        // Fetch registrations for this event
        const { data: registrations, error: regError } = await supabase
          .from("event_registrations")
          .select("*")
          .eq("event_id", event.id);

        if (regError) {
          console.error(`Error fetching registrations for event ${event.id}:`, regError);
          results.errors.push(`Registration fetch error for event ${event.id}: ${regError.message}`);
          continue;
        }

        if (registrations && registrations.length > 0) {
          console.log(`Found ${registrations.length} registrations for event: ${event.title}`);

          for (const registration of registrations) {
            results.eventsProcessed++;

            // Get user notification preferences
            let emailEnabled = true;
            let smsEnabled = true;
            
            if (registration.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("notification_email, notification_sms")
                .eq("id", registration.user_id)
                .single();
              
              if (profile) {
                emailEnabled = profile.notification_email !== false;
                smsEnabled = profile.notification_sms !== false;
              }
            }

            const reminderData = {
              title: event.title,
              eventDate: event.event_date,
              startTime: event.start_time,
              venue: event.venue,
            };

            // Send email if enabled
            if (registration.participant_email && emailEnabled) {
              const emailContent = getEventReminderEmail(registration.participant_name, reminderData);
              const emailResult = await sendEmail(registration.participant_email, emailContent.subject, emailContent.html);
              if (emailResult.success) {
                results.emailsSent++;
                console.log(`Sent event email reminder to ${registration.participant_email}`);
              } else {
                results.errors.push(`Failed to send email to ${registration.participant_email}: ${JSON.stringify(emailResult.error)}`);
              }
            } else if (registration.participant_email && !emailEnabled) {
              console.log(`Email notifications disabled for registration user ${registration.user_id}`);
            }

            // Send SMS if enabled
            if (registration.participant_phone && smsEnabled) {
              const smsMessage = getEventReminderSms(registration.participant_name, reminderData);
              const smsResult = await sendSms(registration.participant_phone, smsMessage);
              if (smsResult.success) {
                results.smsSent++;
                console.log(`Sent event SMS reminder to ${registration.participant_phone}`);
              } else {
                results.errors.push(`Failed to send SMS to ${registration.participant_phone}: ${JSON.stringify(smsResult.error)}`);
              }
            } else if (registration.participant_phone && !smsEnabled) {
              console.log(`SMS notifications disabled for registration user ${registration.user_id}`);
            }
          }
        }
      }
    } else {
      console.log("No events found for tomorrow");
    }

    console.log("Reminder processing complete:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-event-reminders function:", error);
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
