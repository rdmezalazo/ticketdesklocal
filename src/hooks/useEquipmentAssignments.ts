import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface EquipmentAssignment {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_position: string | null;
  worker_dni: string | null;
  assigner_name: string;
  assigner_position: string | null;
  assignment_date: string;
  status: string;
  observations: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface EquipmentAssignmentItem {
  id: string;
  assignment_id: string;
  equipo_id: string;
  equipo_codigo: string;
  equipo_nombre: string;
  equipo_marca: string | null;
  equipo_modelo: string | null;
  equipo_serie: string | null;
  assignment_reason: string;
  equipment_condition: string;
  delivery_date: string;
  return_reason: string | null;
  return_date: string | null;
  created_at: string;
  updated_at: string;
}

export const ASSIGNMENT_REASONS = [
  "Hombre Nuevo",
  "Retorno de Vacaciones",
  "Reemplazo",
  "Cambio de Equipo",
];

export const RETURN_REASONS = [
  "Vacaciones",
  "Término del vínculo laboral",
  "Equipo por averías o bajas",
  "Licencias mayores a 7 días",
];

export const EQUIPMENT_CONDITIONS = ["Nuevo", "Usado"];

export function useEquipmentAssignments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["equipment-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EquipmentAssignment[];
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (
      data: Omit<EquipmentAssignment, "id" | "created_at" | "updated_at" | "created_by">
    ) => {
      const { data: result, error } = await supabase
        .from("equipment_assignments")
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignments"] });
      toast({ title: "Asignación creada exitosamente" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear asignación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<EquipmentAssignment> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("equipment_assignments")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignments"] });
      toast({ title: "Asignación actualizada exitosamente" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar asignación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignments"] });
      toast({ title: "Asignación eliminada exitosamente" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar asignación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    assignments,
    isLoading,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}

export function useAssignmentItems(assignmentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["equipment-assignment-items", assignmentId],
    queryFn: async () => {
      let query = supabase.from("equipment_assignment_items").select("*");

      if (assignmentId) {
        query = query.eq("assignment_id", assignmentId);
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;
      return data as EquipmentAssignmentItem[];
    },
    enabled: !!assignmentId,
  });

  const createItem = useMutation({
    mutationFn: async (
      data: Omit<EquipmentAssignmentItem, "id" | "created_at" | "updated_at">
    ) => {
      const { data: result, error } = await supabase
        .from("equipment_assignment_items")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
      toast({ title: "Equipo agregado a la asignación" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al agregar equipo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<EquipmentAssignmentItem> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("equipment_assignment_items")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
      toast({ title: "Equipo actualizado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar equipo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_assignment_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignment-items"] });
      toast({ title: "Equipo eliminado de la asignación" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar equipo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
}

// Hook to get all assigned equipment IDs to know which are available
export function useAssignedEquipment() {
  const { data: assignedItems = [], isLoading } = useQuery({
    queryKey: ["all-assigned-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_assignment_items")
        .select(`
          id,
          equipo_id,
          equipo_codigo,
          return_date,
          assignment_id,
          equipment_assignments!inner(worker_name, status, worker_position)
        `)
        .is("return_date", null);

      if (error) throw error;
      return data;
    },
  });

  return {
    assignedItems,
    isLoading,
    isEquipmentAssigned: (equipoId: string) => {
      return assignedItems.find((item: any) => item.equipo_id === equipoId);
    },
  };
}
