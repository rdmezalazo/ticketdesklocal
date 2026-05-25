import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActivityInfo {
  activity_number: number;
  description: string;
  progress: number;
  completed: boolean;
}

interface MentionNotificationRequest {
  task_id: string;
  task_type: 'ti_task' | 'ti_task_activity' | 'ticket';
  task_code: string;
  task_subject: string;
  task_description?: string;
  task_status?: string;
  task_priority?: string;
  task_category?: string;
  mentioned_users: string[];
  action: 'task_created' | 'task_updated' | 'activity_created' | 'activity_updated' | 'activity_completed' | 'task_completed';
  action_description?: string;
  activity_number?: number;
  activities?: ActivityInfo[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      task_id, 
      task_type, 
      task_code, 
      task_subject,
      task_description,
      task_status,
      task_priority,
      task_category,
      mentioned_users, 
      action, 
      action_description,
      activity_number,
      activities
    }: MentionNotificationRequest = await req.json();

    console.log('Sending mention notifications for:', { task_id, task_type, mentioned_users, action });

    if (!mentioned_users || mentioned_users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user profiles for mentioned users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', mentioned_users);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      throw new Error('Failed to fetch user profiles');
    }

    console.log('Found profiles:', profiles);

    // Send email to each mentioned user
    const emailPromises = profiles.map(async (profile) => {
      const actionText = getActionText(action);
      const taskTypeText = task_type.includes('ti_task') ? 'Tarea de TI' : 'Ticket';
      const isActivity = task_type === 'ti_task_activity';
      
      let subject = `${taskTypeText} ${task_code}: ${actionText}`;
      
      // Generate activities progress HTML if activities are provided
      let activitiesHTML = '';
      if (activities && activities.length > 0) {
        const completedCount = activities.filter(a => a.completed).length;
        const totalCount = activities.length;
        const overallProgress = Math.round(activities.reduce((sum, a) => sum + a.progress, 0) / totalCount);
        
        activitiesHTML = `
          <div style="margin-top: 20px;">
            <h3 style="color: #1e40af; font-size: 16px; margin-bottom: 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              Estado de Actividades
            </h3>
            <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #475569; font-size: 14px;">Progreso General</span>
                <span style="color: #1e40af; font-weight: bold; font-size: 14px;">${overallProgress}%</span>
              </div>
              <div style="background: #e2e8f0; border-radius: 10px; height: 20px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%); height: 100%; width: ${overallProgress}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="margin-top: 8px; color: #64748b; font-size: 13px;">
                ${completedCount} de ${totalCount} actividades completadas
              </div>
            </div>
            
            <div style="margin-top: 15px;">
              ${activities.map(activity => `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="background: ${activity.completed ? '#10b981' : '#3b82f6'}; color: white; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: bold;">
                        #${activity.activity_number}
                      </span>
                      ${activity.completed ? '<span style="color: #10b981; font-size: 20px;">✓</span>' : ''}
                    </div>
                    <span style="color: ${activity.progress === 100 ? '#10b981' : '#3b82f6'}; font-weight: bold; font-size: 13px;">
                      ${activity.progress}%
                    </span>
                  </div>
                  <div style="background: #f1f5f9; border-radius: 8px; height: 6px; overflow: hidden; margin-bottom: 6px;">
                    <div style="background: ${activity.progress === 100 ? '#10b981' : '#3b82f6'}; height: 100%; width: ${activity.progress}%;"></div>
                  </div>
                  <div style="color: #475569; font-size: 13px; line-height: 1.4;">
                    ${activity.description.replace(/<[^>]*>/g, '').substring(0, 100)}${activity.description.length > 100 ? '...' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Status and priority badges
      const statusColors: Record<string, string> = {
        'open': '#3b82f6',
        'in_progress': '#f59e0b',
        'resolved': '#10b981',
        'closed': '#6b7280'
      };
      
      const priorityColors: Record<string, string> = {
        'low': '#10b981',
        'medium': '#f59e0b',
        'high': '#ef4444',
        'critical': '#991b1b'
      };

      const statusText: Record<string, string> = {
        'open': 'Abierta',
        'in_progress': 'En Progreso',
        'resolved': 'Resuelta',
        'closed': 'Cerrada'
      };

      const priorityText: Record<string, string> = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta',
        'critical': 'Crítica'
      };
      
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Sistema TI
              </h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">
                Notificación de ${taskTypeText}
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 10px 0;">
                Hola ${profile.full_name},
              </h2>
              <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 15px;">
                ${isActivity 
                  ? `Has sido mencionado en una actividad de la siguiente ${taskTypeText.toLowerCase()}:` 
                  : `Has sido mencionado en la siguiente ${taskTypeText.toLowerCase()}:`}
              </p>
              
              <!-- Task Card -->
              <div style="background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                  <span style="background: #1e40af; color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                    ${task_code}
                  </span>
                </div>
                
                <h3 style="color: #1e293b; font-size: 18px; margin: 0 0 15px 0; line-height: 1.4;">
                  ${task_subject}
                </h3>
                
                ${task_description ? `
                  <p style="color: #64748b; line-height: 1.6; margin: 0 0 15px 0; font-size: 14px;">
                    ${task_description.replace(/<[^>]*>/g, '').substring(0, 200)}${task_description.length > 200 ? '...' : ''}
                  </p>
                ` : ''}
                
                <!-- Metadata Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                  ${task_status ? `
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Estado</div>
                      <div style="display: inline-block; background: ${statusColors[task_status] || '#6b7280'}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600;">
                        ${statusText[task_status] || task_status}
                      </div>
                    </div>
                  ` : ''}
                  
                  ${task_priority ? `
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Prioridad</div>
                      <div style="display: inline-block; background: ${priorityColors[task_priority] || '#6b7280'}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600;">
                        ${priorityText[task_priority] || task_priority}
                      </div>
                    </div>
                  ` : ''}
                  
                  ${task_category ? `
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Categoría</div>
                      <div style="color: #1e293b; font-size: 13px; font-weight: 600;">
                        ${task_category}
                      </div>
                    </div>
                  ` : ''}
                  
                  ${isActivity && activity_number ? `
                    <div style="background: #f8fafc; padding: 10px; border-radius: 6px;">
                      <div style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Actividad</div>
                      <div style="color: #1e293b; font-size: 13px; font-weight: 600;">
                        #${activity_number}
                      </div>
                    </div>
                  ` : ''}
                </div>
                
                <!-- Action Info -->
                <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 15px; margin-top: 15px; border-radius: 4px;">
                  <div style="color: #1e40af; font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                    ${actionText}
                  </div>
                  ${action_description ? `
                    <div style="color: #475569; font-size: 13px;">
                      ${action_description}
                    </div>
                  ` : ''}
                </div>
              </div>
              
              ${activitiesHTML}
              
              <!-- CTA -->
              <div style="text-align: center; margin: 30px 0 20px 0;">
                <p style="color: #475569; font-size: 14px; margin-bottom: 15px;">
                  Por favor, revisa los detalles completos en el sistema para mantenerte al día con los cambios.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
                  Saludos cordiales,<br>
                  <strong style="color: #1e40af;">Equipo de TI</strong><br>
                  <span style="font-size: 12px;">Sistema de Gestión de Tareas</span>
                </p>
              </div>
            </div>
            
            <!-- Email Footer -->
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Este es un correo automático, por favor no responder.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      return resend.emails.send({
        from: "Sistema TI <soporte@livigui.com>",
        to: [profile.email],
        subject: subject,
        html: htmlContent,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Log results
    emailResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Email sent successfully to ${profiles[index].email}:`, result.value);
      } else {
        console.error(`Failed to send email to ${profiles[index].email}:`, result.reason);
      }
    });

    const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const failureCount = emailResults.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ 
        message: `Notifications sent: ${successCount} success, ${failureCount} failed`,
        results: emailResults 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-mention-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getActionText(action: string): string {
  switch (action) {
    case 'task_created':
      return 'Nueva tarea creada';
    case 'task_updated':
      return 'Tarea actualizada';
    case 'activity_created':
      return 'Nueva actividad creada';
    case 'activity_updated':
      return 'Actividad actualizada';
    case 'activity_completed':
      return 'Actividad completada';
    case 'task_completed':
      return 'Tarea finalizada';
    default:
      return 'Cambio realizado';
  }
}

serve(handler);