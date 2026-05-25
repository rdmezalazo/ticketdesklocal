import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Forward, Ticket } from "lucide-react";
import { ChatMessage } from "@/hooks/chat/types";
import { toast } from "sonner";

interface MessageContextMenuProps {
  children: React.ReactNode;
  message: ChatMessage;
  onCopy: (content: string) => void;
}

export const MessageContextMenu = ({ 
  children, 
  message, 
  onCopy 
}: MessageContextMenuProps) => {
  
  const handleCopy = () => {
    const contentToCopy = message.content || message.file_name || 'Archivo';
    onCopy(contentToCopy);
  };

  const handleForward = () => {
    // Implementar funcionalidad de reenvío en el futuro
    toast.info('Funcionalidad de reenvío próximamente');
  };

  const handleCreateTicket = () => {
    // Implementar creación de ticket basado en el mensaje
    toast.info('Creación de ticket desde mensaje próximamente');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem 
          onClick={handleCopy}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Copy className="h-4 w-4" />
          <span>Copiar mensaje</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={handleForward}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Forward className="h-4 w-4" />
          <span>Reenviar</span>
        </ContextMenuItem>
        
        <ContextMenuItem 
          onClick={handleCreateTicket}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Ticket className="h-4 w-4" />
          <span>Crear Ticket</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};