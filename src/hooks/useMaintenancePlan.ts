import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface MaintenanceItem {
  id: string;
  year: number;
  area: string;
  tipo_equipo: string;
  cargo_responsable: string | null;
  codigo_equipo: string | null;
  actividad: string;
  tipo: "Interno" | "Externo";
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  schedules?: MaintenanceSchedule[];
}

export interface MaintenanceSchedule {
  id: string;
  maintenance_item_id: string;
  month: number;
  is_programado: boolean;
  is_ejecutado: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaintenancePlanConfig {
  id: string;
  year: number;
  code: string;
  version: string;
  date: string;
  elaborado_por: string | null;
  puesto_trabajo: string | null;
  fecha_actualizacion: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useMaintenancePlan(year?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = year || new Date().getFullYear();

  // Fetch maintenance items for a year
  const { data: items = [], isLoading: loadingItems, refetch: refetchItems } = useQuery({
    queryKey: ["maintenance-items", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_plan_items")
        .select("*")
        .eq("year", currentYear)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MaintenanceItem[];
    },
    enabled: !!user,
  });

  // Fetch schedules for all items of the year
  const { data: schedules = [], isLoading: loadingSchedules, refetch: refetchSchedules } = useQuery({
    queryKey: ["maintenance-schedules", currentYear],
    queryFn: async () => {
      const { data: itemsData } = await supabase
        .from("maintenance_plan_items")
        .select("id")
        .eq("year", currentYear);

      if (!itemsData || itemsData.length === 0) return [];

      const itemIds = itemsData.map((i) => i.id);
      const { data, error } = await supabase
        .from("maintenance_schedule")
        .select("*")
        .in("maintenance_item_id", itemIds);

      if (error) throw error;
      return data as MaintenanceSchedule[];
    },
    enabled: !!user,
  });

  // Fetch plan config for a year
  const { data: config, isLoading: loadingConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["maintenance-config", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_plan_config")
        .select("*")
        .eq("year", currentYear)
        .maybeSingle();

      if (error) throw error;
      return data as MaintenancePlanConfig | null;
    },
    enabled: !!user,
  });

  // Create or update config
  const upsertConfig = useMutation({
    mutationFn: async (configData: Partial<MaintenancePlanConfig>) => {
      if (!user) throw new Error("No autenticado");

      const existing = await supabase
        .from("maintenance_plan_config")
        .select("id")
        .eq("year", currentYear)
        .maybeSingle();

      if (existing.data) {
        const { data, error } = await supabase
          .from("maintenance_plan_config")
          .update({
            ...configData,
            fecha_actualizacion: new Date().toLocaleDateString("es-PE"),
          })
          .eq("id", existing.data.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("maintenance_plan_config")
          .insert({
            year: currentYear,
            code: configData.code || "L-TI-PRG-001",
            version: configData.version || "1.0",
            date: configData.date || new Date().toLocaleDateString("es-PE"),
            elaborado_por: configData.elaborado_por,
            puesto_trabajo: configData.puesto_trabajo,
            fecha_actualizacion: new Date().toLocaleDateString("es-PE"),
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-config"] });
      toast.success("Configuración guardada");
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar configuración: ${error.message}`);
    },
  });

  // Create maintenance item
  const createItem = useMutation({
    mutationFn: async (itemData: Omit<MaintenanceItem, "id" | "created_at" | "updated_at" | "created_by">) => {
      if (!user) throw new Error("No autenticado");

      const { data, error } = await supabase
        .from("maintenance_plan_items")
        .insert({
          ...itemData,
          year: currentYear,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      toast.success("Ítem agregado");
    },
    onError: (error: Error) => {
      toast.error(`Error al crear ítem: ${error.message}`);
    },
  });

  // Update maintenance item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...itemData }: Partial<MaintenanceItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("maintenance_plan_items")
        .update(itemData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      toast.success("Ítem actualizado");
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar ítem: ${error.message}`);
    },
  });

  // Delete maintenance item
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_plan_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      toast.success("Ítem eliminado");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar ítem: ${error.message}`);
    },
  });

  // Update or create schedule (P/E toggle)
  const updateSchedule = useMutation({
    mutationFn: async ({
      itemId,
      month,
      isProgramado,
      isEjecutado,
    }: {
      itemId: string;
      month: number;
      isProgramado?: boolean;
      isEjecutado?: boolean;
    }) => {
      // Check if schedule exists
      const { data: existing } = await supabase
        .from("maintenance_schedule")
        .select("*")
        .eq("maintenance_item_id", itemId)
        .eq("month", month)
        .maybeSingle();

      if (existing) {
        const updateData: Partial<MaintenanceSchedule> = {};
        if (isProgramado !== undefined) updateData.is_programado = isProgramado;
        if (isEjecutado !== undefined) updateData.is_ejecutado = isEjecutado;

        const { data, error } = await supabase
          .from("maintenance_schedule")
          .update(updateData)
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("maintenance_schedule")
          .insert({
            maintenance_item_id: itemId,
            month,
            is_programado: isProgramado ?? false,
            is_ejecutado: isEjecutado ?? false,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar programación: ${error.message}`);
    },
  });

  // Get schedule for a specific item and month
  const getSchedule = (itemId: string, month: number) => {
    return schedules.find(
      (s) => s.maintenance_item_id === itemId && s.month === month
    );
  };

  return {
    items,
    schedules,
    config,
    loading: loadingItems || loadingSchedules || loadingConfig,
    createItem,
    updateItem,
    deleteItem,
    updateSchedule,
    upsertConfig,
    getSchedule,
    refetch: () => {
      refetchItems();
      refetchSchedules();
      refetchConfig();
    },
  };
}
