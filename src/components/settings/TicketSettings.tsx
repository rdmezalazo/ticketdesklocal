import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSettings } from "@/hooks/useSettings";
import { Plus, Edit2, Trash2, Palette } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryFormData {
  name: string;
  color: string;
  description: string;
  is_active: boolean;
}

interface PriorityFormData {
  name: string;
  level: number;
  color: string;
  description: string;
  is_active: boolean;
}

interface StatusFormData {
  name: string;
  slug: string;
  color: string;
  description: string;
  is_active: boolean;
  order_index: number;
}

export function TicketSettings() {
const {
    loading,
    ticketCategories,
    ticketPriorities,
    ticketStatuses,
    createCategory,
    updateCategory,
    deleteCategory,
    createPriority,
    updatePriority,
    deletePriority,
    createStatus,
    updateStatus,
    deleteStatus,
    getSettingValue,
    updateAppSetting
  } = useSettings();

  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    color: '#3b82f6',
    description: '',
    is_active: true
  });

  const [priorityForm, setPriorityForm] = useState<PriorityFormData>({
    name: '',
    level: 1,
    color: '#3b82f6',
    description: '',
    is_active: true
  });

  const [statusForm, setStatusForm] = useState<StatusFormData>({
    name: '',
    slug: '',
    color: '#3b82f6',
    description: '',
    is_active: true,
    order_index: 1
  });

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [openDialogs, setOpenDialogs] = useState({
    category: false,
    priority: false,
    status: false
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      color: '#3b82f6',
      description: '',
      is_active: true
    });
    setEditingCategory(null);
  };

  const resetPriorityForm = () => {
    setPriorityForm({
      name: '',
      level: 1,
      color: '#3b82f6',
      description: '',
      is_active: true
    });
    setEditingPriority(null);
  };

  const resetStatusForm = () => {
    setStatusForm({
      name: '',
      slug: '',
      color: '#3b82f6',
      description: '',
      is_active: true,
      order_index: 1
    });
    setEditingStatus(null);
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return;
    
    if (editingCategory) {
      await updateCategory(editingCategory, categoryForm);
    } else {
      await createCategory(categoryForm);
    }
    
    resetCategoryForm();
    setOpenDialogs(prev => ({ ...prev, category: false }));
  };

  const handleCreatePriority = async () => {
    if (!priorityForm.name.trim()) return;
    
    if (editingPriority) {
      await updatePriority(editingPriority, priorityForm);
    } else {
      await createPriority(priorityForm);
    }
    
    resetPriorityForm();
    setOpenDialogs(prev => ({ ...prev, priority: false }));
  };

  const handleCreateStatus = async () => {
    if (!statusForm.name.trim() || !statusForm.slug.trim()) return;
    
    if (editingStatus) {
      await updateStatus(editingStatus, statusForm);
    } else {
      await createStatus(statusForm);
    }
    
    resetStatusForm();
    setOpenDialogs(prev => ({ ...prev, status: false }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="categories" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="categories">Categorías</TabsTrigger>
        <TabsTrigger value="priorities">Prioridades</TabsTrigger>
        <TabsTrigger value="statuses">Estados</TabsTrigger>
        <TabsTrigger value="admin">Administrador</TabsTrigger>
      </TabsList>

      {/* Categories Tab */}
      <TabsContent value="categories">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Categorías de Tickets</CardTitle>
              <CardDescription>
                Gestiona las categorías disponibles para clasificar los tickets
              </CardDescription>
            </div>
            <Dialog 
              open={openDialogs.category} 
              onOpenChange={(open) => {
                setOpenDialogs(prev => ({ ...prev, category: open }));
                if (!open) resetCategoryForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category-name">Nombre</Label>
                    <Input
                      id="category-name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre de la categoría"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="category-color"
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="category-description">Descripción</Label>
                    <Textarea
                      id="category-description"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción de la categoría"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="category-active"
                      checked={categoryForm.is_active}
                      onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="category-active">Activa</Label>
                  </div>
                  <Button onClick={handleCreateCategory} className="w-full">
                    {editingCategory ? 'Actualizar' : 'Crear'} Categoría
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {ticketCategories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <p className="font-medium">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCategoryForm({
                          name: category.name,
                          color: category.color,
                          description: category.description || '',
                          is_active: category.is_active
                        });
                        setEditingCategory(category.id);
                        setOpenDialogs(prev => ({ ...prev, category: true }));
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Priorities Tab */}
      <TabsContent value="priorities">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Prioridades de Tickets</CardTitle>
              <CardDescription>
                Define los niveles de prioridad y sus colores asociados
              </CardDescription>
            </div>
            <Dialog 
              open={openDialogs.priority} 
              onOpenChange={(open) => {
                setOpenDialogs(prev => ({ ...prev, priority: open }));
                if (!open) resetPriorityForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Prioridad
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPriority ? 'Editar Prioridad' : 'Nueva Prioridad'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priority-name">Nombre</Label>
                    <Input
                      id="priority-name"
                      value={priorityForm.name}
                      onChange={(e) => setPriorityForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre de la prioridad"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority-level">Nivel (1 = más baja)</Label>
                    <Input
                      id="priority-level"
                      type="number"
                      min="1"
                      value={priorityForm.level}
                      onChange={(e) => setPriorityForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="priority-color"
                        type="color"
                        value={priorityForm.color}
                        onChange={(e) => setPriorityForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={priorityForm.color}
                        onChange={(e) => setPriorityForm(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="priority-description">Descripción</Label>
                    <Textarea
                      id="priority-description"
                      value={priorityForm.description}
                      onChange={(e) => setPriorityForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción de la prioridad"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="priority-active"
                      checked={priorityForm.is_active}
                      onCheckedChange={(checked) => setPriorityForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="priority-active">Activa</Label>
                  </div>
                  <Button onClick={handleCreatePriority} className="w-full">
                    {editingPriority ? 'Actualizar' : 'Crear'} Prioridad
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {ticketPriorities.map((priority) => (
                <div key={priority.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: priority.color }}
                    />
                    <div>
                      <p className="font-medium">{priority.name} (Nivel {priority.level})</p>
                      {priority.description && (
                        <p className="text-sm text-muted-foreground">{priority.description}</p>
                      )}
                    </div>
                    <Badge variant={priority.is_active ? "default" : "secondary"}>
                      {priority.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPriorityForm({
                          name: priority.name,
                          level: priority.level,
                          color: priority.color,
                          description: priority.description || '',
                          is_active: priority.is_active
                        });
                        setEditingPriority(priority.id);
                        setOpenDialogs(prev => ({ ...prev, priority: true }));
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePriority(priority.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Statuses Tab */}
      <TabsContent value="statuses">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Estados de Tickets</CardTitle>
              <CardDescription>
                Define los estados disponibles en el ciclo de vida de un ticket
              </CardDescription>
            </div>
            <Dialog 
              open={openDialogs.status} 
              onOpenChange={(open) => {
                setOpenDialogs(prev => ({ ...prev, status: open }));
                if (!open) resetStatusForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Estado
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingStatus ? 'Editar Estado' : 'Nuevo Estado'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status-name">Nombre</Label>
                    <Input
                      id="status-name"
                      value={statusForm.name}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del estado"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status-slug">Slug (identificador)</Label>
                    <Input
                      id="status-slug"
                      value={statusForm.slug}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                      placeholder="identificador_unico"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status-order">Orden</Label>
                    <Input
                      id="status-order"
                      type="number"
                      min="1"
                      value={statusForm.order_index}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, order_index: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status-color">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="status-color"
                        type="color"
                        value={statusForm.color}
                        onChange={(e) => setStatusForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-10"
                      />
                      <Input
                        value={statusForm.color}
                        onChange={(e) => setStatusForm(prev => ({ ...prev, color: e.target.value }))}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status-description">Descripción</Label>
                    <Textarea
                      id="status-description"
                      value={statusForm.description}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descripción del estado"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="status-active"
                      checked={statusForm.is_active}
                      onCheckedChange={(checked) => setStatusForm(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="status-active">Activo</Label>
                  </div>
                  <Button onClick={handleCreateStatus} className="w-full">
                    {editingStatus ? 'Actualizar' : 'Crear'} Estado
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {ticketStatuses.map((status) => (
                <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <p className="font-medium">{status.name} (#{status.order_index})</p>
                      <p className="text-xs text-muted-foreground">Slug: {status.slug}</p>
                      {status.description && (
                        <p className="text-sm text-muted-foreground">{status.description}</p>
                      )}
                    </div>
                    <Badge variant={status.is_active ? "default" : "secondary"}>
                      {status.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusForm({
                          name: status.name,
                          slug: status.slug,
                          color: status.color,
                          description: status.description || '',
                          is_active: status.is_active,
                          order_index: status.order_index
                        });
                        setEditingStatus(status.id);
                        setOpenDialogs(prev => ({ ...prev, status: true }));
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteStatus(status.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Admin Tab */}
      <TabsContent value="admin">
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Administrador - Tickets</CardTitle>
            <CardDescription>
              Controla las restricciones de fecha para usuarios administradores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Editar tickets con fecha límite vencida</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite al administrador editar tickets con fecha límite vencida
                  </p>
                </div>
                <Switch
                  checked={Boolean(getSettingValue('admin_ticket_edit_expired_enabled', true))}
                  onCheckedChange={(checked) => 
                    updateAppSetting('admin_ticket_edit_expired_enabled', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Crear actividades con fecha vencida</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite al administrador crear actividades con fecha vencida en tickets
                  </p>
                </div>
                <Switch
                  checked={Boolean(getSettingValue('admin_ticket_create_activity_expired_enabled', true))}
                  onCheckedChange={(checked) => 
                    updateAppSetting('admin_ticket_create_activity_expired_enabled', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Editar actividades con fecha vencida</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite al administrador editar actividades con fecha vencida en tickets
                  </p>
                </div>
                <Switch
                  checked={Boolean(getSettingValue('admin_ticket_edit_activity_expired_enabled', true))}
                  onCheckedChange={(checked) => 
                    updateAppSetting('admin_ticket_edit_activity_expired_enabled', checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}