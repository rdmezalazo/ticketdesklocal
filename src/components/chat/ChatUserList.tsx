import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatUser } from "@/hooks/chat/types";
import { Shield, User, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatUserListProps {
  users: ChatUser[];
  selectedUser: ChatUser | null;
  onUserSelect: (user: ChatUser) => void;
  canSelectUser: (user: ChatUser) => boolean;
  isLoading: boolean;
}

export const ChatUserList = ({ 
  users, 
  selectedUser, 
  onUserSelect, 
  canSelectUser, 
  isLoading 
}: ChatUserListProps) => {
  
  const getStatusColor = (status: string, isOnline: boolean) => {
    if (isOnline) return "bg-green-500";
    return "bg-gray-400";
  };

  const getRoleIcon = (role: string) => {
    if (role === 'ti' || role === 'gerencia') {
      return <Shield className="h-3 w-3 text-blue-500" />;
    }
    return <User className="h-3 w-3 text-gray-500" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ti') return <Badge variant="secondary" className="text-xs">TI</Badge>;
    if (role === 'gerencia') return <Badge variant="secondary" className="text-xs">Admin</Badge>;
    return <Badge variant="outline" className="text-xs">Usuario</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-3 w-[80px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No hay usuarios disponibles</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)] pr-4">
      <div className="space-y-2 pr-2">
        {users.map((user) => {
          const isSelectable = canSelectUser(user);
          const isSelected = selectedUser?.user_id === user.user_id;
          
          return (
            <Button
              key={user.id}
              variant={isSelected ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start p-3 h-auto",
                isSelectable ? "hover:bg-accent" : "opacity-50 cursor-not-allowed",
                isSelected && "bg-accent"
              )}
              onClick={() => isSelectable && onUserSelect(user)}
              disabled={!isSelectable}
            >
              <div className="flex items-center space-x-3 w-full">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback className="text-sm">
                      {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Status indicator */}
                  <div 
                    className={cn(
                      "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
                      getStatusColor(user.status, user.is_online)
                    )}
                  />
                </div>

                {/* User info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm truncate">
                      {user.full_name}
                    </span>
                    {getRoleIcon(user.role)}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center space-x-1">
                      {user.is_online ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {user.is_online ? 'En línea' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {user.area}
                    </span>
                    {getRoleBadge(user.role)}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
};