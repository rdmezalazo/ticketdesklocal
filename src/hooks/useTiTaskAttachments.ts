import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TiTaskAttachment {
  id: string;
  ti_task_id: string;
  file_name: string;
  file_type?: string;
  file_url: string;
  file_size?: number;
  uploaded_by: string;
  uploaded_at: string;
}

export const useTiTaskAttachments = () => {
  const [attachments, setAttachments] = useState<TiTaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const uploadAttachment = useCallback(async (
    tiTaskId: string, 
    file: File, 
    userId: string
  ): Promise<TiTaskAttachment | null> => {
    try {
      setLoading(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `ti-tasks/${tiTaskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast({
          title: "Error",
          description: "No se pudo subir el archivo",
          variant: "destructive",
        });
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

      // Save attachment info to database
      const { data, error: dbError } = await supabase
        .from('ti_task_attachments')
        .insert([{
          ti_task_id: tiTaskId,
          file_name: file.name,
          file_type: file.type,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: userId
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Error saving attachment info:', dbError);
        toast({
          title: "Error", 
          description: "No se pudo guardar la información del archivo",
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Éxito",
        description: "Archivo subido correctamente",
      });

      return data;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: "Error",
        description: "Error al subir el archivo", 
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAttachments = useCallback(async (tiTaskId: string) => {
    try {
      const { data, error } = await supabase
        .from('ti_task_attachments')
        .select('*')
        .eq('ti_task_id', tiTaskId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching attachments:', error);
        return;
      }

      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  }, []);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('ti_task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {
        console.error('Error deleting attachment:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el archivo",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Éxito",
        description: "Archivo eliminado correctamente",
      });

      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      return true;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el archivo",
        variant: "destructive", 
      });
      return false;
    }
  }, [toast]);

  return {
    attachments,
    loading,
    uploadAttachment,
    fetchAttachments,
    deleteAttachment
  };
};