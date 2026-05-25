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
  type: 'ticket_created' | 'ticket_updated' | 'activity_added' | 'activity_updated' | 'activity_completed' | 'all_activities_completed' | 'message_added' | 'status_changed';
  ticketId: string;
  ticketCode?: string;
  subject?: string;
  requester: string;
  requesterEmail: string;
  assignee?: string;
  priority?: string;
  category?: string;
  oldStatus?: string;
  newStatus?: string;
  activityDescription?: string;
  messageContent?: string;
  progress?: number;
  activityDueDate?: string;
  activityEndTime?: string;
}

// Function to check if notification type is enabled
async function checkNotificationEnabled(supabase: any, notificationType: string): Promise<boolean> {
  const settingKeyMap: Record<string, string> = {
    'ticket_created': 'email_notifications_ticket_created',
    'ticket_updated': 'email_notifications_ticket_updated', 
    'activity_added': 'email_notifications_activity_added',
    'activity_completed': 'email_notifications_activity_completed',
    'activity_updated': 'email_notifications_activity_completed', // Same as activity_completed
    'all_activities_completed': 'email_notifications_ticket_resolved', // When all activities complete, ticket is resolved
    'status_changed': 'email_notifications_ticket_status_changed',
    'message_added': 'email_notifications_ticket_updated' // Messages are ticket updates
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
      // Default to enabled if we can't fetch the setting
      return true;
    }

    // The value is stored as boolean in jsonb
    const isEnabled = data?.value === true;
    console.log(`Setting ${settingKey}: ${isEnabled}`);
    return isEnabled;
  } catch (error) {
    console.error(`Error checking notification setting:`, error);
    // Default to enabled if there's any error
    return true;
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
      ticketId, 
      ticketCode, 
      subject, 
      requester, 
      requesterEmail, 
      assignee, 
      priority, 
      category,
      oldStatus,
      newStatus,
      activityDescription,
      messageContent,
      progress,
      activityDueDate,
      activityEndTime
    } = notificationData;

    console.log(`Checking ${type} notification for ticket:`, ticketId);

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

    console.log(`Sending ${type} notification for ticket:`, ticketId);

    // Get ticket details including description
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('description')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      console.error('Error fetching ticket details:', ticketError);
    }

    // Get activities for all_activities_completed notification
    let activities = null;
    if (type === 'all_activities_completed') {
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('ticket_activities')
        .select('description, due_date, completion_date, completion_time')
        .eq('ticket_id', ticketId)
        .order('activity_number', { ascending: true });

      if (activitiesError) {
        console.error('Error fetching ticket activities:', activitiesError);
      } else {
        activities = activitiesData;
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

    // Get additional notification recipients
    const { data: additionalRecipients, error: recipientsError } = await supabase
      .from('notification_recipients')
      .select('email')
      .eq('active', true);

    if (recipientsError) {
      console.error('Error fetching notification recipients:', recipientsError);
    }

    // Always include supervisor email and any TI users found
    const emailRecipients = ['supervisorti@livigui.com'];
    
    if (tiUsers && tiUsers.length > 0) {
      tiUsers.forEach(user => {
        if (user.email && !emailRecipients.includes(user.email)) {
          emailRecipients.push(user.email);
        }
      });
    }

    // Add additional notification recipients from the list
    if (additionalRecipients && additionalRecipients.length > 0) {
      additionalRecipients.forEach(recipient => {
        if (recipient.email && !emailRecipients.includes(recipient.email)) {
          emailRecipients.push(recipient.email);
        }
      });
    }

    // Send emails to actual recipients
    const finalRecipients = emailRecipients;
    const requesterFinalEmail = requesterEmail;

    // Generate email content based on notification type
    const { requesterContent, tiContent } = generateEmailContent(type, {
      ticketId,
      ticketCode,
      subject,
      requester,
      requesterEmail,
      assignee,
      priority,
      category,
      oldStatus,
      newStatus,
      activityDescription,
      messageContent,
      progress,
      activityDueDate,
      activityEndTime,
      description: ticket?.description,
      activities
    });

    // Send email to requester
    const requesterEmailResponse = await resend.emails.send({
      from: "Soporte Livigui <support@livigui.com>",
      to: [requesterFinalEmail],
      subject: requesterContent.subject,
      html: requesterContent.html,
    });

    console.log("Requester email sent:", requesterEmailResponse);

    // Send notification to TI team
    const tiEmailResponse = await resend.emails.send({
      from: "Soporte Livigui <support@livigui.com>",
      to: finalRecipients,
      subject: tiContent.subject,
      html: tiContent.html,
    });

    console.log("TI team email sent:", tiEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        type,
        requesterEmailId: requesterEmailResponse.data?.id,
        tiEmailId: tiEmailResponse.data?.id 
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
    console.error(`Error in send notification:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateEmailContent(type: string, data: any): { requesterContent: any, tiContent: any } {
  const baseStyle = "font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;";
  
  // Status colors mapping
  const statusColors = {
    open: { bg: '#dc2626', text: '#ffffff', label: 'Ingresado' },
    in_progress: { bg: '#2563eb', text: '#ffffff', label: 'En Progreso' },
    resolved: { bg: '#16a34a', text: '#ffffff', label: 'Resuelto' },
    closed: { bg: '#6b7280', text: '#ffffff', label: 'Cerrado' }
  };

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
        📋 Revisar Ticket
      </a>
    </div>
  `;
  
  const footerHtml = `
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
    <p style="font-size: 12px; color: #64748b;">
      Sistema de Tickets - LIVIGUI<br>
      Este es un email automático, por favor no responder directamente.
    </p>
  `;

  switch (type) {
    case 'ticket_created':
      const statusColor = statusColors[data.newStatus as keyof typeof statusColors] || statusColors.open;
      const priorityColor = priorityColors[data.priority as keyof typeof priorityColors] || priorityColors.medium;
      
      return {
        requesterContent: {
          subject: `✅ Ticket Creado: ${data.ticketCode} - ${data.subject}`,
          html: `
            <div style="${baseStyle}">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #16a34a; margin: 0; font-size: 24px;">✅ Ticket Creado Exitosamente</h1>
              </div>
              
              <p style="font-size: 16px;">Hola <strong>${data.requester}</strong>,</p>
              <p>Tu ticket ha sido creado exitosamente y será procesado por el Área de TI.</p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #16a34a;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">📋 Detalles del Ticket</h3>
                <div style="display: grid; gap: 8px;">
                  <p style="margin: 5px 0;"><strong>Código:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.ticketCode}</span></p>
                  <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                  ${data.description ? `<p style="margin: 5px 0;"><strong>Descripción:</strong> ${data.description}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Estado:</strong> 
                    <span style="background: ${statusColor.bg}; color: ${statusColor.text}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                      ${statusColor.label}
                    </span>
                  </p>
                  <p style="margin: 5px 0;"><strong>Prioridad:</strong> 
                    <span style="background: ${priorityColor.bg}; color: ${priorityColor.text}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                      ${priorityColor.label}
                    </span>
                  </p>
                  <p style="margin: 5px 0;"><strong>Categoría:</strong> ${data.category}</p>
                  ${data.assignee ? `<p style="margin: 5px 0;"><strong>Asignado a:</strong> ${data.assignee}</p>` : '<p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #64748b;">Pendiente de asignación</span></p>'}
                </div>
              </div>
              
              <p style="color: #475569;">📨 Este mensaje es informativo para dar seguimiento presione el botón Revisar Ticket 🎟️ e ingrese con sus credenciales</p>
              
              ${reviewButtonHtml}
              
              <p style="color: #475569;">Recibirás actualizaciones sobre el progreso de tu ticket por email.</p>
              <p>Gracias por contactar a <strong>LIVIGUI</strong> - soluciones rápidas y duraderas.</p>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `🔔 Nuevo Ticket: ${data.ticketCode} - ${data.subject}`,
          html: `
            <div style="${baseStyle}">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #dc2626; margin: 0; font-size: 24px;">🔔 Nuevo Ticket Creado</h1>
              </div>
              
              <p style="font-size: 16px;">Se ha creado un nuevo ticket que requiere atención.</p>
              
              <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #dc2626;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">🎫 Detalles del Ticket</h3>
                <div style="display: grid; gap: 8px;">
                  <p style="margin: 5px 0;"><strong>Código:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.ticketCode}</span></p>
                  <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                  ${data.description ? `<p style="margin: 5px 0;"><strong>Descripción:</strong> ${data.description}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Solicitante:</strong> ${data.requester} <span style="color: #64748b;">(${data.requesterEmail})</span></p>
                  <p style="margin: 5px 0;"><strong>Estado:</strong> 
                    <span style="background: ${statusColor.bg}; color: ${statusColor.text}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                      ${statusColor.label}
                    </span>
                  </p>
                  <p style="margin: 5px 0;"><strong>Prioridad:</strong> 
                    <span style="background: ${priorityColor.bg}; color: ${priorityColor.text}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                      ${priorityColor.label}
                    </span>
                  </p>
                  <p style="margin: 5px 0;"><strong>Categoría:</strong> ${data.category}</p>
                  ${data.assignee ? `<p style="margin: 5px 0;"><strong>Asignado a:</strong> ${data.assignee}</p>` : '<p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #dc2626; font-weight: 600;">⚠️ Pendiente de asignación</span></p>'}
                </div>
              </div>
              
              <p style="color: #475569;">📨 Este mensaje es informativo para dar seguimiento presione el botón Revisar Ticket 🎟️ e ingrese con sus credenciales</p>
              
              ${reviewButtonHtml}
              ${footerHtml}
            </div>
          `
        }
      };
      
    case 'ticket_updated':
      return {
        requesterContent: {
          subject: `Ticket Actualizado: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #059669;">Ticket Actualizado</h2>
              <p>Hola <strong>${data.requester}</strong>,</p>
              <p>Tu ticket <strong>${data.ticketCode}</strong> ha sido actualizado.</p>
              
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #059669;">Información del Ticket</h3>
                <p><strong>Asunto:</strong> ${data.subject}</p>
                ${data.assignee ? `<p><strong>Asignado a:</strong> ${data.assignee}</p>` : ''}
              </div>
              
              <p>Te mantendremos informado de cualquier cambio adicional.</p>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `Ticket Actualizado: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #059669;">Ticket Actualizado</h2>
              <p>El ticket <strong>${data.ticketCode}</strong> ha sido actualizado.</p>
              
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Solicitante:</strong> ${data.requester} (${data.requesterEmail})</p>
                <p><strong>Asunto:</strong> ${data.subject}</p>
                ${data.assignee ? `<p><strong>Asignado a:</strong> ${data.assignee}</p>` : ''}
              </div>
              ${footerHtml}
            </div>
          `
        }
      };

    case 'status_changed':
      return {
        requesterContent: {
          subject: `Cambio de Estado - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #7c3aed;">Estado del Ticket Actualizado</h2>
              <p>Hola <strong>${data.requester}</strong>,</p>
              <p>El estado de tu ticket <strong>${data.ticketCode}</strong> ha cambiado.</p>
              
              <div style="background: #faf5ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #7c3aed;">Cambio de Estado</h3>
                <p><strong>De:</strong> ${data.oldStatus}</p>
                <p><strong>A:</strong> ${data.newStatus}</p>
                <p><strong>Asunto:</strong> ${data.subject}</p>
              </div>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `Estado Cambiado - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #7c3aed;">Estado del Ticket Actualizado</h2>
              <p>El estado del ticket <strong>${data.ticketCode}</strong> ha cambiado de <strong>${data.oldStatus}</strong> a <strong>${data.newStatus}</strong>.</p>
              
              <div style="background: #faf5ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Solicitante:</strong> ${data.requester} (${data.requesterEmail})</p>
                <p><strong>Asunto:</strong> ${data.subject}</p>
              </div>
              ${footerHtml}
            </div>
          `
        }
      };

    case 'activity_added':
      return {
        requesterContent: {
          subject: `🔧 Nueva Actividad - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #0891b2; margin: 0; font-size: 24px;">🔧 Nueva Actividad Agregada</h1>
              </div>
              
              <p style="font-size: 16px;">Hola <strong>${data.requester}</strong>,</p>
              <p>Se ha agregado una nueva actividad a tu ticket <strong>${data.ticketCode}</strong>.</p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0891b2;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">✅ Nueva Actividad</h3>
                <p style="margin: 5px 0;"><strong>Ticket:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.ticketCode}</span></p>
                 <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                 <p style="margin: 10px 0; padding: 12px; background: #ffffff; border-radius: 6px; border-left: 3px solid #0891b2;"><strong>Actividad:</strong> ${data.activityDescription}</p>
                 ${data.activityDueDate ? `<p style="margin: 5px 0;"><strong>📅 Fecha límite:</strong> ${new Date(data.activityDueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                 ${data.activityEndTime ? `<p style="margin: 5px 0;"><strong>⏰ Hora de término:</strong> ${data.activityEndTime}</p>` : ''}
              </div>
              
              ${reviewButtonHtml}
              
              <p style="color: #475569;">Te notificaremos sobre el progreso de esta actividad.</p>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `🔧 Actividad Agregada - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #0891b2; margin: 0; font-size: 24px;">🔧 Nueva Actividad Agregada</h1>
              </div>
              
              <p style="font-size: 16px;">Se ha agregado una nueva actividad al ticket <strong>${data.ticketCode}</strong>.</p>
              
              <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0891b2;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">✅ Detalles de la Actividad</h3>
                <p style="margin: 5px 0;"><strong>Ticket:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.ticketCode}</span></p>
                <p style="margin: 5px 0;"><strong>Solicitante:</strong> ${data.requester} <span style="color: #64748b;">(${data.requesterEmail})</span></p>
                 <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                 <p style="margin: 10px 0; padding: 12px; background: #ffffff; border-radius: 6px; border-left: 3px solid #0891b2;"><strong>Nueva Actividad:</strong> ${data.activityDescription}</p>
                 ${data.activityDueDate ? `<p style="margin: 5px 0;"><strong>📅 Fecha límite:</strong> ${new Date(data.activityDueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                 ${data.activityEndTime ? `<p style="margin: 5px 0;"><strong>⏰ Hora de término:</strong> ${data.activityEndTime}</p>` : ''}
              </div>
              
              ${reviewButtonHtml}
              ${footerHtml}
            </div>
          `
        }
      };

    case 'activity_updated':
      return {
        requesterContent: {
          subject: `Progreso Actualizado - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #ea580c;">Progreso de Actividad Actualizado</h2>
              <p>Hola <strong>${data.requester}</strong>,</p>
              <p>El progreso de una actividad en tu ticket <strong>${data.ticketCode}</strong> ha sido actualizado.</p>
              
               <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <h3 style="margin: 0 0 10px 0; color: #ea580c;">Progreso Actualizado</h3>
                 <p><strong>Actividad:</strong> ${data.activityDescription}</p>
                 <p><strong>Progreso:</strong> ${data.progress}%</p>
                 ${data.activityDueDate ? `<p><strong>📅 Fecha límite:</strong> ${new Date(data.activityDueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                 ${data.activityEndTime ? `<p><strong>⏰ Hora de término:</strong> ${data.activityEndTime}</p>` : ''}
               </div>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `Progreso Actualizado - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #ea580c;">Progreso de Actividad Actualizado</h2>
              <p>El progreso de una actividad del ticket <strong>${data.ticketCode}</strong> ha sido actualizado.</p>
              
               <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <p><strong>Solicitante:</strong> ${data.requester} (${data.requesterEmail})</p>
                 <p><strong>Actividad:</strong> ${data.activityDescription}</p>
                 <p><strong>Progreso:</strong> ${data.progress}%</p>
                 ${data.activityDueDate ? `<p><strong>📅 Fecha límite:</strong> ${new Date(data.activityDueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                 ${data.activityEndTime ? `<p><strong>⏰ Hora de término:</strong> ${data.activityEndTime}</p>` : ''}
               </div>
              ${footerHtml}
            </div>
          `
        }
      };

    case 'activity_completed':
      return {
        requesterContent: {
          subject: `Actividad Completada - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #16a34a;">Actividad Completada</h2>
              <p>Hola <strong>${data.requester}</strong>,</p>
              <p>¡Excelente noticia! Una actividad de tu ticket <strong>${data.ticketCode}</strong> ha sido completada.</p>
              
               <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <h3 style="margin: 0 0 10px 0; color: #16a34a;">Actividad Completada</h3>
                 <p><strong>Descripción:</strong> ${data.activityDescription}</p>
                 ${data.activityDueDate ? `<p><strong>📅 Fecha límite:</strong> ${new Date(data.activityDueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                 ${data.activityEndTime ? `<p><strong>⏰ Hora de término:</strong> ${data.activityEndTime}</p>` : ''}
               </div>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `Actividad Completada - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2 style="color: #16a34a;">Actividad Completada</h2>
              <p>Una actividad del ticket <strong>${data.ticketCode}</strong> ha sido completada.</p>
              
               <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                 <p><strong>Solicitante:</strong> ${data.requester} (${data.requesterEmail})</p>
                 <p><strong>Actividad:</strong> ${data.activityDescription}</p>
                 ${data.activityDueDate ? `<p><strong>📅 Fecha límite:</strong> ${new Date(data.activityDueDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                 ${data.activityEndTime ? `<p><strong>⏰ Hora de término:</strong> ${data.activityEndTime}</p>` : ''}
               </div>
              ${footerHtml}
            </div>
          `
        }
      };

    case 'all_activities_completed':
      // Generate activities list HTML
      let activitiesListHtml = '';
      if (data.activities && data.activities.length > 0) {
        activitiesListHtml = `
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">📋 Actividades Completadas:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
              ${data.activities.map((activity: any, index: number) => `
                <li style="margin: 8px 0;">
                  <strong>Actividad ${index + 1}:</strong> ${activity.description}
                  ${activity.completion_date ? `<br><span style="font-size: 12px; color: #10b981;">✓ Completado: ${new Date(activity.completion_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}${activity.completion_time ? ` a las ${activity.completion_time}` : ''}</span>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }
      
      return {
        requesterContent: {
          subject: `✅ Ticket ${data.ticketCode} - Actividades Completadas - Solicitud de Conformidad`,
          html: `
            <div style="${baseStyle}">
              <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎉 ¡Ticket Resuelto!</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">Todas las actividades han sido completadas</p>
              </div>
              
              <div style="padding: 24px;">
                <p style="font-size: 16px;">Hola <strong>${data.requester}</strong>,</p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #166534; font-weight: 600;">
                    ¡Excelentes noticias! Todas las actividades de su ticket han sido completadas exitosamente.
                  </p>
                </div>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Detalles del Ticket:</h3>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Código:</strong> ${data.ticketCode}</p>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Asunto:</strong> ${data.subject}</p>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Estado:</strong> <span style="color: #10b981; font-weight: 600;">Resuelto</span></p>
                </div>
                
                ${activitiesListHtml}
                
                <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">🔔 Acción Requerida</h3>
                  <p style="margin: 0; color: #92400e;">
                    Por favor, ingrese al sistema de tickets para revisar el trabajo realizado y confirmar su conformidad con la solución proporcionada.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://ticketdesk.livigui.com/auth" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    Revisar Ticket y Dar Conformidad
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
                  Una vez que revise el trabajo realizado, podrá marcar su conformidad con la solución en el sistema.
                </p>
              </div>
              
              <div style="padding: 16px; background: #f8f9fa; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                  Sistema de Tickets - LIVIGUI<br>
                  Este es un email automático, por favor no responder directamente.
                </p>
              </div>
            </div>
          `
        },
        tiContent: {
          subject: `✅ Ticket ${data.ticketCode} - Todas las Actividades Completadas`,
          html: `
            <div style="${baseStyle}">
              <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎉 ¡Actividades Completadas!</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">Ticket marcado como resuelto</p>
              </div>
              
              <div style="padding: 24px;">
                <p style="font-size: 16px;">Se han completado todas las actividades del ticket <strong>${data.ticketCode}</strong>.</p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #166534; font-weight: 600;">
                    El ticket ha sido automáticamente marcado como "Resuelto" y se ha solicitado la conformidad del usuario.
                  </p>
                </div>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Detalles del Ticket:</h3>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Código:</strong> ${data.ticketCode}</p>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Asunto:</strong> ${data.subject}</p>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Solicitante:</strong> ${data.requester} (${data.requesterEmail})</p>
                  <p style="margin: 4px 0; color: #6b7280;"><strong>Estado:</strong> <span style="color: #10b981; font-weight: 600;">Resuelto</span></p>
                </div>
                
                ${activitiesListHtml}
                
                <div style="text-align: center; margin: 24px 0;">
                  <a href="https://ticketdesk.livigui.com/auth" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    📋 Revisar Ticket
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
                  El usuario ha sido notificado para que revise y confirme su conformidad con la solución.
                </p>
              </div>
              
              <div style="padding: 16px; background: #f8f9fa; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                  Sistema de Tickets - LIVIGUI<br>
                  Este es un email automático, por favor no responder directamente.
                </p>
              </div>
            </div>
          `
        }
      };

    case 'message_added':
      return {
        requesterContent: {
          subject: `💬 Nuevo Mensaje - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #6366f1; margin: 0; font-size: 24px;">💬 Nuevo Mensaje en tu Ticket</h1>
              </div>
              
              <p style="font-size: 16px;">Hola <strong>${data.requester}</strong>,</p>
              <p>Se ha agregado un nuevo mensaje a tu ticket <strong>${data.ticketCode}</strong>.</p>
              
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #6366f1;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">💬 Nuevo Mensaje</h3>
                <p style="margin: 5px 0;"><strong>Ticket:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.ticketCode}</span></p>
                <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                <div style="margin: 15px 0; padding: 15px; background: #ffffff; border-radius: 8px; border-left: 3px solid #6366f1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <p style="margin: 0; line-height: 1.6; color: #334155;">${data.messageContent}</p>
                </div>
              </div>
              
              ${reviewButtonHtml}
              
              <p style="color: #475569;">Puedes responder directamente desde el panel de tickets.</p>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `💬 Nuevo Mensaje - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #6366f1; margin: 0; font-size: 24px;">💬 Nuevo Mensaje Agregado</h1>
              </div>
              
              <p style="font-size: 16px;">Se ha agregado un nuevo mensaje al ticket <strong>${data.ticketCode}</strong>.</p>
              
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #6366f1;">
                <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 18px;">💬 Detalles del Mensaje</h3>
                <p style="margin: 5px 0;"><strong>Ticket:</strong> <span style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${data.ticketCode}</span></p>
                <p style="margin: 5px 0;"><strong>Solicitante:</strong> ${data.requester} <span style="color: #64748b;">(${data.requesterEmail})</span></p>
                <p style="margin: 5px 0;"><strong>Asunto:</strong> ${data.subject}</p>
                <div style="margin: 15px 0; padding: 15px; background: #ffffff; border-radius: 8px; border-left: 3px solid #6366f1; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <p style="margin: 0; line-height: 1.6; color: #334155;"><strong>Mensaje:</strong> ${data.messageContent}</p>
                </div>
              </div>
              
              ${reviewButtonHtml}
              ${footerHtml}
            </div>
          `
        }
      };

    default:
      return {
        requesterContent: {
          subject: `Notificación - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2>Notificación del Sistema</h2>
              <p>Hola <strong>${data.requester}</strong>,</p>
              <p>Tu ticket <strong>${data.ticketCode}</strong> ha sido actualizado.</p>
              ${footerHtml}
            </div>
          `
        },
        tiContent: {
          subject: `Notificación - Ticket: ${data.ticketCode}`,
          html: `
            <div style="${baseStyle}">
              <h2>Notificación del Sistema</h2>
              <p>El ticket <strong>${data.ticketCode}</strong> ha sido actualizado.</p>
              ${footerHtml}
            </div>
          `
        }
      };
  }
}

serve(handler);