import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AssignmentReason {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReturnReason {
  id: string;
  name: string;
  is_active: boolean;
  has_continuity: boolean;
  created_at: string;
  updated_at: string;
}

export function useAssignmentReasons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["equipment-assignment-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_assignment_reasons")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as AssignmentReason[];
    },
  });

  const activeReasons = reasons.filter((r) => r.is_active);

  const createReason = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("equipment_assignment_reasons")
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignment-reasons"] });
      toast({ title: "Motivo de asignación creado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear motivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReason = useMutation({
    mutationFn: async ({ id, ...data }: Partial<AssignmentReason> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("equipment_assignment_reasons")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignment-reasons"] });
      toast({ title: "Motivo de asignación actualizado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar motivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReason = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_assignment_reasons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-assignment-reasons"] });
      toast({ title: "Motivo de asignación eliminado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar motivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    reasons,
    activeReasons,
    isLoading,
    createReason,
    updateReason,
    deleteReason,
  };
}

export function useReturnReasons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["equipment-return-reasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_return_reasons")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as ReturnReason[];
    },
  });

  const activeReasons = reasons.filter((r) => r.is_active);

  const createReason = useMutation({
    mutationFn: async ({ name, has_continuity = true }: { name: string; has_continuity?: boolean }) => {
      const { data, error } = await supabase
        .from("equipment_return_reasons")
        .insert({ name, has_continuity })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-return-reasons"] });
      toast({ title: "Motivo de devolución creado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear motivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReason = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ReturnReason> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("equipment_return_reasons")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-return-reasons"] });
      toast({ title: "Motivo de devolución actualizado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar motivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReason = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_return_reasons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-return-reasons"] });
      toast({ title: "Motivo de devolución eliminado" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar motivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    reasons,
    activeReasons,
    isLoading,
    createReason,
    updateReason,
    deleteReason,
  };
}
