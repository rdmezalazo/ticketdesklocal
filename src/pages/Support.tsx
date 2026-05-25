import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Users, Circle, Paperclip, File, Download } from "lucide-react";
import { toast } from "sonner";
import { useSupport, SupportMessage } from "@/hooks/useSupport";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";

export default function Support() {
  const { user } = useAuth();
  const { messages, participants, allUsers, conversation, isLoading, userRole, selectedUser, sendMessage, sendFile, updatePresence, selectUser } = useSupport();
  const { getSettingValue } = useSettings();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get chat settings
  const allowFileAttachments = getSettingValue('chat_allow_file_attachments', true);
  const allowImagePaste = getSettingValue('chat_allow_image_paste', true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (participant: any) => {
    if (participant.is_typing) return 'Escribiendo...';
    if (participant.is_online) return 'En línea';
    return 'Desconectado';
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const showNotification = (message: string, type: 'sent' | 'received') => {
    // Only show toast for sent messages (received messages are handled globally in useSupport)
    if (type === 'sent') {
      toast(message, {
        description: 'Tu mensaje ha sido enviado',
        duration: 2000,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    
    await sendMessage(messageContent);
    showNotification(messageContent, 'sent');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      updatePresence(true, true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      updatePresence(true, false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    await sendFile(file);
    showNotification(`Archivo enviado: ${file.name}`, 'sent');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = (message: SupportMessage) => {
    const isFromUser = message.sender_id === user?.id;
    const messageTime = new Date(message.created_at).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <div
        key={message.id}
        className={`flex gap-3 ${isFromUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isFromUser && (
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarFallback>
              <Bot className="h-4 w-4 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
        )}
        
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isFromUser
              ? 'bg-primary text-primary-foreground ml-auto'
              : 'bg-muted text-foreground'
          }`}
        >
          {message.message_type === 'image' && message.file_url && (
            <div className="mb-2">
              <img 
                src={message.file_url} 
                alt="Imagen compartida" 
                className="max-w-full h-auto rounded-md cursor-pointer"
                onClick={() => window.open(message.file_url, '_blank')}
              />
            </div>
          )}
          
          {message.message_type === 'file' && message.file_url && (
            <div className="mb-2 p-2 border rounded-md bg-muted/50 flex items-center gap-2">
              <File className="h-4 w-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{message.file_name}</p>
                <p className="text-xs opacity-70">{formatFileSize(message.file_size || 0)}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(message.file_url, '_blank')}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {message.content && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs opacity-70">{messageTime}</p>
            {!isFromUser && (
              <p className="text-xs opacity-70">{message.sender?.full_name || 'Soporte'}</p>
            )}
          </div>
        </div>
        
        {isFromUser && (
          <Avatar className="h-8 w-8 bg-secondary">
            <AvatarFallback>
              <User className="h-4 w-4 text-secondary-foreground" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="p-6">
          <p className="text-muted-foreground">Debes iniciar sesión para acceder al canal de soporte.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Canal de Soporte</h1>
        <p className="text-muted-foreground">
          Chatea con nuestro equipo de soporte para resolver tus dudas y problemas
        </p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Main chat area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {userRole === 'ti' && selectedUser ? (
                <>
                  Chat con {selectedUser.user.full_name}
                  <Badge variant="outline" className="text-xs">
                    {selectedUser.user.email}
                  </Badge>
                </>
              ) : (
                <>
                  Chat de Soporte
                  {conversation && (
                    <Badge variant="secondary" className="text-xs">
                      {conversation.status === 'active' ? 'Activo' : 'Cerrado'}
                    </Badge>
                  )}
                </>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent 
            className="flex-1 flex flex-col p-0 relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {dragActive && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-10 flex items-center justify-center">
                <div className="text-center">
                  <Paperclip className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-primary font-medium">Suelta el archivo aquí</p>
                </div>
              </div>
            )}
            
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    {userRole === 'ti' && !selectedUser ? (
                      <>
                        <p className="text-muted-foreground">Selecciona un usuario de la lista</p>
                        <p className="text-muted-foreground">para iniciar o continuar la conversación.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground">¡Hola! Bienvenido al Canal de Soporte.</p>
                        <p className="text-muted-foreground">¿En qué puedo ayudarte hoy?</p>
                      </>
                    )}
                  </div>
                )}
                
                {messages.map(renderMessage)}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 bg-primary">
                      <AvatarFallback>
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted text-foreground rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => handleTyping(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={userRole === 'ti' && !selectedUser ? "Selecciona un usuario para enviar mensajes..." : "Escribe tu mensaje..."}
                  disabled={isLoading || (userRole === 'ti' && !selectedUser) || (!conversation && userRole !== 'ti')}
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                {/* File upload button - only show if file attachments are allowed */}
                {allowFileAttachments && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || (userRole === 'ti' && !selectedUser) || (!conversation && userRole !== 'ti')}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() || isLoading || (userRole === 'ti' && !selectedUser) || (!conversation && userRole !== 'ti')}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users sidebar */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="flex-shrink-0 border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {userRole === 'ti' ? `Todos los Usuarios (${allUsers.length})` : 'Administrador'}
            </CardTitle>
            {userRole === 'ti' ? (
              <p className="text-xs text-muted-foreground">Vista de administrador - Todos los usuarios del sistema</p>
            ) : (
              <p className="text-xs text-muted-foreground">Soporte técnico disponible</p>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="p-4 space-y-3">
                {(userRole === 'ti' ? allUsers : participants).map((participant) => (
                  <div 
                    key={participant.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                      userRole === 'ti' 
                        ? (selectedUser?.user_id === participant.user_id 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted/50')
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => userRole === 'ti' ? selectUser(participant) : undefined}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {participant.user.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Circle 
                        className={`absolute -bottom-1 -right-1 h-4 w-4 fill-current ${
                          participant.is_online ? 'text-green-500' : 'text-gray-500'
                        }`}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{participant.user.full_name}</p>
                        {participant.user.email === 'supervisorti@livigui.com' && (
                          <Badge variant="secondary" className="text-xs">Administrador</Badge>
                        )}
                        {participant.user.role === 'ti' && participant.user.email !== 'supervisorti@livigui.com' && (
                          <Badge variant="default" className="text-xs">TI</Badge>
                        )}
                        {participant.user.role === 'gerencia' && (
                          <Badge variant="outline" className="text-xs">Gerencia</Badge>
                        )}
                        {participant.user.status && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              participant.user.status === 'En Línea' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {participant.user.status}
                          </Badge>
                        )}
                      </div>
                      {userRole !== 'ti' && (
                        <p className="text-xs text-muted-foreground">Soporte Técnico</p>
                      )}
                      {userRole === 'ti' && (
                        <p className="text-xs text-muted-foreground truncate">{participant.user.email}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${getStatusColor(participant.is_online ? 'online' : 'offline')}`}>
                          {getStatusText(participant)}
                        </span>
                        {userRole === 'ti' && (
                          <span className="text-xs text-muted-foreground">• {participant.user.area}</span>
                        )}
                        {participant.is_typing && (
                          <div className="flex gap-1">
                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1 h-1 bg-primary rounded-full animate-bounce"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(userRole === 'ti' ? allUsers : participants).length === 0 && (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {userRole === 'ti' ? 'No hay usuarios en el sistema' : 'El administrador no está disponible'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="border-t p-4">
                <p className="text-xs text-muted-foreground mb-3">Información del Canal</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Supervisor:</span>
                    <span>supervisorti@livigui.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mensajes totales:</span>
                    <span>{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{userRole === 'ti' ? 'Total usuarios:' : 'Administrador:'}</span>
                    <span>{userRole === 'ti' ? allUsers.length : (participants.length > 0 ? 'Disponible' : 'No disponible')}</span>
                  </div>
                  {userRole === 'ti' && (
                    <div className="flex justify-between">
                      <span>En línea ahora:</span>
                      <span className="text-green-600">{allUsers.filter(u => u.is_online).length}</span>
                    </div>
                  )}
                  {conversation && (
                    <div className="flex justify-between">
                      <span>Estado:</span>
                      <span className="capitalize">{conversation.status}</span>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}