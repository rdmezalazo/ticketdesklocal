import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'ti_task_created' | 'activity_added' | 'activity_completed' | 'ti_task_resolved';
  tiTaskId: string;
  taskCode?: string;
  subject?: string;
  assignee?: string;
  priority?: string;
  category?: string;
  activityDescription?: string;
  progress?: number;
}

// Function to check if notification type is enabled
async function checkNotificationEnabled(supabase: any, notificationType: string): Promise<boolean> {
  const settingKeyMap: Record<string, string> = {
    'ti_task_created': 'email_notifications_ti_task_created',
    'activity_added': 'email_notifications_ti_task_activity_added',
    'activity_completed': 'email_notifications_ti_task_activity_completed',
    'ti_task_resolved': 'email_notifications_ti_task_resolved'
  };

  const settingKey = settingKeyMap[notificationType];
  if (!settingKey) {
    console.log(`Unknown notification type: ${notificationType}, defaulting to disabled`);
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', settingKey)
      .single();

    if (error) {
      console.error(`Error fetching setting ${settingKey}:`, error);
      return true; // Default to enabled if we can't fetch
    }

    const isEnabled = data?.value === true;
    console.log(`Setting ${settingKey}: ${isEnabled}`);
    return isEnabled;
  } catch (error) {
    console.error(`Error checking notification setting:`, error);
    return true; // Default to enabled if there's any error
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notificationData: NotificationRequest = await req.json();
    const { 
      type,
      tiTaskId, 
      taskCode, 
      subject, 
      assignee, 
      priority, 
      category,
      activityDescription,
      progress
    } = notificationData;

    console.log(`Checking ${type} notification for TI task:`, tiTaskId);

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if this type of notification is enabled
    const notificationEnabled = await checkNotificationEnabled(supabase, type);
    if (!notificationEnabled) {
      console.log(`Notification type '${type}' is disabled, skipping email send`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Notification type '${type}' is disabled`,
          type
        }), 
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Sending ${type} notification for TI task:`, tiTaskId);

    // Get TI task details including description
    const { data: tiTask, error: taskError } = await supabase
      .from('ti_tasks')
      .select('description, area, sede, created_by')
      .eq('id', tiTaskId)
      .single();

    if (taskError) {
      console.error('Error fetching TI task details:', taskError);
    }

    // Get activities for the task
    const { data: activities, error: activitiesError } = await supabase
      .from('ti_task_activities')
      .select('activity_number, description, due_date, progress, completed, start_date')
      .eq('ti_task_id', tiTaskId)
      .order('activity_number', { ascending: true });

    if (activitiesError) {
      console.error('Error fetching TI task activities:', activitiesError);
    }

    // Get creator profile
    let creatorName = 'Usuario TI';
    let creatorEmail = '';
    if (tiTask?.created_by) {
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', tiTask.created_by)
        .single();
      
      if (creatorProfile) {
        creatorName = creatorProfile.full_name;
        creatorEmail = creatorProfile.email;
      }
    }

    // Get TI users to send notifications
    const { data: tiUsers, error: tiError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'ti')
      .eq('active', true);

    if (tiError) {
      console.error('Error fetching TI users:', tiError);
    }

    // Get additional notification recipients (only active)
    const { data: additionalRecipients, error: recipientsError } = await supabase
      .from('notification_recipients')
      .select('email, is_bcc')
      .eq('active', true);

    if (recipientsError) {
      console.error('Error fetching notification recipients:', recipientsError);
    }

    // Build email recipients lists (normal and BCC)
    const emailRecipients = ['supervisorti@livigui.com'];
    const bccRecipients: string[] = [];
    
    if (tiUsers && tiUsers.length > 0) {
      tiUsers.forEach(user => {
        if (user.email && !emailRecipients.includes(user.email)) {
          emailRecipients.push(user.email);
        }
      });
    }

    if (additionalRecipients && additionalRecipients.length > 0) {
      additionalRecipients.forEach(recipient => {
        if (recipient.email) {
          if (recipient.is_bcc) {
            // Add to BCC list if not already included
            if (!bccRecipients.includes(recipient.email)) {
              bccRecipients.push(recipient.email);
            }
          } else {
            // Add to normal recipients if not already included
            if (!emailRecipients.includes(recipient.email)) {
              emailRecipients.push(recipient.email);
            }
          }
        }
      });
    }

    // Add creator email if not already included in either list
    if (creatorEmail && !emailRecipients.includes(creatorEmail) && !bccRecipients.includes(creatorEmail)) {
      emailRecipients.push(creatorEmail);
    }

    console.log('Email recipients:', { to: emailRecipients, bcc: bccRecipients });

    // Generate email content based on notification type
    const emailContent = generateEmailContent(type, {
      tiTaskId,
      taskCode,
      subject,
      assignee,
      priority,
      category,
      activityDescription,
      progress,
      description: tiTask?.description,
      area: tiTask?.area,
      sede: tiTask?.sede,
      activities: activities || [],
      creatorName,
      creatorEmail
    });

    // Send email to all recipients (including BCC)
    const emailPayload: any = {
      from: "Tareas TI Livigui <support@livigui.com>",
      to: emailRecipients,
      subject: emailContent.subject,
      html: emailContent.html,
    };

    // Add BCC if there are any BCC recipients
    if (bccRecipients.length > 0) {
      emailPayload.bcc = bccRecipients;
    }

    const emailResponse = await resend.emails.send(emailPayload);

    console.log("TI Task notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type,
        emailId: emailResponse.data?.id 
      }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error(`Error in send TI task notification:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateActivitiesTable(activities: any[]): string {
  if (!activities || activities.length === 0) {
    return `
      <div style="padding: 20px; text-align: center; color: #64748b;">
        <p>No hay actividades registradas para esta tarea</p>
      </div>
    `;
  }

  const getProgressColor = (progress: number) => {
    if (progress === 0) return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    if (progress < 50) return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
    if (progress < 100) return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
    return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
  };

  const getStatusLabel = (completed: boolean, progress: number) => {
    if (completed || progress === 100) return { label: 'Completada', color: '#10b981' };
    if (progress > 0) return { label: 'En Progreso', color: '#3b82f6' };
    return { label: 'Pendiente', color: '#ef4444' };
  };

  const rows = activities.map((activity) => {
    const progressColor = getProgressColor(activity.progress || 0);
    const status = getStatusLabel(activity.completed, activity.progress || 0);
    const dueDate = activity.due_date ? new Date(activity.due_date).toLocaleDateString('es-PE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) : 'No definida';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #475569;">
          ${activity.activity_number}
        </td>
        <td style="padding: 12px 8px; color: #1e293b;">
          ${activity.description}
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #64748b; white-space: nowrap;">
          📅 ${dueDate}
        </td>
        <td style="padding: 12px 8px; text-align: center;">
          <div style="
            background: ${progressColor.bg}; 
            color: ${progressColor.text}; 
            padding: 6px 12px; 
            border-radius: 6px; 
            font-weight: 600;
            border: 2px solid ${progressColor.border};
            display: inline-block;
            min-width: 60px;
          ">
            ${activity.progress || 0}%
          </div>
        </td>
        <td style="padding: 12px 8px; text-align: center;">
          <span style="
            background: ${status.color}15;
            color: ${status.color};
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            display: inline-block;
            border: 2px solid ${status.color}40;
          ">
            ${status.label}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin: 25px 0; overflow-x: auto; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      <table style="width: 100%; border-collapse: collapse; background: #ffffff;">
        <thead>
          <tr style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: #ffffff;">
            <th style="padding: 14px 8px; text-align: center; font-weight: 700; border-right: 1px solid #475569;">Nro</th>
            <th style="padding: 14px 8px; text-align: left; font-weight: 700; border-right: 1px solid #475569;">Descripción</th>
            <th style="padding: 14px 8px; text-align: center; font-weight: 700; border-right: 1px solid #475569;">Fecha Planificada</th>
            <th style="padding: 14px 8px; text-align: center; font-weight: 700; border-right: 1px solid #475569;">Progreso</th>
            <th style="padding: 14px 8px; text-align: center; font-weight: 700;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function generateEmailContent(type: string, data: any): any {
  const baseStyle = "font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;";
  
  // Priority colors mapping
  const priorityColors = {
    low: { bg: '#6b7280', text: '#ffffff', label: 'Baja' },
    medium: { bg: '#2563eb', text: '#ffffff', label: 'Media' },
    high: { bg: '#ea580c', text: '#ffffff', label: 'Alta' },
    critical: { bg: '#dc2626', text: '#ffffff', label: 'Crítica' }
  };

  const reviewButtonHtml = `
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://ticketdesk.livigui.com/auth" 
         style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
        📋 Ver Tarea de TI
      </a>
    </div>
  `;
  
  const footerHtml = `
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
    <p style="font-size: 12px; color: #64748b;">
      Sistema de Tareas TI - LIVIGUI<br>
      Este es un email automático, por favor no responder directamente.
    </p>
  `;

  const activitiesTableHtml = generateActivitiesTable(data.activities);

  switch (type) {
    case 'ti_task_created':
      const priorityColor = priorityColors[data.priority as keyof typeof priorityColors] || priorityColors.medium;
      
      return {
        subject: `✅ Nueva Tarea TI Creada: ${data.taskCode} - ${data.subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #16a34a; margin: 0; font-size: 24px;">💻 Nueva Tarea de TI Creada</h1>
            </div>
            
            <p style="font-size: 16px;">Se ha creado una nueva tarea de TI que requiere atención.</p>
            
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #16a34a;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">📋 Detalles de la Tarea</h3>
              <div style="display: grid; gap: 8px;">
                <p style="margin: 5px 0;"><strong>Código:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.taskCode}</span></p>
                <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                ${data.description ? `<p style="margin: 5px 0;"><strong>Descripción:</strong> ${data.description}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Prioridad:</strong> 
                  <span style="background: ${priorityColor.bg}; color: ${priorityColor.text}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${priorityColor.label}
                  </span>
                </p>
                <p style="margin: 5px 0;"><strong>Categoría:</strong> ${data.category}</p>
                ${data.area ? `<p style="margin: 5px 0;"><strong>Área:</strong> ${data.area}</p>` : ''}
                ${data.sede ? `<p style="margin: 5px 0;"><strong>Sede:</strong> ${data.sede}</p>` : ''}
                ${data.assignee ? `<p style="margin: 5px 0;"><strong>Asignado a:</strong> ${data.assignee}</p>` : '<p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #64748b;">Pendiente de asignación</span></p>'}
              </div>
            </div>

            <h3 style="color: #0f172a; margin: 25px 0 15px 0; font-size: 18px;">📊 Actividades Planificadas</h3>
            ${activitiesTableHtml}
            
            ${reviewButtonHtml}
            ${footerHtml}
          </div>
        `
      };
      
    case 'activity_added':
      return {
        subject: `📌 Nueva Actividad - Tarea TI: ${data.taskCode}`,
        html: `
          <div style="${baseStyle}">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 24px;">📌 Nueva Actividad Agregada</h1>
            </div>
            
            <p style="font-size: 16px;">Se ha agregado una nueva actividad a la tarea de TI.</p>
            
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #2563eb;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">🎯 Información de la Tarea</h3>
              <div style="display: grid; gap: 8px;">
                <p style="margin: 5px 0;"><strong>Código:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.taskCode}</span></p>
                <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                ${data.activityDescription ? `<p style="margin: 5px 0;"><strong>Nueva Actividad:</strong> ${data.activityDescription}</p>` : ''}
              </div>
            </div>

            <h3 style="color: #0f172a; margin: 25px 0 15px 0; font-size: 18px;">📊 Todas las Actividades</h3>
            ${activitiesTableHtml}
            
            ${reviewButtonHtml}
            ${footerHtml}
          </div>
        `
      };

    case 'activity_completed':
      return {
        subject: `✅ Actividad Completada - Tarea TI: ${data.taskCode}`,
        html: `
          <div style="${baseStyle}">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #16a34a; margin: 0; font-size: 24px;">✅ Actividad Completada</h1>
            </div>
            
            <p style="font-size: 16px;">Una actividad de la tarea de TI ha sido completada exitosamente.</p>
            
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #16a34a;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">🎯 Información de la Tarea</h3>
              <div style="display: grid; gap: 8px;">
                <p style="margin: 5px 0;"><strong>Código:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.taskCode}</span></p>
                <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                ${data.activityDescription ? `<p style="margin: 5px 0;"><strong>Actividad Completada:</strong> ${data.activityDescription}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Progreso:</strong> 
                  <span style="background: #16a34a; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                    ${data.progress || 100}%
                  </span>
                </p>
              </div>
            </div>

            <h3 style="color: #0f172a; margin: 25px 0 15px 0; font-size: 18px;">📊 Estado de Todas las Actividades</h3>
            ${activitiesTableHtml}
            
            ${reviewButtonHtml}
            ${footerHtml}
          </div>
        `
      };

    case 'ti_task_resolved':
      return {
        subject: `🎉 Tarea TI Resuelta: ${data.taskCode} - ${data.subject}`,
        html: `
          <div style="${baseStyle}">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #16a34a; margin: 0; font-size: 24px;">🎉 Tarea de TI Resuelta</h1>
            </div>
            
            <p style="font-size: 16px;">La tarea de TI ha sido marcada como resuelta.</p>
            
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #16a34a;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">✅ Tarea Completada</h3>
              <div style="display: grid; gap: 8px;">
                <p style="margin: 5px 0;"><strong>Código:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.taskCode}</span></p>
                <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                ${data.description ? `<p style="margin: 5px 0;"><strong>Descripción:</strong> ${data.description}</p>` : ''}
              </div>
            </div>

            <h3 style="color: #0f172a; margin: 25px 0 15px 0; font-size: 18px;">📊 Resumen de Actividades Completadas</h3>
            ${activitiesTableHtml}
            
            <div style="background: #16a34a15; padding: 16px; border-radius: 8px; margin: 20px 0; border: 2px solid #16a34a40;">
              <p style="margin: 0; color: #16a34a; font-weight: 600; text-align: center;">
                🎊 ¡Todas las actividades han sido completadas exitosamente!
              </p>
            </div>
            
            ${reviewButtonHtml}
            ${footerHtml}
          </div>
        `
      };

    default:
      return {
        subject: `Notificación - Tarea TI: ${data.taskCode}`,
        html: `
          <div style="${baseStyle}">
            <h2>Notificación de Tarea TI</h2>
            <p>Se ha realizado una actualización en la tarea ${data.taskCode}</p>
            ${activitiesTableHtml}
            ${reviewButtonHtml}
            ${footerHtml}
          </div>
        `
      };
  }
}

serve(handler);
