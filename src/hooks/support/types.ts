export interface SupportMessage {
  id: string;
  content: string | null;
  sender_id: string;
  message_type: string;
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

export interface SupportParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_seen: string;
  is_online: boolean;
  is_typing: boolean;
  user: {
    full_name: string;
    email: string;
    role: string;
    area: string;
    status?: string;
  };
}

export interface SupportConversation {
  id: string;
  title: string | null;
  status: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}