import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestReportRequest {
  configId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId }: TestReportRequest = await req.json();

    if (!configId) {
      throw new Error("Config ID is required");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the configuration
    const { data: config, error: configError } = await supabaseClient
      .from('automatic_report_configs')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      throw new Error(`Configuration not found: ${configError?.message}`);
    }

    console.log("Generating real report for config:", config.name);

    // Calculate date range based on period_type
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (config.period_type) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case 'date_range':
        startDate = config.start_date ? new Date(config.start_date) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = config.end_date ? new Date(config.end_date) : new Date(now);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Fetch real data based on configuration
    let ticketsData: any[] = [];
    let tiTasksData: any[] = [];
    let ticketsStats = { total: 0, open: 0, closed: 0, resolved: 0, in_progress: 0 };
    let tiTasksStats = { total: 0, open: 0, closed: 0, resolved: 0, in_progress: 0 };

    if (config.report_type === 'tickets' || config.report_type === 'both') {
      const { data: tickets, error: ticketsError } = await supabaseClient
        .from('tickets')
        .select('id, code, subject, status, priority, category, created_at, requester, requester_area')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (!ticketsError && tickets) {
        ticketsData = tickets;
        ticketsStats.total = tickets.length;
        ticketsStats.open = tickets.filter(t => t.status === 'open').length;
        ticketsStats.closed = tickets.filter(t => t.status === 'closed').length;
        ticketsStats.resolved = tickets.filter(t => t.status === 'resolved').length;
        ticketsStats.in_progress = tickets.filter(t => t.status === 'in_progress').length;
      }
    }

    if (config.report_type === 'ti_tasks' || config.report_type === 'both') {
      const { data: tiTasks, error: tiTasksError } = await supabaseClient
        .from('ti_tasks')
        .select('id, code, subject, status, priority, category, created_at, area')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (!tiTasksError && tiTasks) {
        tiTasksData = tiTasks;
        tiTasksStats.total = tiTasks.length;
        tiTasksStats.open = tiTasks.filter(t => t.status === 'open').length;
        tiTasksStats.closed = tiTasks.filter(t => t.status === 'closed').length;
        tiTasksStats.resolved = tiTasks.filter(t => t.status === 'resolved').length;
        tiTasksStats.in_progress = tiTasks.filter(t => t.status === 'in_progress').length;
      }
    }

    // Generate status colors
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'open': return '#ef4444';
        case 'in_progress': return '#f59e0b';
        case 'resolved': return '#22c55e';
        case 'closed': return '#10b981';
        default: return '#6b7280';
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return '#dc2626';
        case 'medium': return '#f59e0b';
        case 'low': return '#10b981';
        default: return '#6b7280';
      }
    };

    // Generate charts HTML if enabled (using tables for Outlook compatibility)
    let chartsHtml = '';
    if (config.include_charts) {
      chartsHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
          <tr>
            ${config.report_type === 'tickets' || config.report_type === 'both' ? `
              <td width="50%" valign="top" style="padding-right: 10px;">
                <table width="100%" cellpadding="20" cellspacing="0" style="background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <tr>
                    <td>
                      <h3 style="color: #1f2937; margin: 0 0 15px 0; text-align: center; font-size: 16px;">📊 Estado de Tickets</h3>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                           <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#ef4444" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${ticketsStats.open}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #ef4444; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${ticketsStats.open}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">Abiertos</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#f59e0b" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${ticketsStats.in_progress}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #f59e0b; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${ticketsStats.in_progress}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">En Progreso</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#22c55e" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${ticketsStats.resolved}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #22c55e; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${ticketsStats.resolved}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">Resueltos</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#10b981" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${ticketsStats.closed}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${ticketsStats.closed}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">Cerrados</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            ` : ''}
            
            ${config.report_type === 'ti_tasks' || config.report_type === 'both' ? `
              <td width="50%" valign="top" style="${config.report_type === 'both' ? 'padding-left: 10px;' : ''}">
                <table width="100%" cellpadding="20" cellspacing="0" style="background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <tr>
                    <td>
                      <h3 style="color: #1f2937; margin: 0 0 15px 0; text-align: center; font-size: 16px;">⚙️ Estado de Tareas TI</h3>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#ef4444" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${tiTasksStats.open}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #ef4444; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${tiTasksStats.open}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">Abiertas</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#f59e0b" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${tiTasksStats.in_progress}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #f59e0b; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${tiTasksStats.in_progress}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">En Progreso</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#22c55e" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${tiTasksStats.resolved}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #22c55e; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${tiTasksStats.resolved}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">Resueltas</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td align="center" style="padding: 10px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" style="height:70px;width:70px;v-text-anchor:middle;" arcsize="50%" fillcolor="#10b981" stroke="f">
                                    <w:anchorlock/>
                                    <center style="color:#ffffff;font-family:sans-serif;font-size:18px;font-weight:bold;">
                                      ${tiTasksStats.closed}
                                    </center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <!--[if !mso]><!-->
                                  <div style="width: 70px; height: 70px; background: #10b981; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                    ${tiTasksStats.closed}
                                  </div>
                                  <!--<![endif]-->
                                </td>
                              </tr>
                              <tr>
                                <td align="center" style="padding-top: 8px;">
                                  <span style="color: #6b7280; font-size: 12px;">Cerradas</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            ` : ''}
          </tr>
        </table>
      `;
    }

    // Generate summary HTML if enabled
    let summaryHtml = '';
    if (config.include_summary) {
      summaryHtml = `
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h3 style="color: #1e40af; margin: 0 0 15px 0;">📋 Resumen Ejecutivo</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            ${config.report_type === 'tickets' || config.report_type === 'both' ? `
              <div>
                <strong style="color: #1f2937;">Tickets Total:</strong>
                <p style="margin: 5px 0; color: #374151; font-size: 18px; font-weight: bold;">${ticketsStats.total}</p>
              </div>
            ` : ''}
            ${config.report_type === 'ti_tasks' || config.report_type === 'both' ? `
              <div>
                <strong style="color: #1f2937;">Tareas TI Total:</strong>
                <p style="margin: 5px 0; color: #374151; font-size: 18px; font-weight: bold;">${tiTasksStats.total}</p>
              </div>
            ` : ''}
            <div>
              <strong style="color: #1f2937;">Período:</strong>
              <p style="margin: 5px 0; color: #374151;">${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        </div>
      `;
    }

    // Create professional HTML report
    const reportHtml = `
      <!DOCTYPE html>
      <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
          <title>Reporte de Gestión - ${config.name}</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; line-height: 1.6;">
          <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
              <h1 style="color: #1e40af; margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">📊 REPORTE DE GESTIÓN</h1>
              <h2 style="color: #475569; margin: 0 0 5px 0; font-size: 20px; font-weight: 400;">${config.name}</h2>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Generado el ${new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} a las ${new Date().toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</p>
            </div>

            <!-- Summary Section -->
            ${summaryHtml}

            <!-- Charts Section -->
            ${chartsHtml}

            <!-- Tickets Section -->
            ${config.report_type === 'tickets' || config.report_type === 'both' ? `
              <div style="margin: 40px 0;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 25px; font-size: 22px;">🎫 Tickets ${config.include_status_filter ? '(Filtrado por Estado)' : ''}</h2>
                ${ticketsData.length > 0 ? `
                  <div style="background: #f9fafb; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background: #f1f5f9;">
                          <th style="padding: 15px; text-align: left; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Código</th>
                          <th style="padding: 15px; text-align: left; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Asunto</th>
                          <th style="padding: 15px; text-align: center; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Estado</th>
                          <th style="padding: 15px; text-align: center; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Prioridad</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${ticketsData.slice(0, 10).map((ticket: any, index: number) => `
                          <tr style="background: ${index % 2 === 0 ? 'white' : '#f8fafc'};">
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9;">
                              <strong style="color: #1e40af;">${ticket.code}</strong>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9;">
                              <div style="color: #374151; font-weight: 500;">${ticket.subject}</div>
                              <small style="color: #6b7280;">${ticket.requester} - ${ticket.requester_area || 'Sin área'}</small>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                              <span style="background: ${getStatusColor(ticket.status)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                ${ticket.status}
                              </span>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                              <span style="background: ${getPriorityColor(ticket.priority)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                                ${ticket.priority}
                              </span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    ${ticketsData.length > 10 ? `
                      <div style="padding: 15px; background: #f8fafc; text-align: center; color: #6b7280; font-size: 14px;">
                        ... y ${ticketsData.length - 10} ticket(s) más
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <div style="text-align: center; padding: 40px; color: #6b7280; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 16px;">📭 No hay tickets en el período seleccionado</p>
                  </div>
                `}
              </div>
            ` : ''}

            <!-- TI Tasks Section -->
            ${config.report_type === 'ti_tasks' || config.report_type === 'both' ? `
              <div style="margin: 40px 0;">
                <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 25px; font-size: 22px;">⚙️ Tareas TI ${config.include_status_filter ? '(Filtrado por Estado)' : ''}</h2>
                ${tiTasksData.length > 0 ? `
                  <div style="background: #f9fafb; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background: #f1f5f9;">
                          <th style="padding: 15px; text-align: left; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Código</th>
                          <th style="padding: 15px; text-align: left; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Asunto</th>
                          <th style="padding: 15px; text-align: center; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Estado</th>  
                          <th style="padding: 15px; text-align: center; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">Prioridad</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tiTasksData.slice(0, 10).map((task: any, index: number) => `
                          <tr style="background: ${index % 2 === 0 ? 'white' : '#f8fafc'};">
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9;">
                              <strong style="color: #7c3aed;">${task.code}</strong>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9;">
                              <div style="color: #374151; font-weight: 500;">${task.subject}</div>
                              <small style="color: #6b7280;">${task.area || 'Sin área'} - ${task.category}</small>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                              <span style="background: ${getStatusColor(task.status)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                ${task.status}
                              </span>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; text-align: center;">
                              <span style="background: ${getPriorityColor(task.priority)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize;">
                                ${task.priority}
                              </span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    ${tiTasksData.length > 10 ? `
                      <div style="padding: 15px; background: #f8fafc; text-align: center; color: #6b7280; font-size: 14px;">
                        ... y ${tiTasksData.length - 10} tarea(s) más
                      </div>
                    ` : ''}
                  </div>
                ` : `
                  <div style="text-align: center; padding: 40px; color: #6b7280; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-size: 16px;">📭 No hay tareas TI en el período seleccionado</p>
                  </div>
                `}
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="border-top: 2px solid #e5e7eb; padding-top: 30px; margin-top: 50px; text-align: center;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div style="color: #64748b; font-size: 14px;">
                  <strong style="color: #1e40af;">Sistema de Gestión Livigui</strong><br>
                  Reporte generado automáticamente
                </div>
                <div style="color: #64748b; font-size: 12px; text-align: right;">
                  <div>Configuración: <strong>${config.name}</strong></div>
                  <div>Frecuencia: <strong>${config.frequency}</strong></div>
                  <div>Período: <strong>${config.period_type}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send professional report email to all recipients
    const emailPromises = config.recipient_emails.map(async (email: string) => {
      return resend.emails.send({
        from: "Soporte Livigui <soporte@livigui.com>",
        to: [email],
        subject: `📊 ${config.name} - ${new Date().toLocaleDateString('es-ES')}`,
        html: reportHtml,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    
    // Check if all emails were sent successfully
    const successfulEmails = emailResults.filter(result => result.status === 'fulfilled').length;
    const failedEmails = emailResults.filter(result => result.status === 'rejected');

    if (failedEmails.length > 0) {
      console.error("Some emails failed:", failedEmails);
    }

    console.log(`Professional report emails sent: ${successfulEmails}/${config.recipient_emails.length}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Reporte profesional enviado a ${successfulEmails} destinatario(s)`,
      recipients: config.recipient_emails,
      successfulEmails,
      totalEmails: config.recipient_emails.length,
      reportData: {
        ticketsCount: ticketsStats.total,
        tiTasksCount: tiTasksStats.total,
        period: `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in test-automatic-report function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);