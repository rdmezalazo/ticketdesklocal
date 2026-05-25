import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportTemplateConfig } from "@/types/reportDesigner";

const TEMPLATE_MODULE = "report_templates";

export function useReportTemplate(templateKey: string, defaultTemplate: ReportTemplateConfig) {
  const [template, setTemplate] = useState<ReportTemplateConfig>(defaultTemplate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isInitialized = useRef(false);

  // Cargar plantilla desde la base de datos o localStorage - solo una vez
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const loadTemplate = async () => {
      setLoading(true);
      
      // Primero intentar cargar desde la base de datos
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('module', TEMPLATE_MODULE)
          .eq('key', templateKey)
          .single();

        if (data?.value) {
          const savedTemplate = data.value as unknown as ReportTemplateConfig;
          setTemplate({
            ...defaultTemplate,
            ...savedTemplate,
            header: { ...defaultTemplate.header, ...savedTemplate.header },
            photoPanel: { ...defaultTemplate.photoPanel, ...savedTemplate.photoPanel },
            signature: { ...defaultTemplate.signature, ...savedTemplate.signature },
            sections: savedTemplate.sections || defaultTemplate.sections,
          });
          // Sincronizar con localStorage
          localStorage.setItem(templateKey, JSON.stringify(savedTemplate));
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('No se encontró plantilla en la base de datos, intentando localStorage');
      }

      // Fallback a localStorage
      try {
        const saved = localStorage.getItem(templateKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTemplate({
            ...defaultTemplate,
            ...parsed,
            header: { ...defaultTemplate.header, ...parsed.header },
            photoPanel: { ...defaultTemplate.photoPanel, ...parsed.photoPanel },
            signature: { ...defaultTemplate.signature, ...parsed.signature },
            sections: parsed.sections || defaultTemplate.sections,
          });
        }
      } catch (e) {
        console.error('Error loading template from localStorage:', e);
      }
      
      setLoading(false);
    };

    loadTemplate();
  }, [templateKey]); // Solo зависит de templateKey, no de defaultTemplate

  // Guardar plantilla
  const saveTemplate = useCallback(async (templateToSave: ReportTemplateConfig) => {
    setSaving(true);
    
    // Siempre guardar en localStorage como backup
    localStorage.setItem(templateKey, JSON.stringify(templateToSave));

    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('module', TEMPLATE_MODULE)
        .eq('key', templateKey)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const templateValue: any = templateToSave;

      if (existing) {
        // Actualizar
        await supabase
          .from('app_settings')
          .update({
            value: templateValue,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Insertar
        await supabase
          .from('app_settings')
          .insert({
            module: TEMPLATE_MODULE,
            key: templateKey,
            description: `Plantilla de reporte: ${templateKey}`,
            value: templateValue,
          });
      }
    } catch (error) {
      console.error('Error guardando plantilla en la base de datos:', error);
      // No mostrar error, ya que se guardó en localStorage
    }
    
    setSaving(false);
  }, [templateKey]);

  // Actualizar plantilla localmente
  const updateTemplate = useCallback((updates: Partial<ReportTemplateConfig>) => {
    setTemplate(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Restaurar a valores por defecto
  const resetTemplate = useCallback(async () => {
    setTemplate(defaultTemplate);
    localStorage.removeItem(templateKey);
    
    try {
      await supabase
        .from('app_settings')
        .delete()
        .eq('module', TEMPLATE_MODULE)
        .eq('key', templateKey);
    } catch (error) {
      console.error('Error eliminando plantilla de la base de datos:', error);
    }
  }, [templateKey, defaultTemplate]);

  return {
    template,
    loading,
    saving,
    saveTemplate,
    updateTemplate,
    resetTemplate,
  };
}
