import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  Paperclip,
  AtSign,
  Check
} from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUsers } from '@/hooks/useUsers';

interface RichTextEditorWithMentionsProps {
  content: string;
  onChange: (content: string) => void;
  onMentionsChange?: (mentions: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditorWithMentions = ({ 
  content, 
  onChange, 
  onMentionsChange,
  placeholder, 
  className 
}: RichTextEditorWithMentionsProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();
  const { users, fetchUsers } = useUsers();

  const extractMentions = useCallback((htmlContent: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const mentionElements = doc.querySelectorAll('.mention[data-user-id]');
    const mentions = Array.from(mentionElements).map(el => el.getAttribute('data-user-id')).filter(Boolean);
    return mentions as string[];
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
      }),
      Link.configure({
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        renderHTML({ options, node }) {
          return [
            'span',
            {
              class: 'mention',
              'data-user-id': node.attrs.id,
              'data-id': node.attrs.id,
            },
            `@${node.attrs.label}`,
          ];
        },
        renderText({ node }) {
          return `@${node.attrs.label}`;
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      onChange(htmlContent);
      
      // Extract mentions and notify parent
      if (onMentionsChange) {
        const mentions = extractMentions(htmlContent);
        onMentionsChange(mentions);
      }
    },
    onCreate: () => {
      fetchUsers();
    },
    editorProps: {
      attributes: {
        class: 'description-content focus:outline-none min-h-[100px] p-3',
      },
      handlePaste: (view, event, slice) => {
        const items = Array.from(event.clipboardData?.items || []);
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadImageFile(file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addImage = () => {
    if (imageUrl) {
      editor?.commands.setImage({ src: imageUrl });
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `editor-images/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);
        
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);
        
      editor?.commands.setImage({ src: publicUrl });
      
      toast({
        title: "Imagen subida",
        description: "La imagen se ha agregado correctamente.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadImageFile(file);
    }
    event.target.value = '';
  };

  const insertMention = (user: any) => {
    // Use Tiptap's mention command to insert mentions properly
    editor?.chain().focus().insertContent({
      type: 'mention',
      attrs: {
        id: user.user_id,
        label: user.full_name,
      },
    }).insertContent(' ').run();
    
    // Add to selected users for tracking
    if (!selectedUsers.includes(user.user_id)) {
      const newSelectedUsers = [...selectedUsers, user.user_id];
      setSelectedUsers(newSelectedUsers);
      onMentionsChange?.(newSelectedUsers);
    }
    
    setShowMentions(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-md', className)}>
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.commands.toggleBold()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.commands.toggleItalic()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.commands.toggleBulletList()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.commands.toggleOrderedList()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Popover open={showMentions} onOpenChange={setShowMentions}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Mencionar usuario (@)"
            >
              <AtSign className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar usuario..." />
              <CommandList>
                <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                <CommandGroup heading="Usuarios">
                  {users.map((user) => (
                    <CommandItem
                      key={user.user_id}
                      value={user.full_name}
                      onSelect={() => insertMention(user)}
                      className="flex items-center gap-2"
                    >
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      {selectedUsers.includes(user.user_id) && (
                        <Check className="h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowImageDialog(true)}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleFileAttachment}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>
      
      <EditorContent editor={editor} className="min-h-[100px]" />
      
      {showImageDialog && (
        <div className="p-3 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              placeholder="URL de la imagen"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addImage()}
            />
            <Button type="button" size="sm" onClick={addImage}>
              Agregar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowImageDialog(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*"
      />
    </div>
  );
};