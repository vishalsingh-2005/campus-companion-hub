import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { Event } from '@/hooks/useEvents';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

const eventTypes = [
  { value: 'seminar', label: 'Seminar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'conference', label: 'Conference' },
  { value: 'competition', label: 'Competition' },
  { value: 'cultural', label: 'Cultural Event' },
  { value: 'sports', label: 'Sports Event' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'general', label: 'General' },
];

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSubmit,
  isLoading,
}: EventFormDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'general',
    venue: '',
    start_date: '',
    end_date: '',
    max_participants: '',
    registration_deadline: '',
    status: 'draft',
    is_public: true,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        venue: event.venue || '',
        start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
        end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
        max_participants: event.max_participants?.toString() || '',
        registration_deadline: event.registration_deadline
          ? new Date(event.registration_deadline).toISOString().slice(0, 16)
          : '',
        status: event.status,
        is_public: event.is_public,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        event_type: 'general',
        venue: '',
        start_date: '',
        end_date: '',
        max_participants: '',
        registration_deadline: '',
        status: 'draft',
        is_public: true,
      });
    }
  }, [event, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: formData.title,
      description: formData.description || null,
      event_type: formData.event_type,
      venue: formData.venue || null,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      registration_deadline: formData.registration_deadline
        ? new Date(formData.registration_deadline).toISOString()
        : null,
      status: formData.status,
      is_public: formData.is_public,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter event title"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the event..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder="Event location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants</Label>
              <Input
                id="max_participants"
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_deadline">Registration Deadline</Label>
              <Input
                id="registration_deadline"
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={(e) =>
                  setFormData({ ...formData, registration_deadline: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label htmlFor="is_public" className="cursor-pointer">
                Public Event (visible to everyone)
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
