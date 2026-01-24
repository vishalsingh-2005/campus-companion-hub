import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateSession, useUpdateSession, LiveSession } from '@/hooks/useLiveSessions';
import { useCourses } from '@/hooks/useCourses';

interface SessionFormData {
  title: string;
  description: string;
  session_type: 'live_class' | 'interview';
  course_id: string;
  scheduled_start: string;
  scheduled_end: string;
  max_participants: number;
  enable_chat: boolean;
  enable_screen_share: boolean;
  enable_waiting_room: boolean;
}

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: LiveSession | null;
}

export function SessionFormDialog({ open, onOpenChange, session }: SessionFormDialogProps) {
  const { courses } = useCourses();
  const createSession = useCreateSession();
  const updateSession = useUpdateSession();
  
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<SessionFormData>({
    defaultValues: session ? {
      title: session.title,
      description: session.description || '',
      session_type: session.session_type,
      course_id: session.course_id || '',
      scheduled_start: session.scheduled_start ? format(new Date(session.scheduled_start), "yyyy-MM-dd'T'HH:mm") : '',
      scheduled_end: session.scheduled_end ? format(new Date(session.scheduled_end), "yyyy-MM-dd'T'HH:mm") : '',
      max_participants: session.max_participants,
      enable_chat: session.enable_chat,
      enable_screen_share: session.enable_screen_share,
      enable_waiting_room: session.enable_waiting_room,
    } : {
      title: '',
      description: '',
      session_type: 'live_class',
      course_id: '',
      scheduled_start: '',
      scheduled_end: '',
      max_participants: 100,
      enable_chat: true,
      enable_screen_share: true,
      enable_waiting_room: true,
    },
  });

  const sessionType = watch('session_type');
  const enableChat = watch('enable_chat');
  const enableScreenShare = watch('enable_screen_share');
  const enableWaitingRoom = watch('enable_waiting_room');

  const onSubmit = async (data: SessionFormData) => {
    try {
      const payload = {
        ...data,
        course_id: data.course_id || undefined,
        scheduled_end: data.scheduled_end || undefined,
      };

      if (session) {
        await updateSession.mutateAsync({ id: session.id, ...payload });
      } else {
        await createSession.mutateAsync(payload);
      }
      
      reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {session ? 'Edit Session' : 'Create New Session'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
              placeholder="Session title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Session description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Session Type *</Label>
            <Select
              value={sessionType}
              onValueChange={(value) => setValue('session_type', value as 'live_class' | 'interview')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live_class">Live Class</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sessionType === 'live_class' && (
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={watch('course_id') || 'none'}
                onValueChange={(value) => setValue('course_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.course_code} - {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Start Date & Time *</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                {...register('scheduled_start', { required: 'Start time is required' })}
              />
              {errors.scheduled_start && (
                <p className="text-sm text-destructive">{errors.scheduled_start.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled_end">End Date & Time</Label>
              <Input
                id="scheduled_end"
                type="datetime-local"
                {...register('scheduled_end')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <Input
              id="max_participants"
              type="number"
              {...register('max_participants', { valueAsNumber: true })}
              min={1}
              max={500}
            />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Session Settings</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="enable_chat">Enable Chat</Label>
              <Switch
                id="enable_chat"
                checked={enableChat}
                onCheckedChange={(checked) => setValue('enable_chat', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable_screen_share">Enable Screen Sharing</Label>
              <Switch
                id="enable_screen_share"
                checked={enableScreenShare}
                onCheckedChange={(checked) => setValue('enable_screen_share', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable_waiting_room">Enable Waiting Room</Label>
              <Switch
                id="enable_waiting_room"
                checked={enableWaitingRoom}
                onCheckedChange={(checked) => setValue('enable_waiting_room', checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSession.isPending || updateSession.isPending}>
              {session ? 'Update' : 'Create'} Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
