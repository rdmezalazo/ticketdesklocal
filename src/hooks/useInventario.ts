import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Inventario {
  id: string;
  year: number;
  fecha_inventario: string;
  vigente: boolean;
  comentario: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Equipo {
  id: string;
  inventario_id: string;
  sede: string;
  codigo: string;
  tipo: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  nro_serie: string | null;
  fecha_alta: string | null;
  fecha_baja: string | null;
  operativo: boolean;
  red_linea: string | null;
  tarjeta_sim: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type TipoEquipo = 
  | "COMPUTADORA" 
  | "LAPTOP" 
  | "CELULAR" 
  | "CAMARA" 
  | "IMPRESORA" 
  | "MONITOR" 
  | "TABLET" 
  | "ROUTER" 
  | "SWITCH" 
  | "SERVIDOR" 
  | "OTRO";

export const TIPOS_EQUIPO: { value: TipoEquipo; label: string }[] = [
  { value: "COMPUTADORA", label: "Computadora de Escritorio" },
  { value: "LAPTOP", label: "Laptop" },
  { value: "CELULAR", label: "Celular" },
  { value: "CAMARA", label: "Cámara" },
  { value: "IMPRESORA", label: "Impresora" },
  { value: "MONITOR", label: "Monitor" },
  { value: "TABLET", label: "Tablet" },
  { value: "ROUTER", label: "Router" },
  { value: "SWITCH", label: "Switch" },
  { value: "SERVIDOR", label: "Servidor" },
  { value: "OTRO", label: "Otro" },
];

export const SEDES = ["Arequipa", "Lima"];

export function useInventarios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: inventarios = [], isLoading } = useQuery({
    queryKey: ["inventarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventarios")
        .select("*")
        .order("year", { ascending: false });
      
      if (error) throw error;
      return data as Inventario[];
    },
  });

  const createInventario = useMutation({
    mutationFn: async (data: Omit<Inventario, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: result, error } = await supabase
        .from("inventarios")
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
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      toast({ title: "Inventario creado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear inventario", description: error.message, variant: "destructive" });
    },
  });

  const updateInventario = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Inventario> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("inventarios")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      toast({ title: "Inventario actualizado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar inventario", description: error.message, variant: "destructive" });
    },
  });

  const deleteInventario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("inventarios")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventarios"] });
      toast({ title: "Inventario eliminado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar inventario", description: error.message, variant: "destructive" });
    },
  });

  return {
    inventarios,
    isLoading,
    createInventario,
    updateInventario,
    deleteInventario,
  };
}

export function useEquipos(inventarioId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: equipos = [], isLoading } = useQuery({
    queryKey: ["equipos", inventarioId],
    queryFn: async () => {
      let query = supabase.from("equipos").select("*");
      
      if (inventarioId) {
        query = query.eq("inventario_id", inventarioId);
      }
      
      const { data, error } = await query.order("codigo", { ascending: true });
      
      if (error) throw error;
      return data as Equipo[];
    },
    enabled: !!inventarioId || inventarioId === undefined,
  });

  const generateCode = async (sede: string, tipo: TipoEquipo): Promise<string> => {
    const { data, error } = await supabase.rpc("generate_equipo_code", {
      p_sede: sede,
      p_tipo: tipo,
    });
    
    if (error) throw error;
    return data as string;
  };

  const createEquipo = useMutation({
    mutationFn: async (data: Omit<Equipo, "id" | "created_at" | "updated_at" | "created_by" | "codigo"> & { tipoEquipo: TipoEquipo; codigo?: string }) => {
      // Use provided code or generate one
      const codigo = data.codigo || await generateCode(data.sede, data.tipoEquipo);
      const { tipoEquipo, codigo: _, ...equipoData } = data;
      
      const { data: result, error } = await supabase
        .from("equipos")
        .insert({
          ...equipoData,
          codigo,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipos"] });
      toast({ title: "Equipo creado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al crear equipo", description: error.message, variant: "destructive" });
    },
  });

  const updateEquipo = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Equipo> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("equipos")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipos"] });
      toast({ title: "Equipo actualizado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar equipo", description: error.message, variant: "destructive" });
    },
  });

  const deleteEquipo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipos")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipos"] });
      toast({ title: "Equipo eliminado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ title: "Error al eliminar equipo", description: error.message, variant: "destructive" });
    },
  });

  return {
    equipos,
    isLoading,
    generateCode,
    createEquipo,
    updateEquipo,
    deleteEquipo,
  };
}
