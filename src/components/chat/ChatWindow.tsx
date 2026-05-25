import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { MessageContextMenu } from "./MessageContextMenu";
import { ChatUser, ChatMessage, ChatConversation } from "@/hooks/chat/types";
import { useSettings } from "@/hooks/useSettings";
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  Download,
  MessageSquare,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ChatWindowProps {
  selectedUser: ChatUser | null;
  messages: ChatMessage[];
  conversation: ChatConversation | null;
  currentUser: any;
  onSendMessage: (content: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
  isLoading: boolean;
}

export const ChatWindow = ({
  selectedUser,
  messages,
  conversation,
  currentUser,
  onSendMessage,
  onSendFile,
  isLoading
}: ChatWindowProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{src: string, alt: string, fileName?: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { getSettingValue } = useSettings();

  // Get chat settings
  const allowFileAttachments = getSettingValue('chat_allow_file_attachments', true);
  const allowImagePaste = getSettingValue('chat_allow_image_paste', true);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle clipboard paste for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type.startsWith('image/'));
      
      if (imageItem && selectedUser && conversation && allowImagePaste) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          // Create a more descriptive filename for pasted images
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const renamedFile = new File([file], `screenshot-${timestamp}.png`, { type: file.type });
          await handleFileUpload(renamedFile);
        }
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('paste', handlePaste);
      return () => container.removeEventListener('paste', handlePaste);
    }
  }, [selectedUser, conversation, onSendFile, allowImagePaste]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedUser || !conversation) return;

    await onSendMessage(inputMessage.trim());
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedUser || !conversation) return;
    await onSendFile(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(allowFileAttachments || allowImagePaste);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith('image/');
      
      // Only allow if file attachments are enabled or if it's an image and image paste is enabled
      if (allowFileAttachments || (isImage && allowImagePaste)) {
        handleFileUpload(file);
      }
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.sender_id === currentUser?.id;
    const messageTime = format(new Date(message.created_at), 'HH:mm', { locale: es });

    return (
      <MessageContextMenu
        key={message.id}
        message={message}
        onCopy={copyMessage}
      >
        <div
          className={cn(
            "flex gap-3 p-3 rounded-lg group max-w-[80%]",
            isOwnMessage 
              ? "flex-row-reverse bg-primary/10 ml-auto" 
              : "bg-muted/50 mr-auto"
          )}
        >
          {/* Avatar */}
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">
              {message.sender.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Message content */}
          <div className={cn("min-w-0", isOwnMessage ? "text-right" : "text-left")}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {message.sender.full_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {messageTime}
              </span>
            </div>

            {/* Message body */}
            <div className="space-y-2">
              {message.message_type === 'text' && message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}

              {message.message_type === 'image' && message.file_url && (
                <div className="space-y-2">
                  <div className="relative group">
                    <img 
                      src={message.file_url} 
                      alt={message.file_name || 'Imagen'} 
                      className="max-w-[320px] md:max-w-sm w-full rounded-lg shadow-md object-cover border border-border"
                      style={{ maxHeight: '240px' }}
                      loading="lazy"
                    />
                    <button
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      onClick={() => setLightboxImage({
                        src: message.file_url!,
                        alt: message.file_name || 'Imagen',
                        fileName: message.file_name || undefined
                      })}
                      aria-label="Ver imagen en tamaño completo"
                    >
                      <Eye className="h-8 w-8 text-white drop-shadow-lg" />
                    </button>
                  </div>
                  {message.file_name && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {message.file_name}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                          onClick={() => window.open(message.file_url!, '_blank')}
                          title="Ver imagen"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = message.file_url!;
                            link.download = message.file_name!;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          title="Descargar imagen"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {message.message_type === 'file' && message.file_url && (
                <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border hover:bg-background/80 transition-colors">
                  <div className="flex-shrink-0">
                    {message.file_type?.startsWith('image/') ? (
                      <ImageIcon className="h-8 w-8 text-blue-500" />
                    ) : message.file_type?.includes('pdf') ? (
                      <FileText className="h-8 w-8 text-red-500" />
                    ) : message.file_type?.includes('video/') ? (
                      <FileText className="h-8 w-8 text-purple-500" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {message.file_size ? `${(message.file_size / 1024 / 1024).toFixed(2)} MB` : 'Archivo'}
                      </span>
                      {message.file_type && (
                        <>
                          <span>•</span>
                          <span className="uppercase">
                            {message.file_type.split('/')[1] || 'FILE'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {message.file_type?.includes('pdf') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(message.file_url!, '_blank')}
                        className="shrink-0"
                        title="Abrir PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = message.file_url!;
                        link.download = message.file_name || 'archivo';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="shrink-0"
                      title="Descargar archivo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MessageContextMenu>
    );
  };

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Selecciona un usuario</h3>
          <p className="text-sm">Elige un usuario de la lista para comenzar a chatear</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={chatContainerRef} className="flex flex-col h-full" tabIndex={0}>
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/50">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedUser.avatar_url} alt={selectedUser.full_name} />
            <AvatarFallback>
              {selectedUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{selectedUser.full_name}</h3>
            <div className="flex items-center space-x-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                selectedUser.is_online ? "bg-green-500" : "bg-gray-400"
              )} />
              <span className="text-sm text-muted-foreground">
                {selectedUser.is_online ? 'En línea' : 'Desconectado'}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedUser.area}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 relative">
        <ScrollArea 
          className="h-[calc(100vh-300px)] p-4 pr-6"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay mensajes aún</p>
                <p className="text-sm">Comienza la conversación enviando un mensaje</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary/50 flex items-center justify-center z-10">
            <div className="text-center">
              <Paperclip className="h-12 w-12 mx-auto mb-2 text-primary" />
              <p className="text-lg font-medium text-primary">Suelta el archivo aquí</p>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-background/50">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Escribe un mensaje a ${selectedUser.full_name}...`}
                disabled={isLoading}
                className="flex-1"
              />
              
              {/* File upload button - only show if file attachments are allowed */}
              {allowFileAttachments && (
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              )}
              
              {/* Send button */}
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxImage?.src || ''}
        alt={lightboxImage?.alt || ''}
        fileName={lightboxImage?.fileName}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};