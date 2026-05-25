import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Plus, Upload, X } from 'lucide-react';
import { useTiTasks } from '@/hooks/useTiTasks';
import { useTiTaskAttachments } from '@/hooks/useTiTaskAttachments';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/useUsers';
import { User } from '@/hooks/useUsers';

interface CreateTiTaskModalProps {
  onTaskCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateTiTaskModal({ onTaskCreated, open, onOpenChange }: CreateTiTaskModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const { createTiTask } = useTiTasks();
  const { uploadAttachment } = useTiTaskAttachments();
  const { tiTaskCategories, systemAreas, loading: categoriesLoading } = useSettings();
  const { user } = useAuth();
  const { users, fetchUsers } = useUsers();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'Desarrollo',
    sede: 'Arequipa',
    area: 'Sistemas',
    assignee: '',
    tags: [] as string[]
  });

  // Load users and set default assignee
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (users.length > 0 && !formData.assignee) {
      const supervisor = users.find(u => u.email === 'supervisorti@livigui.com');
      if (supervisor) {
        setFormData(prev => ({ ...prev, assignee: supervisor.user_id }));
      }
    }
  }, [users]); // Remove formData.assignee from dependencies to prevent infinite loop

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const createdTask = await createTiTask({
        ...formData,
        created_by: user.id,
        assignee: formData.assignee,
      });

      if (createdTask && attachments.length > 0) {
        // Upload attachments
        for (const file of attachments) {
          await uploadAttachment(createdTask.id, file, user.id);
        }
      }

      // Reset form
      const supervisor = users.find(u => u.email === 'supervisorti@livigui.com');
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        category: 'Desarrollo',
        sede: 'Arequipa',
        area: 'Sistemas',
        assignee: supervisor?.user_id || '',
        tags: []
      });
      setAttachments([]);

      setIsOpen(false);
      onTaskCreated?.();
      
      // No longer reload the page - let the parent component handle refresh
    } catch (error) {
      console.error('Error creating TI task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarea TI
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarea de TI</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Describe brevemente la tarea"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Cargando categorías..." : "Selecciona categoría"} />
                </SelectTrigger>
                <SelectContent>
                  {tiTaskCategories
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value as any)}
              >
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
              <Label htmlFor="sede">Sede</Label>
              <Select
                value={formData.sede}
                onValueChange={(value) => handleInputChange('sede', value)}
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

            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select
                value={formData.area}
                onValueChange={(value) => handleInputChange('area', value)}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Asignado a</Label>
            <Input
              id="assignee"
              value="Ronald Meza (supervisorti@livigui.com)"
              readOnly
              className="bg-muted cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <RichTextEditor
              content={formData.description}
              onChange={(content) => handleInputChange('description', content)}
              placeholder="Describe la tarea en detalle..."
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label>Archivos Adjuntos</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">
                  Haz clic para subir archivos o arrastra y suelta
                </span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label className="text-sm font-medium">Archivos seleccionados:</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}