import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderFrequency {
  type: "one_day_before" | "same_day" | "three_times_daily" | "none";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current date and time in Peru timezone
    const now = new Date();
    const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
    const currentDate = peruTime.toISOString().split('T')[0];
    const currentHour = peruTime.getHours();
    
    console.log(`Processing reminders for ${currentDate} at ${currentHour}:00`);

    // Get ti_tasks with reminder_date configured
    const { data: tasks, error: tasksError } = await supabase
      .from('ti_tasks')
      .select(`
        id,
        code,
        subject,
        reminder_date,
        reminder_frequency,
        status,
        priority,
        created_by,
        assignee
      `)
      .not('reminder_date', 'is', null)
      .in('status', ['open', 'in_progress', 'resolved']);

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No tasks with reminders configured");
      return new Response(
        JSON.stringify({ message: "No tasks with reminders" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${tasks.length} tasks with reminders configured`);

    const remindersToSend = [];

    for (const task of tasks) {
      const frequency: ReminderFrequency = task.reminder_frequency as ReminderFrequency || { type: "none" };
      const reminderDate = new Date(task.reminder_date);
      const reminderDateStr = reminderDate.toISOString().split('T')[0];
      
      let shouldSendReminder = false;
      let reminderType = "";

      // Check if we should send a reminder based on frequency
      if (frequency.type === "one_day_before") {
        // Send reminder one day before at 9:00 AM
        const oneDayBefore = new Date(reminderDate);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);
        const oneDayBeforeStr = oneDayBefore.toISOString().split('T')[0];
        
        if (currentDate === oneDayBeforeStr && currentHour === 9) {
          shouldSendReminder = true;
          reminderType = "one_day_before_9am";
        }
      } else if (frequency.type === "same_day") {
        // Send reminder on the same day at 9:00 AM
        if (currentDate === reminderDateStr && currentHour === 9) {
          shouldSendReminder = true;
          reminderType = "same_day_9am";
        }
      } else if (frequency.type === "three_times_daily") {
        // Send reminders 3 times a day: 9am, 1pm (13h), 4pm (16h)
        if (currentDate === reminderDateStr) {
          if (currentHour === 9) {
            shouldSendReminder = true;
            reminderType = "three_times_9am";
          } else if (currentHour === 13) {
            shouldSendReminder = true;
            reminderType = "three_times_1pm";
          } else if (currentHour === 16) {
            shouldSendReminder = true;
            reminderType = "three_times_4pm";
          }
        }
      }

      if (shouldSendReminder) {
        // Check if we already sent this reminder
        const { data: alreadySent } = await supabase
          .from('ti_task_reminders_sent')
          .select('id')
          .eq('ti_task_id', task.id)
          .eq('reminder_type', reminderType)
          .gte('sent_at', currentDate)
          .single();

        if (!alreadySent) {
          remindersToSend.push({ task, reminderType });
        } else {
          console.log(`Reminder already sent for task ${task.code} (${reminderType})`);
        }
      }
    }

    console.log(`Sending ${remindersToSend.length} reminders`);

    // Send emails
    const results = [];
    for (const { task, reminderType } of remindersToSend) {
      try {
        const emailResponse = await resend.emails.send({
          from: "TI Tasks <onboarding@resend.dev>",
          to: ["supervisorti@livigui.com"],
          subject: `Recordatorio: ${task.code} - ${task.subject}`,
          html: `
            <h2>Recordatorio de Tarea TI</h2>
            <p><strong>Código:</strong> ${task.code}</p>
            <p><strong>Asunto:</strong> ${task.subject}</p>
            <p><strong>Estado:</strong> ${task.status}</p>
            <p><strong>Prioridad:</strong> ${task.priority}</p>
            <p><strong>Asignado a:</strong> ${task.assignee || 'No asignado'}</p>
            <p><strong>Fecha de Recordatorio:</strong> ${new Date(task.reminder_date).toLocaleDateString('es-PE')}</p>
            <br>
            <p>Este es un recordatorio automático configurado para esta tarea.</p>
          `,
        });

        console.log(`Email sent for task ${task.code}:`, emailResponse);

        // Record that we sent this reminder
        await supabase
          .from('ti_task_reminders_sent')
          .insert({
            ti_task_id: task.id,
            reminder_type: reminderType,
          });

        results.push({
          taskCode: task.code,
          status: "sent",
          emailId: emailResponse.data?.id,
        });
      } catch (error) {
        console.error(`Error sending email for task ${task.code}:`, error);
        results.push({
          taskCode: task.code,
          status: "error",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${tasks.length} tasks, sent ${results.length} reminders`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-ti-task-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
