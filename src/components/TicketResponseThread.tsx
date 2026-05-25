import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { TicketResponse } from '@/hooks/support/useTicketResponses';

interface TicketResponseThreadProps {
  responses: TicketResponse[];
  onAddResponse: (content: string, isInternal?: boolean) => Promise<void>;
  isLoading: boolean;
  currentUserRole: string;
}

export const TicketResponseThread: React.FC<TicketResponseThreadProps> = ({
  responses,
  onAddResponse,
  isLoading,
  currentUserRole
}) => {
  const [newResponse, setNewResponse] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResponse.trim()) return;

    setIsSending(true);
    try {
      await onAddResponse(newResponse, isInternal);
      setNewResponse('');
      setIsInternal(false);
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isTiOrGerencia = currentUserRole === 'ti' || currentUserRole === 'gerencia';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Hilo de Respuestas</h3>
          <Badge variant="outline">
            {responses.length} respuesta{responses.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {isExpanded ? "Ocultar" : "Mostrar"}
        </Button>
      </div>

      {isExpanded && (
        <>
          {/* Responses List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {responses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay respuestas aún. Sé el primero en responder.</p>
              </div>
            ) : (
              responses.map((response) => (
                <div
                  key={response.id}
                  className={`flex gap-3 p-4 rounded-lg border ${
                    response.is_internal 
                      ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' 
                      : 'bg-card border-border'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={""} alt={response.user?.full_name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(response.user?.full_name || 'Usuario')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {response.user?.full_name || 'Usuario'}
                        </span>
                        <Badge 
                          variant={response.user?.role === 'ti' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {response.user?.role === 'ti' ? 'Soporte TI' : 
                           response.user?.role === 'gerencia' ? 'Gerencia' : 'Usuario'}
                        </Badge>
                        {response.is_internal && (
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Interno
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(response.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: response.content }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* New Response Form */}
          <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <RichTextEditor
                content={newResponse}
                onChange={setNewResponse}
                placeholder="Escribe tu respuesta..."
                className="min-h-[120px]"
              />
              {isSending && (
                <div className="text-xs text-muted-foreground">Enviando respuesta...</div>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              {isTiOrGerencia && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    disabled={isSending}
                    className="rounded border-border"
                  />
                  <span>Respuesta interna (solo visible para staff)</span>
                </label>
              )}
              
              <Button 
                type="submit" 
                disabled={!newResponse.trim() || isSending}
                className="ml-auto"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Enviando...' : 'Responder'}
              </Button>
            </div>
          </form>
        </>
      )}

      {/* Show minimal info when collapsed */}
      {!isExpanded && responses.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Última respuesta: {format(new Date(responses[0]?.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
        </div>
      )}
    </div>
  );
};