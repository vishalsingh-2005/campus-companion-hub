import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Loader2, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploadProps {
  currentUrl: string | null;
  onUpload: (url: string | null) => void;
  folder: 'students' | 'teachers';
  entityId?: string;
  name?: string;
  disabled?: boolean;
}

export function ProfilePhotoUpload({
  currentUrl,
  onUpload,
  folder,
  entityId,
  name = '',
  disabled = false,
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    if (!name) return '?';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0]?.[0]?.toUpperCase() || '?';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${entityId || crypto.randomUUID()}_${Date.now()}.${fileExt}`;

      // Delete old file if exists
      if (currentUrl) {
        const oldPath = currentUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-photos').remove([oldPath]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onUpload(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;

    setUploading(true);
    try {
      // Extract path from URL
      const urlParts = currentUrl.split('/profile-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('profile-photos').remove([filePath]);
      }

      setPreviewUrl(null);
      onUpload(null);
      toast.success('Photo removed');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
          <AvatarImage src={previewUrl || undefined} alt={name} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {!disabled && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer',
              uploading && 'opacity-100'
            )}
            onClick={() => !uploading && inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {previewUrl ? 'Change' : 'Upload'}
          </Button>
          
          {previewUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
