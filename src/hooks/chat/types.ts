export interface ChatUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  area: string;
  status: string;
  last_seen: string;
  is_online: boolean;
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  content: string | null;
  sender_id: string;
  message_type: 'text' | 'image' | 'file';
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
  conversation_id: string;
  sender: {
    full_name: string;
    email: string;
  };
}

export interface ChatConversation {
  id: string;
  title: string | null;
  status: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface MessageContextMenuAction {
  type: 'copy' | 'forward' | 'create_ticket';
  label: string;
  icon: React.ComponentType<any>;
}