import React, { useState } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/DatePickerWithRange";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileBarChart, Wrench, Ticket as TicketIcon, FileText, FileType } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTickets } from "@/hooks/useTickets";
import { useTiTasks } from "@/hooks/useTiTasks";
import { useGeneralReportConfig } from "@/hooks/useGeneralReportConfig";
import { useSettings } from "@/hooks/useSettings";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { TicketTableView } from "@/components/TicketTableView";
import { TiTaskTableView } from "@/components/TiTaskTableView";
import { TicketDetailModal } from "@/components/TicketDetailModal";
import { TiTaskManagementModal } from "@/components/titask/TiTaskManagementModal";
import { Ticket } from "@/types/ticket";
import { TiTaskWithActivities } from "@/types/tiTask";
import { TiTasksGanttReport } from "@/components/TiTasksGanttReport";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

export default function DataReports() {
  const { tickets } = useTickets();
  const { tiTasks } = useTiTasks();
  const { config: reportConfig } = useGeneralReportConfig();
  const { systemAreas } = useSettings();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTiTask, setSelectedTiTask] = useState<TiTaskWithActivities | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [tiTaskStatusFilter, setTiTaskStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productivityFilter, setProductivityFilter] = useState<string>('all');

  // Function to get date range based on selected period
  const getDateRangeFromPeriod = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'week':
        return { from: startOfWeek(now), to: endOfWeek(now) };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'quarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'year':
        return { from: startOfYear(now), to: endOfYear(now) };
      default:
        return null;
    }
  };

  // Function to filter data by date
  const filterByDate = (items: any[], dateField: string) => {
    if (!items) return [];
    
    let effectiveDateRange = dateRange;
    
    // If no custom date range is selected, use period-based range
    if (!effectiveDateRange && selectedPeriod !== 'all') {
      effectiveDateRange = getDateRangeFromPeriod(selectedPeriod);
    }
    
    if (!effectiveDateRange || !effectiveDateRange.from) {
      return items;
    }
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      const from = effectiveDateRange!.from!;
      const to = effectiveDateRange!.to || effectiveDateRange!.from!;
      
      return isWithinInterval(itemDate, { start: from, end: to });
    });
  };

  // Function to evaluate productivity based on due dates and activities
  const evaluateProductivity = (item: any, type: 'ticket' | 'titask') => {
    if (type === 'ticket') {
      // For tickets, check if activities are completed within due dates
      const activities = item.activities || [];
      if (activities.length === 0) return 'sin-actividades';
      
      const completedOnTime = activities.filter((activity: any) => {
        if (!activity.completed || !activity.due_date) return false;
        const dueDate = new Date(activity.due_date);
        const completedDate = activity.completed_at ? new Date(activity.completed_at) : new Date();
        return completedDate <= dueDate;
      }).length;
      
      const completedLate = activities.filter((activity: any) => {
        if (!activity.completed || !activity.due_date) return false;
        const dueDate = new Date(activity.due_date);
        const completedDate = activity.completed_at ? new Date(activity.completed_at) : new Date();
        return completedDate > dueDate;
      }).length;
      
      if (completedOnTime > completedLate) return 'alta';
      if (completedLate > completedOnTime) return 'baja';
      return 'media';
    } else {
      // For TI tasks, similar logic
      const activities = item.activities || [];
      if (activities.length === 0) return 'sin-actividades';
      
      const completedOnTime = activities.filter((activity: any) => {
        if (!activity.completed || !activity.due_date) return false;
        const dueDate = new Date(activity.due_date);
        const completedDate = activity.completed_at ? new Date(activity.completed_at) : new Date();
        return completedDate <= dueDate;
      }).length;
      
      const completedLate = activities.filter((activity: any) => {
        if (!activity.completed || !activity.due_date) return false;
        const dueDate = new Date(activity.due_date);
        const completedDate = activity.completed_at ? new Date(activity.completed_at) : new Date();
        return completedDate > dueDate;
      }).length;
      
      if (completedOnTime > completedLate) return 'alta';
      if (completedLate > completedOnTime) return 'baja';
      return 'media';
    }
  };

  // Apply filters to tickets and tiTasks
  const filteredTickets = filterByDate(tickets || [], 'createdAt').filter(ticket => {
    if (ticketStatusFilter !== 'all' && ticket.status !== ticketStatusFilter) return false;
    if (areaFilter !== 'all' && ticket.requesterArea !== areaFilter) return false;
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
    if (productivityFilter !== 'all') {
      const productivity = evaluateProductivity(ticket, 'ticket');
      if (productivity !== productivityFilter) return false;
    }
    return true;
  });
  
  const filteredTiTasks = filterByDate(tiTasks || [], 'created_at').filter(task => {
    if (tiTaskStatusFilter !== 'all' && task.status !== tiTaskStatusFilter) return false;
    if (areaFilter !== 'all' && task.area !== areaFilter) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    if (productivityFilter !== 'all') {
      const productivity = evaluateProductivity(task, 'titask');
      if (productivity !== productivityFilter) return false;
    }
    return true;
  });

  // Use configured system areas instead of extracting from data
  const uniqueAreas = systemAreas?.filter(area => area.is_active).map(area => area.name).sort() || [];

  // Only use the specified categories
  const allowedCategories = [
    'Circuito de Cámaras',
    'Desarrollo', 
    'ERP',
    'Incidencia General'
  ];

  const uniqueCategories = allowedCategories;

  // Handlers for viewing tickets and tasks
  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleViewTiTask = (task: TiTaskWithActivities) => {
    setSelectedTiTask(task);
  };

  // Handlers for clicking on stat cards
  const handleTicketStatClick = (status: string) => {
    setTicketStatusFilter(status);
  };

  const handleTiTaskStatClick = (status: string) => {
    setTiTaskStatusFilter(status);
  };

  // Export functions
  const exportTicketsToCSV = () => {
    const ticketData = filteredTickets?.map(ticket => ({
      codigo: ticket.code,
      titulo: ticket.subject,
      estado: ticket.status,
      prioridad: ticket.priority,
      categoria: ticket.category,
      solicitante: ticket.requester,
      area: ticket.requesterArea,
      sede: ticket.requesterSede,
      fechaCreacion: format(new Date(ticket.createdAt), 'dd/MM/yyyy', { locale: es }),
      progreso: ticket.activitiesProgressAvg || 0
    })) || [];
    exportToCSV(ticketData, 'tickets-report');
  };

  const exportTiTasksToCSV = () => {
    const tiTaskData = filteredTiTasks?.map(task => ({
      codigo: task.code,
      titulo: task.subject,
      estado: task.status,
      prioridad: task.priority,
      categoria: task.category,
      asignado: task.assignee,
      area: task.area,
      sede: task.sede,
      fechaCreacion: format(new Date(task.created_at), 'dd/MM/yyyy', { locale: es }),
      progreso: task.activities_progress_avg || 0
    })) || [];
    exportToCSV(tiTaskData, 'titasks-report');
  };

  // Datos para gráficos de tickets filtrados
  const ticketStatusData = {
    labels: ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'],
    datasets: [
      {
        label: 'Tickets por Estado',
        data: [
          filteredTickets?.filter(t => t.status === 'open').length || 0,
          filteredTickets?.filter(t => t.status === 'in_progress').length || 0,
          filteredTickets?.filter(t => t.status === 'resolved').length || 0,
          filteredTickets?.filter(t => t.status === 'closed').length || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(107, 114, 128, 0.6)'
        ]
      }
    ]
  };

  const ticketPriorityData = {
    labels: ['Baja', 'Media', 'Alta', 'Crítica'],
    datasets: [
      {
        label: 'Tickets por Prioridad',
        data: [
          filteredTickets?.filter(t => t.priority === 'low').length || 0,
          filteredTickets?.filter(t => t.priority === 'medium').length || 0,
          filteredTickets?.filter(t => t.priority === 'high').length || 0,
          filteredTickets?.filter(t => t.priority === 'critical').length || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de tickets por áreas
  const ticketAreasData = {
    labels: uniqueAreas.length > 0 ? uniqueAreas : ['Sin áreas'],
    datasets: [
      {
        label: 'Tickets por Área',
        data: uniqueAreas.length > 0 
          ? uniqueAreas.map(area => filteredTickets?.filter(t => t.requesterArea === area).length || 0)
          : [0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(156, 163, 175, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de tickets por categorías
  const ticketCategoriesData = {
    labels: uniqueCategories,
    datasets: [
      {
        label: 'Tickets por Categoría',
        data: uniqueCategories.map(category => filteredTickets?.filter(t => t.category === category).length || 0),
        backgroundColor: [
          'rgba(14, 165, 233, 0.6)',
          'rgba(139, 69, 19, 0.6)',
          'rgba(220, 38, 127, 0.6)',
          'rgba(5, 150, 105, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de tickets por productividad
  const ticketProductivityData = {
    labels: ['Alta', 'Media', 'Baja', 'Sin actividades'],
    datasets: [
      {
        label: 'Tickets por Productividad',
        data: [
          filteredTickets?.filter(t => evaluateProductivity(t, 'ticket') === 'alta').length || 0,
          filteredTickets?.filter(t => evaluateProductivity(t, 'ticket') === 'media').length || 0,
          filteredTickets?.filter(t => evaluateProductivity(t, 'ticket') === 'baja').length || 0,
          filteredTickets?.filter(t => evaluateProductivity(t, 'ticket') === 'sin-actividades').length || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(156, 163, 175, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de tickets pendientes por áreas
  const ticketPendingData = {
    labels: uniqueAreas.length > 0 ? uniqueAreas : ['Sin áreas'],
    datasets: [
      {
        label: 'Tickets Pendientes por Área',
        data: uniqueAreas.length > 0 
          ? uniqueAreas.map(area => 
              filteredTickets?.filter(t => 
                t.requesterArea === area && 
                (t.status === 'open' || t.status === 'in_progress')
              ).length || 0
            )
          : [0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(156, 163, 175, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de TI Tasks
  const tiTaskStatusData = {
    labels: ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'],
    datasets: [
      {
        label: 'Tareas TI por Estado',
        data: [
          filteredTiTasks?.filter(t => t.status === 'open').length || 0,
          filteredTiTasks?.filter(t => t.status === 'in_progress').length || 0,
          filteredTiTasks?.filter(t => t.status === 'resolved').length || 0,
          filteredTiTasks?.filter(t => t.status === 'closed').length || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(107, 114, 128, 0.6)'
        ]
      }
    ]
  };

  const tiTaskPriorityData = {
    labels: ['Baja', 'Media', 'Alta', 'Crítica'],
    datasets: [
      {
        label: 'Tareas TI por Prioridad',
        data: [
          filteredTiTasks?.filter(t => t.priority === 'low').length || 0,
          filteredTiTasks?.filter(t => t.priority === 'medium').length || 0,
          filteredTiTasks?.filter(t => t.priority === 'high').length || 0,
          filteredTiTasks?.filter(t => t.priority === 'critical').length || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de TI Tasks por áreas
  const tiTaskAreasData = {
    labels: uniqueAreas.length > 0 ? uniqueAreas : ['Sin áreas'],
    datasets: [
      {
        label: 'Tareas TI por Área',
        data: uniqueAreas.length > 0 
          ? uniqueAreas.map(area => filteredTiTasks?.filter(t => t.area === area).length || 0)
          : [0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(156, 163, 175, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de TI Tasks por categorías
  const tiTaskCategoriesData = {
    labels: uniqueCategories,
    datasets: [
      {
        label: 'Tareas TI por Categoría',
        data: uniqueCategories.map(category => filteredTiTasks?.filter(t => t.category === category).length || 0),
        backgroundColor: [
          'rgba(14, 165, 233, 0.6)',
          'rgba(139, 69, 19, 0.6)',
          'rgba(220, 38, 127, 0.6)',
          'rgba(5, 150, 105, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de TI Tasks por productividad
  const tiTaskProductivityData = {
    labels: ['Alta', 'Media', 'Baja', 'Sin actividades'],
    datasets: [
      {
        label: 'Tareas TI por Productividad',
        data: [
          filteredTiTasks?.filter(t => evaluateProductivity(t, 'titask') === 'alta').length || 0,
          filteredTiTasks?.filter(t => evaluateProductivity(t, 'titask') === 'media').length || 0,
          filteredTiTasks?.filter(t => evaluateProductivity(t, 'titask') === 'baja').length || 0,
          filteredTiTasks?.filter(t => evaluateProductivity(t, 'titask') === 'sin-actividades').length || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(251, 191, 36, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(156, 163, 175, 0.6)'
        ]
      }
    ]
  };

  // Datos para gráficos de TI Tasks pendientes por áreas
  const tiTaskPendingData = {
    labels: uniqueAreas.length > 0 ? uniqueAreas : ['Sin áreas'],
    datasets: [
      {
        label: 'Tareas TI Pendientes por Área',
        data: uniqueAreas.length > 0 
          ? uniqueAreas.map(area => 
              filteredTiTasks?.filter(t => 
                t.area === area && 
                (t.status === 'open' || t.status === 'in_progress')
              ).length || 0
            )
          : [0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.6)',
          'rgba(168, 85, 247, 0.6)',
          'rgba(236, 72, 153, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(156, 163, 175, 0.6)'
        ]
      }
    ]
  };

  // Function to get effective date range for display
  const getEffectiveDateRange = () => {
    let effectiveDateRange = dateRange;
    
    if (!effectiveDateRange && selectedPeriod !== 'all') {
      effectiveDateRange = getDateRangeFromPeriod(selectedPeriod);
    }
    
    return effectiveDateRange;
  };

  // Function to format date range subtitle
  const getDateRangeSubtitle = () => {
    const effectiveDateRange = getEffectiveDateRange();
    
    if (!effectiveDateRange || !effectiveDateRange.from) {
      return 'Todos los períodos';
    }
    
    const fromDate = format(effectiveDateRange.from, 'dd/MMM', { locale: es });
    const toDate = effectiveDateRange.to 
      ? format(effectiveDateRange.to, 'dd/MMM', { locale: es })
      : fromDate;
    
    return `del ${fromDate} al ${toDate}`;
  };

  // Function to render chart based on configured type
  const renderChart = (data: any, type: 'pie' | 'bar' | 'area' | 'line', options: any) => {
    // Adjust legend position for bar, area and line charts
    const chartOptions = (type === 'bar' || type === 'area' || type === 'line') 
      ? { ...options, plugins: { ...options.plugins, legend: { ...options.plugins.legend, position: 'bottom' as const } } }
      : options;

    switch (type) {
      case 'pie':
        return <Pie data={data} options={chartOptions} />;
      case 'bar':
        return <Bar data={data} options={chartOptions} />;
      case 'area':
        return <Line data={{
          ...data,
          datasets: data.datasets.map((dataset: any) => ({
            ...dataset,
            fill: true,
            tension: 0.4
          }))
        }} options={chartOptions} />;
      case 'line':
        return <Line data={{
          ...data,
          datasets: data.datasets.map((dataset: any) => ({
            ...dataset,
            fill: false,
            tension: 0.4
          }))
        }} options={chartOptions} />;
      default:
        return <Bar data={data} options={chartOptions} />;
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Gestión - ${format(new Date(), 'dd/MM/yyyy', { locale: es })}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; padding: 2rem; background: #f9fafb; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { color: #1f2937; margin-bottom: 0.5rem; font-size: 2rem; }
    .subtitle { color: #6b7280; margin-bottom: 2rem; }
    .filters { background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    .filters h2 { font-size: 1.25rem; margin-bottom: 1rem; color: #374151; }
    .filter-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    select, input { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: 0.875rem; }
    .tabs { display: flex; gap: 0.5rem; margin-bottom: 2rem; border-bottom: 2px solid #e5e7eb; }
    .tab { padding: 0.75rem 1.5rem; cursor: pointer; border: none; background: none; font-size: 1rem; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; font-weight: 600; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .stat-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
    .stat-label { color: #6b7280; font-size: 0.875rem; }
    .charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .chart-card { background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .chart-card h3 { margin-bottom: 0.5rem; color: #374151; font-size: 1.125rem; }
    .chart-subtitle { color: #9ca3af; font-size: 0.75rem; margin-bottom: 1rem; }
    .chart-container { height: 300px; position: relative; }
    table { width: 100%; background: white; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    th { background: #f3f4f6; padding: 0.75rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; }
    td { padding: 0.75rem; border-bottom: 1px solid #f3f4f6; }
    tr:hover { background: #f9fafb; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-gray { background: #f3f4f6; color: #374151; }
    @media print { body { background: white; } .filters { page-break-after: always; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Reportes de Gestión</h1>
    <p class="subtitle">Análisis detallado de tickets y tareas de TI - Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
    
    <div class="filters">
      <h2>Filtros de Reporte</h2>
      <div class="filter-row">
        <select id="periodFilter" onchange="applyFilters()">
          <option value="all">Todo el tiempo</option>
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="quarter">Este trimestre</option>
          <option value="year">Este año</option>
        </select>
        <select id="areaFilter" onchange="applyFilters()">
          <option value="all">Todas las áreas</option>
          ${uniqueAreas.map(area => `<option value="${area}">${area}</option>`).join('')}
        </select>
        <select id="categoryFilter" onchange="applyFilters()">
          <option value="all">Todas las categorías</option>
          ${uniqueCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>
        <select id="productivityFilter" onchange="applyFilters()">
          <option value="all">Toda la productividad</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
          <option value="sin-actividades">Sin actividades</option>
        </select>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="switchTab('tickets')">🎫 Reportes de Tickets</button>
      <button class="tab" onclick="switchTab('titasks')">🔧 Reportes de TI Tasks</button>
    </div>

    <div id="tickets-tab" class="tab-content active">
      <div class="stats" id="tickets-stats"></div>
      <div class="charts" id="tickets-charts"></div>
      <div id="tickets-table"></div>
    </div>

    <div id="titasks-tab" class="tab-content">
      <div class="stats" id="titasks-stats"></div>
      <div class="charts" id="titasks-charts"></div>
      <div id="titasks-table"></div>
    </div>
  </div>

  <script>
    // Embedded data
    const ticketsData = ${JSON.stringify(filteredTickets?.map(t => ({ 
      ...t, 
      createdAt: t.createdAt,
      activities: t.activities || []
    })) || [])};
    
    const tiTasksData = ${JSON.stringify(filteredTiTasks?.map(t => ({ 
      ...t, 
      created_at: t.created_at,
      activities: t.activities || []
    })) || [])};

    let filteredTickets = [...ticketsData];
    let filteredTiTasks = [...tiTasksData];

    Chart.register(ChartDataLabels);

    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    }

    function evaluateProductivity(item, type) {
      const activities = item.activities || [];
      if (activities.length === 0) return 'sin-actividades';
      
      const completedOnTime = activities.filter(a => {
        if (!a.completed || !a.due_date) return false;
        const dueDate = new Date(a.due_date);
        const completedDate = a.completed_at ? new Date(a.completed_at) : new Date();
        return completedDate <= dueDate;
      }).length;
      
      const completedLate = activities.filter(a => {
        if (!a.completed || !a.due_date) return false;
        const dueDate = new Date(a.due_date);
        const completedDate = a.completed_at ? new Date(a.completed_at) : new Date();
        return completedDate > dueDate;
      }).length;
      
      if (completedOnTime > completedLate) return 'alta';
      if (completedLate > completedOnTime) return 'baja';
      return 'media';
    }

    function applyFilters() {
      const period = document.getElementById('periodFilter').value;
      const area = document.getElementById('areaFilter').value;
      const category = document.getElementById('categoryFilter').value;
      const productivity = document.getElementById('productivityFilter').value;

      filteredTickets = ticketsData.filter(ticket => {
        if (area !== 'all' && ticket.requesterArea !== area) return false;
        if (category !== 'all' && ticket.category !== category) return false;
        if (productivity !== 'all' && evaluateProductivity(ticket, 'ticket') !== productivity) return false;
        return true;
      });

      filteredTiTasks = tiTasksData.filter(task => {
        if (area !== 'all' && task.area !== area) return false;
        if (category !== 'all' && task.category !== category) return false;
        if (productivity !== 'all' && evaluateProductivity(task, 'titask') !== productivity) return false;
        return true;
      });

      renderCharts();
      renderTables();
      renderStats();
    }

    function renderStats() {
      const ticketsStats = document.getElementById('tickets-stats');
      ticketsStats.innerHTML = \`
        <div class="stat-card"><div class="stat-value" style="color: #3b82f6;">\${filteredTickets.length}</div><div class="stat-label">Total Tickets</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #3b82f6;">\${filteredTickets.filter(t => t.status === 'open').length}</div><div class="stat-label">Abiertos</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #f59e0b;">\${filteredTickets.filter(t => t.status === 'in_progress').length}</div><div class="stat-label">En Progreso</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #10b981;">\${filteredTickets.filter(t => t.status === 'resolved').length}</div><div class="stat-label">Resueltos</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #6b7280;">\${filteredTickets.filter(t => t.status === 'closed').length}</div><div class="stat-label">Cerrados</div></div>
      \`;

      const tiTasksStats = document.getElementById('titasks-stats');
      tiTasksStats.innerHTML = \`
        <div class="stat-card"><div class="stat-value" style="color: #3b82f6;">\${filteredTiTasks.length}</div><div class="stat-label">Total Tareas TI</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #3b82f6;">\${filteredTiTasks.filter(t => t.status === 'open').length}</div><div class="stat-label">Abiertos</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #f59e0b;">\${filteredTiTasks.filter(t => t.status === 'in_progress').length}</div><div class="stat-label">En Progreso</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #10b981;">\${filteredTiTasks.filter(t => t.status === 'resolved').length}</div><div class="stat-label">Resueltos</div></div>
        <div class="stat-card"><div class="stat-value" style="color: #6b7280;">\${filteredTiTasks.filter(t => t.status === 'closed').length}</div><div class="stat-label">Cerrados</div></div>
      \`;
    }

    function renderCharts() {
      const ticketsCharts = document.getElementById('tickets-charts');
      ticketsCharts.innerHTML = \`
        <div class="chart-card">
          <h3>Tickets por Estado</h3>
          <div class="chart-container"><canvas id="ticket-status-chart"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Tickets por Prioridad</h3>
          <div class="chart-container"><canvas id="ticket-priority-chart"></canvas></div>
        </div>
      \`;

      const tiTasksCharts = document.getElementById('titasks-charts');
      tiTasksCharts.innerHTML = \`
        <div class="chart-card">
          <h3>Tareas TI por Estado</h3>
          <div class="chart-container"><canvas id="titask-status-chart"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Tareas TI por Prioridad</h3>
          <div class="chart-container"><canvas id="titask-priority-chart"></canvas></div>
        </div>
      \`;

      new Chart(document.getElementById('ticket-status-chart'), {
        type: 'pie',
        data: {
          labels: ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'],
          datasets: [{
            data: [
              filteredTickets.filter(t => t.status === 'open').length,
              filteredTickets.filter(t => t.status === 'in_progress').length,
              filteredTickets.filter(t => t.status === 'resolved').length,
              filteredTickets.filter(t => t.status === 'closed').length
            ],
            backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(107, 114, 128, 0.8)']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: 'white', font: { weight: 'bold', size: 14 } } } }
      });

      new Chart(document.getElementById('ticket-priority-chart'), {
        type: 'bar',
        data: {
          labels: ['Baja', 'Media', 'Alta', 'Crítica'],
          datasets: [{
            label: 'Tickets',
            data: [
              filteredTickets.filter(t => t.priority === 'low').length,
              filteredTickets.filter(t => t.priority === 'medium').length,
              filteredTickets.filter(t => t.priority === 'high').length,
              filteredTickets.filter(t => t.priority === 'critical').length
            ],
            backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(239, 68, 68, 0.8)']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : '', color: '#000' } } }
      });

      new Chart(document.getElementById('titask-status-chart'), {
        type: 'pie',
        data: {
          labels: ['Abierto', 'En Progreso', 'Resuelto', 'Cerrado'],
          datasets: [{
            data: [
              filteredTiTasks.filter(t => t.status === 'open').length,
              filteredTiTasks.filter(t => t.status === 'in_progress').length,
              filteredTiTasks.filter(t => t.status === 'resolved').length,
              filteredTiTasks.filter(t => t.status === 'closed').length
            ],
            backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(107, 114, 128, 0.8)']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: 'white', font: { weight: 'bold', size: 14 } } } }
      });

      new Chart(document.getElementById('titask-priority-chart'), {
        type: 'bar',
        data: {
          labels: ['Baja', 'Media', 'Alta', 'Crítica'],
          datasets: [{
            label: 'Tareas TI',
            data: [
              filteredTiTasks.filter(t => t.priority === 'low').length,
              filteredTiTasks.filter(t => t.priority === 'medium').length,
              filteredTiTasks.filter(t => t.priority === 'high').length,
              filteredTiTasks.filter(t => t.priority === 'critical').length
            ],
            backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(251, 191, 36, 0.8)', 'rgba(249, 115, 22, 0.8)', 'rgba(239, 68, 68, 0.8)']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', formatter: (v) => v > 0 ? v : '', color: '#000' } } }
      });
    }

    function renderTables() {
      const ticketsTable = document.getElementById('tickets-table');
      ticketsTable.innerHTML = \`
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Categoría</th>
              <th>Área</th>
            </tr>
          </thead>
          <tbody>
            \${filteredTickets.slice(0, 50).map(t => \`
              <tr>
                <td>\${t.code}</td>
                <td>\${t.subject}</td>
                <td><span class="badge badge-blue">\${t.status === 'open' ? 'Abierto' : t.status === 'in_progress' ? 'En Progreso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}</span></td>
                <td><span class="badge badge-\${t.priority === 'critical' ? 'red' : t.priority === 'high' ? 'yellow' : 'green'}">\${t.priority === 'low' ? 'Baja' : t.priority === 'medium' ? 'Media' : t.priority === 'high' ? 'Alta' : 'Crítica'}</span></td>
                <td>\${t.category}</td>
                <td>\${t.requesterArea || '-'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;

      const tiTasksTable = document.getElementById('titasks-table');
      tiTasksTable.innerHTML = \`
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Categoría</th>
              <th>Área</th>
            </tr>
          </thead>
          <tbody>
            \${filteredTiTasks.slice(0, 50).map(t => \`
              <tr>
                <td>\${t.code}</td>
                <td>\${t.subject}</td>
                <td><span class="badge badge-blue">\${t.status === 'open' ? 'Abierto' : t.status === 'in_progress' ? 'En Progreso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}</span></td>
                <td><span class="badge badge-\${t.priority === 'critical' ? 'red' : t.priority === 'high' ? 'yellow' : 'green'}">\${t.priority === 'low' ? 'Baja' : t.priority === 'medium' ? 'Media' : t.priority === 'high' ? 'Alta' : 'Crítica'}</span></td>
                <td>\${t.category}</td>
                <td>\${t.area || '-'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;
    }

    renderStats();
    renderCharts();
    renderTables();
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-gestion-${format(new Date(), 'yyyy-MM-dd')}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    const element = document.querySelector('.container');
    if (!element) return;

    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`reporte-gestion-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        formatter: (value: number) => value > 0 ? value.toString() : '',
        font: {
          weight: 'bold' as const,
        },
        color: 'rgba(0, 0, 0, 0.8)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      datalabels: {
        formatter: (value: number) => value > 0 ? value.toString() : '',
        color: 'white',
        font: {
          weight: 'bold' as const,
          size: 14,
        },
      },
    },
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-primary" />
            Reportes de Gestión
          </h1>
          <p className="text-muted-foreground mt-1">
            Análisis detallado de tickets y tareas de TI
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Reporte</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {reportConfig.filters.dates && (
            <>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                </SelectContent>
              </Select>

              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
              />
            </>
          )}

          {reportConfig.filters.areas && (
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {uniqueAreas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {reportConfig.filters.categories && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {reportConfig.filters.productivity && (
            <Select value={productivityFilter} onValueChange={setProductivityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por productividad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la productividad</SelectItem>
                <SelectItem value="alta">Alta (cumple fechas límite)</SelectItem>
                <SelectItem value="media">Media (equilibrado)</SelectItem>
                <SelectItem value="baja">Baja (incumple fechas límite)</SelectItem>
                <SelectItem value="sin-actividades">Sin actividades</SelectItem>
              </SelectContent>
            </Select>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Todo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToHTML}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar como HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileType className="h-4 w-4 mr-2" />
                Exportar como PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4" />
            Reportes de Tickets
          </TabsTrigger>
          <TabsTrigger value="titasks" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Reportes de TI Tasks
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-6">
          {/* Estadísticas de Tickets */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${ticketStatusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTicketStatClick('all')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {filteredTickets?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${ticketStatusFilter === 'open' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTicketStatClick('open')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredTickets?.filter(t => t.status === 'open').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Abiertos</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${ticketStatusFilter === 'in_progress' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTicketStatClick('in_progress')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredTickets?.filter(t => t.status === 'in_progress').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${ticketStatusFilter === 'resolved' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTicketStatClick('resolved')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredTickets?.filter(t => t.status === 'resolved').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Resueltos</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${ticketStatusFilter === 'closed' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTicketStatClick('closed')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {filteredTickets?.filter(t => t.status === 'closed').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Cerrados</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Tickets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportConfig.ticketCharts.byStatus.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets por Estado</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(ticketStatusData, reportConfig.ticketCharts.byStatus.type, reportConfig.ticketCharts.byStatus.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.ticketCharts.byPriority.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets por Prioridad</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(ticketPriorityData, reportConfig.ticketCharts.byPriority.type, reportConfig.ticketCharts.byPriority.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.ticketCharts.byAreas.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets por Áreas</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(ticketAreasData, reportConfig.ticketCharts.byAreas.type, reportConfig.ticketCharts.byAreas.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.ticketCharts.byCategories.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets por Categorías</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(ticketCategoriesData, reportConfig.ticketCharts.byCategories.type, reportConfig.ticketCharts.byCategories.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.ticketCharts.byProductivity.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets por Productividad</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(ticketProductivityData, reportConfig.ticketCharts.byProductivity.type, reportConfig.ticketCharts.byProductivity.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.ticketCharts.byPending.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tickets Pendientes por Área</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Estados: Abierto e En Progreso - {getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(ticketPendingData, reportConfig.ticketCharts.byPending.type, reportConfig.ticketCharts.byPending.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabla de Tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalle de Tickets ({filteredTickets?.length || 0})</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportTicketsToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <TicketTableView
                tickets={filteredTickets || []}
                onViewTicket={handleViewTicket}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TI Tasks Tab */}
        <TabsContent value="titasks" className="space-y-6">
          {/* Estadísticas de TI Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${tiTaskStatusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTiTaskStatClick('all')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {filteredTiTasks?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Tareas TI</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${tiTaskStatusFilter === 'open' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTiTaskStatClick('open')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredTiTasks?.filter(t => t.status === 'open').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Abiertas</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${tiTaskStatusFilter === 'in_progress' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTiTaskStatClick('in_progress')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredTiTasks?.filter(t => t.status === 'in_progress').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${tiTaskStatusFilter === 'resolved' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTiTaskStatClick('resolved')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredTiTasks?.filter(t => t.status === 'resolved').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Resueltas</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={`cursor-pointer transition-all hover:scale-105 ${tiTaskStatusFilter === 'closed' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleTiTaskStatClick('closed')}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {filteredTiTasks?.filter(t => t.status === 'closed').length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Cerradas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Diagrama de Gantt de Tareas TI */}
          {reportConfig.tiTaskCharts.ganttChart?.enabled && (
            <TiTasksGanttReport 
              tiTasks={filteredTiTasks || []} 
              onViewTask={handleViewTiTask}
            />
          )}

          {/* Gráficos de TI Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportConfig.tiTaskCharts.byStatus.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tareas TI por Estado</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(tiTaskStatusData, reportConfig.tiTaskCharts.byStatus.type, reportConfig.tiTaskCharts.byStatus.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.tiTaskCharts.byPriority.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tareas TI por Prioridad</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(tiTaskPriorityData, reportConfig.tiTaskCharts.byPriority.type, reportConfig.tiTaskCharts.byPriority.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.tiTaskCharts.byAreas.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tareas TI por Áreas</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(tiTaskAreasData, reportConfig.tiTaskCharts.byAreas.type, reportConfig.tiTaskCharts.byAreas.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.tiTaskCharts.byCategories.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tareas TI por Categorías</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(tiTaskCategoriesData, reportConfig.tiTaskCharts.byCategories.type, reportConfig.tiTaskCharts.byCategories.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.tiTaskCharts.byProductivity.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tareas TI por Productividad</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(tiTaskProductivityData, reportConfig.tiTaskCharts.byProductivity.type, reportConfig.tiTaskCharts.byProductivity.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}

            {reportConfig.tiTaskCharts.byPending.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Tareas TI Pendientes por Área</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Estados: Abierto e En Progreso - {getDateRangeSubtitle()}</p>
                </CardHeader>
                <CardContent>
                  <div style={{ height: '300px' }}>
                    {renderChart(tiTaskPendingData, reportConfig.tiTaskCharts.byPending.type, reportConfig.tiTaskCharts.byPending.type === 'pie' ? pieOptions : chartOptions)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tabla de TI Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalle de Tareas TI ({filteredTiTasks?.length || 0})</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportTiTasksToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <TiTaskTableView
                tiTasks={filteredTiTasks || []}
                onViewTask={handleViewTiTask}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailModal
          open={true}
          onClose={() => setSelectedTicket(null)}
          ticket={selectedTicket}
          onUpdateTicket={() => {}}
        />
      )}

      {selectedTiTask && (
        <TiTaskManagementModal
          isOpen={true}
          onClose={() => setSelectedTiTask(null)}
          task={selectedTiTask}
        />
      )}
    </div>
  );
}