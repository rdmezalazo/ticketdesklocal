import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useSettings } from "@/hooks/useSettings";
import { Ticket, TicketPriority, TicketStatus, TicketCategory } from "@/types/ticket";
import { Plus, ChevronDown, ChevronUp, User, Mail, MapPin, Briefcase, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTickets } from "@/hooks/useTickets";

interface CreateTicketModalProps {
  onCreateTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
}

export const CreateTicketModal = ({ onCreateTicket }: CreateTicketModalProps) => {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; size: number; tempPath?: string }>>([]);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
  const [showRequesterDetails, setShowRequesterDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadAttachment } = useTickets();
  const [formData, setFormData] = useState({
    code: "",
    subject: "",
    description: "", 
    requester: "",
    requesterEmail: "",
    requesterArea: "",
    requesterCargo: "",
    requesterSede: "Arequipa",
    priority: "medium" as TicketPriority,
    category: "Incidencia" as TicketCategory,
    assignee: "Ronald Meza, supervisorti@livigui.com",
    tags: ""
  });
  const { toast } = useToast();
  const { systemAreas, ticketCategories, loading: categoriesLoading } = useSettings();

  // Load current user data when modal opens
  useEffect(() => {
    if (open) {
      loadUserData();
      // Set default category to "Incidencia General" if available, otherwise "Incidencia"
      const defaultCategory = ticketCategories.find(cat => 
        cat.name === "Incidencia General" && cat.is_active
      );
      if (defaultCategory) {
        setFormData(prev => ({ ...prev, category: "Incidencia General" as TicketCategory }));
      }
    }
  }, [open, ticketCategories]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setFormData(prev => ({
            ...prev,
            requester: profile.full_name || "",
            requesterEmail: profile.email || "",
            requesterArea: profile.area || "",
            requesterCargo: profile.cargo || "",
            requesterSede: profile.sede || "Arequipa",
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const generateNextTicketCode = () => {
    // This will be handled by the database function
    return "Generando...";
  };

  const handleFileUpload = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `temp/${Date.now()}_${file.name}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      // Add to temporary attachments list
      const newAttachment = {
        name: file.name,
        url: publicUrl,
        size: file.size,
        tempPath: fileName
      };

      setAttachments(prev => [...prev, newAttachment]);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleAttachmentRemove = async (index: number) => {
    const attachment = attachments[index];
    try {
      // Remove from storage if it's a temp file
      if (attachment.tempPath) {
        await supabase.storage
          .from('ticket-attachments')
          .remove([attachment.tempPath]);
      }
      
      setAttachments(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevenir múltiples envíos
    
    if (!formData.subject || !formData.description || !formData.requester || !formData.requesterEmail) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos obligatorios.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar si ya existe un ticket con el mismo asunto del mismo usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingTickets } = await supabase
          .from('tickets')
          .select('id, subject')
          .eq('created_by', user.id)
          .eq('subject', formData.subject)
          .limit(1);

        if (existingTickets && existingTickets.length > 0) {
          toast({
            title: "Error",
            description: "Ya tienes un ticket con el mismo asunto. Por favor, usa un asunto diferente.",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }

      const newTicket = {
        subject: formData.subject,
        description: formData.description,
        status: "open" as TicketStatus,
        priority: formData.priority,
        category: formData.category,
        requester: formData.requester,
        requesterEmail: formData.requesterEmail,
        requesterArea: formData.requesterArea,
        requesterCargo: formData.requesterCargo,
        requesterSede: formData.requesterSede,
        assignee: formData.assignee || undefined,
        tags: formData.tags.split(",").map(tag => tag.trim()).filter(Boolean)
      };

      // Skip attachment handling for now - will be added later
      const createdTicket = await onCreateTicket({
        code: "", // Will be generated by database
        ...newTicket
      });
      
      // Reset form but keep user data and assignee
      setFormData(prev => ({
        ...prev,
        code: "",
        subject: "",
        description: "",
        priority: "medium",
        category: "Incidencia",
        assignee: "Ronald Meza, supervisorti@livigui.com",
        tags: ""
      }));
      
      setAttachments([]);
      setOpen(false);
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el ticket.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:bg-primary-hover shadow-medium">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Ticket</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código del Ticket */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Código del Ticket: </span>
                <span className="text-lg font-mono font-semibold text-foreground">
                  {formData.requesterSede && formData.requesterArea ? 
                    `TL${formData.requesterSede === 'Lima' ? 'L' : 'A'}-${formData.requesterArea.substring(0,3).toUpperCase()}-XXXX` : 
                    'TLA-CON-XXXX'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Se asigna automáticamente al crear</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Formato:</span> TL[A/L] = Ticket Livigui + Sede (A=Arequipa, L=Lima) | 
              Área: {formData.requesterArea ? formData.requesterArea.substring(0,3).toUpperCase() : 'COD'} | 
              Correlativo: 4 dígitos
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Describe brevemente el problema..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={formData.priority} onValueChange={(value: TicketPriority) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: TicketCategory) => setFormData({ ...formData, category: value })}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Cargando categorías..." : "Selecciona categoría"} />
                </SelectTrigger>
                <SelectContent>
                  {ticketCategories
                    .filter(category => category.is_active)
                    .map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <RichTextEditor
              content={formData.description}
              onChange={(content) => setFormData({ ...formData, description: content })}
              placeholder="Describe el problema en detalle..."
              className="min-h-[120px]"
            />
          </div>

          {/* Datos del Solicitante */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-foreground">Datos del Solicitante</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRequesterDetails(!showRequesterDetails)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showRequesterDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Mostrar
                  </>
                )}
              </Button>
            </div>

            {!showRequesterDetails ? (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formData.requester || "No especificado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{formData.requesterEmail || "No especificado"}</span>
                  </div>
                  {formData.requesterArea && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span>{formData.requesterArea}{formData.requesterCargo && ` - ${formData.requesterCargo}`}</span>
                    </div>
                  )}
                  {formData.requesterSede && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {formData.requesterSede}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requester">Nombre Completo *</Label>
                    <Input
                      id="requester"
                      value={formData.requester}
                      onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                      placeholder="Nombre del solicitante"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requesterEmail">Email *</Label>
                    <Input
                      id="requesterEmail"
                      type="email"
                      value={formData.requesterEmail}
                      onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })}
                      placeholder="email@ejemplo.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="requesterArea">Área *</Label>
                    <Select 
                      value={formData.requesterArea} 
                      onValueChange={(value) => setFormData({ ...formData, requesterArea: value })}
                      disabled={categoriesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={categoriesLoading ? "Cargando áreas..." : "Selecciona área"} />
                      </SelectTrigger>
                      <SelectContent>
                        {systemAreas
                          .filter(area => area.is_active)
                          .map((area) => (
                            <SelectItem key={area.id} value={area.name}>
                              {area.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requesterCargo">Cargo</Label>
                    <Input
                      id="requesterCargo"
                      value={formData.requesterCargo}
                      onChange={(e) => setFormData({ ...formData, requesterCargo: e.target.value })}
                      placeholder="Cargo del solicitante"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requesterSede">Sede *</Label>
                    <Select 
                      value={formData.requesterSede} 
                      onValueChange={(value) => setFormData({ ...formData, requesterSede: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arequipa">Arequipa</SelectItem>
                        <SelectItem value="Lima">Lima</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Asignar a</Label>
              <Input
                id="assignee"
                value={formData.assignee}
                placeholder="Ronald Meza, supervisorti@livigui.com"
                readOnly
                className="bg-muted/50 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Etiquetas</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="bug, crítico, frontend (separadas por comas) - Opcional"
                title="Campo opcional: Agregue etiquetas separadas por comas"
              />
            </div>
          </div>

          </form>
        </div>
        
        <div className="border-t pt-4 mt-4 flex justify-end space-x-2 bg-background">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            className="bg-gradient-primary hover:bg-primary-hover"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};