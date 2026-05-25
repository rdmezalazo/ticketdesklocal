import { useState, useEffect } from "react";
import { Calendar, CheckSquare, Plus, Trash2, Edit, Clock, X } from "lucide-react";
import { format, isToday } from "date-fns";
import { getTodayDateString, normalizeDateString, formatDateSafe, formatTimeTo12Hour, roundToNext15Minutes, addMinutesToTime, calculateDuration, formatDuration } from "@/utils/dateUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useTicketActivities, TicketActivity } from "@/hooks/useTicketActivities";
import { useAuth } from "@/hooks/useAuth";

const getActivityStatus = (progress: number) => {
  if (progress === 0) return { status: "Pendiente", variant: "secondary" as const };
  if (progress >= 1 && progress < 50) return { status: "En Progreso", variant: "outline" as const };
  if (progress >= 50 && progress < 85) return { status: "Por Terminar", variant: "default" as const };
  return { status: "Terminado", variant: "default" as const };
};

interface TicketActivitiesModalProps {
  ticket: {
    id: string;
    code: string;
    subject: string;
  };
  open: boolean;
  onClose: () => void;
}

export const TicketActivitiesModal = ({ ticket, open, onClose }: TicketActivitiesModalProps) => {
  const { activities, isLoading, addActivity, deleteActivity, toggleComplete, updateActivity } = useTicketActivities(ticket.id);
  const { user } = useAuth();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newStartDate, setNewStartDate] = useState<Date>();
  const [newStartTime, setNewStartTime] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date>();
  const [newEndTime, setNewEndTime] = useState("");
  const [newProgress, setNewProgress] = useState(0);
  const [duration, setDuration] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [durationIncrement, setDurationIncrement] = useState(15);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [editProgress, setEditProgress] = useState<{ [key: string]: number }>({});
  const [editingFullActivity, setEditingFullActivity] = useState<string | null>(null);
  const [editActivityData, setEditActivityData] = useState<{[key: string]: Partial<TicketActivity>}>({});

  // Initialize form with defaults when it opens
  useEffect(() => {
    if (showAddForm) {
      setDurationIncrement(15);
      
      const today = new Date();
      setNewStartDate(today);
      setNewDueDate(today);
      
      const roundedTime = roundToNext15Minutes();
      setNewStartTime(roundedTime);
      
      const endTime = addMinutesToTime(roundedTime, 15);
      setNewEndTime(endTime);
    }
  }, [showAddForm]);

  // Calculate duration when dates/times change
  useEffect(() => {
    if (newStartDate && newStartTime && newDueDate && newEndTime) {
      const startDateStr = format(newStartDate, "yyyy-MM-dd");
      const dueDateStr = format(newDueDate, "yyyy-MM-dd");
      const calc = calculateDuration(startDateStr, newStartTime, dueDateStr, newEndTime);
      setDuration(calc);
    } else {
      setDuration(null);
    }
  }, [newStartDate, newStartTime, newDueDate, newEndTime]);

  // Update end time when duration increment changes
  useEffect(() => {
    if (newStartTime && showAddForm) {
      const endTime = addMinutesToTime(newStartTime, durationIncrement);
      setNewEndTime(endTime);
    }
  }, [durationIncrement, newStartTime, showAddForm]);

  // Check if user is admin
  const isAdmin = user?.email === 'supervisorti@livigui.com';

  const handleAddActivity = async () => {
    if (!newDescription.trim() || !newDueDate || !newStartDate) return;

    // Use normalized date strings to ensure consistency
    const normalizedDueDate = normalizeDateString(format(newDueDate, "yyyy-MM-dd"));
    const normalizedStartDate = normalizeDateString(format(newStartDate, "yyyy-MM-dd"));
    
    console.log('🎯 TicketActivitiesModal - Adding activity:', {
      startDate: normalizedStartDate,
      startTime: newStartTime,
      dueDate: normalizedDueDate,
      endTime: newEndTime,
      duration: duration,
      description: newDescription
    });

    await addActivity(
      ticket.id,
      newDescription,
      normalizedDueDate,
      newProgress,
      newEndTime || undefined,
      normalizedStartDate,
      newStartTime || undefined,
      duration?.days || undefined
    );

    setNewDescription("");
    setNewStartDate(undefined);
    setNewStartTime("");
    setNewDueDate(undefined);
    setNewEndTime("");
    setNewProgress(0);
    setDuration(null);
    setShowAddForm(false);
  };

  const handleProgressUpdate = async (activityId: string, progress: number) => {
    await updateActivity(activityId, { progress });
    setEditingActivity(null);
    setEditProgress(prev => ({ ...prev, [activityId]: progress }));
  };

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(activityId, ticket.id);
  };

  const handleFullActivityEdit = async (activityId: string) => {
    const data = editActivityData[activityId];
    if (!data) return;

    await updateActivity(activityId, data);
    setEditingFullActivity(null);
    setEditActivityData(prev => ({ ...prev, [activityId]: {} }));
  };

  const updateEditData = (activityId: string, field: string, value: any) => {
    setEditActivityData(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b pb-4 -mt-6 pt-6 -mx-6 px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <CheckSquare className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Actividades del Ticket {ticket.code}</span>
              </DialogTitle>
              <p className="text-sm text-muted-foreground truncate mt-1">{ticket.subject}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAdmin && (
                <Button 
                  onClick={() => setShowAddForm(true)} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Agregar Actividad</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <h3 className="text-lg font-medium">Lista de Actividades</h3>

          {/* Modal de Nueva Actividad a pantalla completa */}
          <Dialog open={showAddForm} onOpenChange={(open) => {
            if (!open) {
              setShowAddForm(false);
              setNewDescription("");
              setNewStartDate(undefined);
              setNewStartTime("");
              setNewDueDate(undefined);
              setNewEndTime("");
              setNewProgress(0);
              setDuration(null);
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto" onPointerDownOutside={(e) => {
              e.preventDefault();
            }}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Nueva Actividad - {ticket.code}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    placeholder="Descripción de la actividad..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha de Inicio</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newStartDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newStartDate ? format(newStartDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newStartDate}
                          onSelect={setNewStartDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hora de Inicio</label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha Planificada</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newDueDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {newDueDate ? format(newDueDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={newDueDate}
                          onSelect={setNewDueDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hora Planificada</label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Duración Calculada</label>
                  <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-base font-medium">
                      {duration ? formatDuration(duration) : 'Seleccione fechas y horas'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Duración: {durationIncrement} min</label>
                  <Slider
                    value={[durationIncrement]}
                    onValueChange={(value) => setDurationIncrement(value[0])}
                    max={60}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>15</span>
                    <span>30</span>
                    <span>45</span>
                    <span>60</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Progreso Inicial: {newProgress}%</label>
                  <Slider
                    value={[newProgress]}
                    onValueChange={(value) => setNewProgress(value[0])}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    type="button"
                    onClick={handleAddActivity} 
                    disabled={!newDescription.trim() || !newDueDate || !newStartDate}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Actividad
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => {
                      setShowAddForm(false);
                      setNewDescription("");
                      setNewStartDate(undefined);
                      setNewStartTime("");
                      setNewDueDate(undefined);
                      setNewEndTime("");
                      setNewProgress(0);
                      setDuration(null);
                      setDurationIncrement(15);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="text-center py-8">Cargando actividades...</div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay actividades asignadas a este ticket
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-12">Completado</TableHead>
                     <TableHead className="w-20">Nro</TableHead>
                     <TableHead>Descripción</TableHead>
                     <TableHead className="w-32">Fecha Inicio</TableHead>
                     <TableHead className="w-32">Hora Inicio</TableHead>
                     <TableHead className="w-32">Fecha Planificada</TableHead>
                     <TableHead className="w-32">Hora Planificada</TableHead>
                     <TableHead className="w-32">Duración</TableHead>
                     <TableHead className="w-32">Fecha Cumplimiento</TableHead>
                     <TableHead className="w-32">Hora Cumplimiento</TableHead>
                     <TableHead className="w-28">Progreso</TableHead>
                     <TableHead className="w-24">Estado</TableHead>
                    {isAdmin && <TableHead className="w-20">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Checkbox
                          checked={activity.completed}
                          onCheckedChange={() => isAdmin && toggleComplete(activity)}
                          disabled={!isAdmin}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {activity.activity_number.toString().padStart(3, '0')}
                      </TableCell>
                       <TableCell>
                         {isAdmin && editingFullActivity === activity.id ? (
                           <Textarea
                             value={editActivityData[activity.id]?.description ?? activity.description}
                             onChange={(e) => updateEditData(activity.id, 'description', e.target.value)}
                             className="min-h-[60px]"
                           />
                         ) : (
                           activity.description
                         )}
                       </TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                         {activity.start_date ? formatDateSafe(activity.start_date) : '-'}
                       </TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                         {activity.start_time ? formatTimeTo12Hour(activity.start_time) : '-'}
                       </TableCell>
                       <TableCell>
                         {isAdmin && editingFullActivity === activity.id ? (
                           <Popover>
                             <PopoverTrigger asChild>
                               <Button variant="outline" className="w-full justify-start text-left font-normal">
                                 <Calendar className="mr-2 h-4 w-4" />
                                  {editActivityData[activity.id]?.due_date 
                                    ? formatDateSafe(editActivityData[activity.id].due_date!)
                                    : formatDateSafe(activity.due_date)
                                  }
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0" align="start">
                               <CalendarComponent
                                 mode="single"
                                  selected={editActivityData[activity.id]?.due_date 
                                    ? (() => {
                                        const [year, month, day] = editActivityData[activity.id].due_date!.split('-');
                                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      })()
                                    : (() => {
                                        const [year, month, day] = activity.due_date.split('-');
                                        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      })()
                                  }
                                  onSelect={(date) => {
                                    if (date) {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      const formattedDate = `${year}-${month}-${day}`;
                                      updateEditData(activity.id, 'due_date', formattedDate);
                                    }
                                  }}
                                 initialFocus
                                 className={cn("p-3 pointer-events-auto")}
                               />
                             </PopoverContent>
                           </Popover>
                         ) : (
                           formatDateSafe(activity.due_date)
                         )}
                       </TableCell>
                       <TableCell>
                         {isAdmin && editingFullActivity === activity.id ? (
                           (() => {
                             const selectedDate = editActivityData[activity.id]?.due_date || activity.due_date;
                             const today = getTodayDateString();
                             const isCurrentOrFuture = selectedDate >= today;
                             
                             return isCurrentOrFuture ? (
                               <Input
                                 type="time"
                                 value={editActivityData[activity.id]?.end_time ?? activity.end_time ?? ""}
                                 onChange={(e) => updateEditData(activity.id, 'end_time', e.target.value)}
                                 className="w-20"
                               />
                             ) : (
                               <span className="text-muted-foreground text-sm">-</span>
                             );
                           })()
                          ) : (
                            activity.end_time ? (
                              <span className="text-sm">{formatTimeTo12Hour(activity.end_time)}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )
                           )}
                         </TableCell>
                         <TableCell className="text-sm text-muted-foreground">
                           {activity.start_date && activity.start_time && activity.due_date && activity.end_time ? (
                             formatDuration(calculateDuration(
                               activity.start_date,
                               activity.start_time,
                               activity.due_date,
                               activity.end_time
                             ))
                           ) : '-'}
                         </TableCell>
                         <TableCell className="text-sm text-muted-foreground">
                           {activity.completion_date ? formatDateSafe(activity.completion_date) : '-'}
                         </TableCell>
                         <TableCell className="text-sm text-muted-foreground">
                           {formatTimeTo12Hour(activity.completion_time)}
                         </TableCell>
                       <TableCell>
                         {isAdmin && editingFullActivity === activity.id ? (
                           <div className="space-y-1 w-32">
                             <Slider
                               value={[editActivityData[activity.id]?.progress ?? activity.progress]}
                               onValueChange={(value) => updateEditData(activity.id, 'progress', value[0])}
                               max={100}
                               step={1}
                               className="w-full"
                             />
                             <div className="text-xs text-center text-muted-foreground">
                               {editActivityData[activity.id]?.progress ?? activity.progress}%
                             </div>
                           </div>
                         ) : isAdmin && editingActivity === activity.id ? (
                           <div className="space-y-1 w-32">
                             <div className="flex items-center gap-2">
                               <Slider
                                 value={[editProgress[activity.id] ?? activity.progress]}
                                 onValueChange={(value) => setEditProgress(prev => ({ 
                                   ...prev, 
                                   [activity.id]: value[0]
                                 }))}
                                 max={100}
                                 step={1}
                                 className="flex-1"
                               />
                               <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => handleProgressUpdate(activity.id, editProgress[activity.id] ?? activity.progress)}
                                 className="h-7 px-2"
                               >
                                 ✓
                               </Button>
                             </div>
                             <div className="text-xs text-center text-muted-foreground">
                               {editProgress[activity.id] ?? activity.progress}%
                             </div>
                           </div>
                         ) : (
                           <div 
                             className={cn(
                               "flex items-center gap-1",
                               isAdmin && editingFullActivity !== activity.id && "cursor-pointer hover:bg-muted rounded px-1"
                             )}
                             onClick={() => isAdmin && editingFullActivity !== activity.id && setEditingActivity(activity.id)}
                           >
                             <span className="text-sm">{activity.progress}%</span>
                             {isAdmin && editingFullActivity !== activity.id && <Edit className="w-3 h-3 opacity-50" />}
                           </div>
                         )}
                       </TableCell>
                       <TableCell>
                         <Badge variant={getActivityStatus(activity.progress).variant}>
                           {getActivityStatus(activity.progress).status}
                         </Badge>
                       </TableCell>
                       {isAdmin && (
                         <TableCell>
                           <div className="flex gap-1">
                             {editingFullActivity === activity.id ? (
                               <>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => handleFullActivityEdit(activity.id)}
                                   className="text-green-600 hover:text-green-700"
                                 >
                                   ✓
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => {
                                     setEditingFullActivity(null);
                                     setEditActivityData(prev => ({ ...prev, [activity.id]: {} }));
                                   }}
                                   className="text-muted-foreground hover:text-foreground"
                                 >
                                   ✕
                                 </Button>
                               </>
                             ) : (
                               <>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => {
                                     setEditingFullActivity(activity.id);
                                     setEditActivityData(prev => ({
                                       ...prev,
                                       [activity.id]: {
                                         description: activity.description,
                                         due_date: activity.due_date,
                                         end_time: activity.end_time,
                                         progress: activity.progress
                                       }
                                     }));
                                   }}
                                   className="text-blue-600 hover:text-blue-700"
                                 >
                                   <Edit className="w-4 h-4" />
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="ghost"
                                   onClick={() => handleDeleteActivity(activity.id)}
                                   className="text-destructive hover:text-destructive"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               </>
                             )}
                           </div>
                         </TableCell>
                       )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};