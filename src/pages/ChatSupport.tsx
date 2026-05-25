import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatUserList } from "@/components/chat/ChatUserList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useChatSupport } from "@/hooks/chat/useChatSupport";
import { MessageSquare, Users, RefreshCw } from "lucide-react";
import { ChatUser } from "@/hooks/chat/types";

const ChatSupport = () => {
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const {
    users,
    messages,
    conversation,
    currentUser,
    userRole,
    isLoading,
    selectedUserId,
    sendMessage,
    sendFile,
    loadConversationHistory,
    moveUserToTop,
    refreshUsers,
  } = useChatSupport();

  // Keep selectedUser in sync with the conversation
  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.user_id === selectedUserId);
      if (user && user.user_id !== selectedUser?.user_id) {
        console.log('Updating selected user based on conversation:', user);
        setSelectedUser(user);
      }
    }
  }, [selectedUserId, users, selectedUser]);

  const handleUserSelect = async (user: ChatUser) => {
    if (!currentUser) return;
    
    // Solo permite seleccionar admin si es usuario regular, o cualquiera si es admin
    if (userRole !== 'ti' && userRole !== 'gerencia' && user.role !== 'ti' && user.role !== 'gerencia') {
      return;
    }
    
    setSelectedUser(user);
    // Mover el usuario seleccionado al top de la lista
    moveUserToTop(user.user_id);
    await loadConversationHistory(user.user_id);
  };

  const canSelectUser = (user: ChatUser): boolean => {
    if (!currentUser) return false;
    
    // Admin puede seleccionar cualquier usuario
    if (userRole === 'ti' || userRole === 'gerencia') {
      return user.user_id !== currentUser.id;
    }
    
    // Usuario regular solo puede seleccionar admin
    return user.role === 'ti' || user.role === 'gerencia';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chat de Soporte</h1>
            <p className="text-sm text-muted-foreground">Comunicación en tiempo real</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Users List */}
        <div className="lg:col-span-1">
          <Card className="h-full p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Usuarios</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshUsers}
                className="h-8 w-8 p-0"
                title="Actualizar lista de usuarios"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <ChatUserList
              users={users}
              selectedUser={selectedUser}
              onUserSelect={handleUserSelect}
              canSelectUser={canSelectUser}
              isLoading={isLoading}
            />
          </Card>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <ChatWindow
              selectedUser={selectedUser}
              messages={messages}
              conversation={conversation}
              currentUser={currentUser}
              onSendMessage={sendMessage}
              onSendFile={sendFile}
              isLoading={isLoading}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatSupport;