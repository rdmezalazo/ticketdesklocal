import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TiTaskWithActivities } from '@/types/tiTask';
import { TiTaskForm } from './TiTaskForm';
import { ActivityManager } from './ActivityManager';
import { TiTaskGanttChart } from './TiTaskGanttChart';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { FileText, Activity, Info, Calendar } from 'lucide-react';

interface TiTaskManagementModalProps {
  task: TiTaskWithActivities | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TiTaskManagementModal({ 
  task, 
  isOpen, 
  onClose, 
  onTaskUpdated 
}: TiTaskManagementModalProps) {
  const { hasAccess } = useUserPermissions();
  const isAdmin = hasAccess('ti-tasks');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('info');
    }
  }, [isOpen, task?.id]);

  if (!task) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold">
                {task.subject}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {task.code}
                </Badge>
                <Badge className={getStatusColor(task.status)} variant="outline">
                  {task.status === 'open' && 'Abierta'}
                  {task.status === 'in_progress' && 'En Progreso'}
                  {task.status === 'resolved' && 'Resuelta'}
                  {task.status === 'closed' && 'Cerrada'}
                </Badge>
                <Badge className={getPriorityColor(task.priority)} variant="outline">
                  {task.priority === 'low' && 'Baja'}
                  {task.priority === 'medium' && 'Media'}
                  {task.priority === 'high' && 'Alta'}
                  {task.priority === 'critical' && 'Crítica'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-3 border-b">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="info" className="flex items-center gap-1 text-sm">
                <Info className="h-3 w-3" />
                <span className="hidden sm:inline">Información</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="activities" className="flex items-center gap-1 text-sm">
                <Activity className="h-3 w-3" />
                <span className="hidden sm:inline">Actividades</span>
                <span className="sm:hidden">Act.</span>
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                <span className="hidden sm:inline">Cronograma</span>
                <span className="sm:hidden">Cron.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            <TabsContent value="info" className="mt-0 h-full">
              <ScrollArea className="h-[calc(85vh-150px)]">
                <div className="p-4">
                  <TiTaskForm 
                    task={task} 
                    isAdmin={isAdmin}
                    onTaskUpdated={onTaskUpdated}
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activities" className="mt-0 h-full">
              <div className="h-[calc(85vh-150px)]">
                <ActivityManager 
                  taskId={task.id}
                  isAdmin={isAdmin}
                />
              </div>
            </TabsContent>

            <TabsContent value="gantt" className="mt-0 h-full">
              <ScrollArea className="h-[calc(85vh-150px)]">
                <div className="p-4">
                  <TiTaskGanttChart
                    taskId={task.id}
                    taskTitle={task.subject}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}