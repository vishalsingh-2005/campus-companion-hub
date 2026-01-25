import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Megaphone,
  Bell,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { useEvents } from '@/hooks/useEvents';
import { useEventAnnouncements, type EventAnnouncement } from '@/hooks/useEventAnnouncements';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

export default function EventAnnouncements() {
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<EventAnnouncement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    event_id: '',
    title: '',
    message: '',
    priority: 'normal',
    is_global: false,
  });

  const { events } = useEvents({ createdByMe: true });
  const { announcements, isLoading, createAnnouncement, updateAnnouncement, deleteAnnouncement } =
    useEventAnnouncements();

  const resetForm = () => {
    setFormData({
      event_id: '',
      title: '',
      message: '',
      priority: 'normal',
      is_global: false,
    });
    setSelectedAnnouncement(null);
  };

  const handleCreate = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  const handleEdit = (announcement: EventAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      event_id: announcement.event_id || '',
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      is_global: announcement.is_global,
    });
    setFormDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      title: formData.title,
      message: formData.message,
      priority: formData.priority,
      is_global: formData.is_global,
      event_id: formData.is_global ? null : formData.event_id || null,
    };

    if (selectedAnnouncement) {
      await updateAnnouncement.mutateAsync({ id: selectedAnnouncement.id, ...payload });
    } else {
      await createAnnouncement.mutateAsync(payload);
    }

    setFormDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAnnouncement.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High
          </Badge>
        );
      case 'normal':
        return (
          <Badge className="bg-info/10 text-info">
            <Bell className="h-3 w-3 mr-1" />
            Normal
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="secondary">
            <Info className="h-3 w-3 mr-1" />
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Announcements"
          description="Send announcements to event participants"
          showBackButton
          actions={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          }
        />

        {/* Announcements List */}
        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No Announcements Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first announcement to notify participants
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Announcement
                </Button>
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id} className="group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        {getPriorityBadge(announcement.priority)}
                        {announcement.is_global && (
                          <Badge variant="outline" className="text-primary border-primary">
                            Global
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {announcement.events?.title
                          ? `For: ${announcement.events.title}`
                          : 'All Events'}
                        {' • '}
                        {format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(announcement.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.message}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="is_global"
                checked={formData.is_global}
                onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked })}
              />
              <Label htmlFor="is_global">Global Announcement (visible to all)</Label>
            </div>

            {!formData.is_global && (
              <div className="space-y-2">
                <Label>Event</Label>
                <Select
                  value={formData.event_id}
                  onValueChange={(value) => setFormData({ ...formData, event_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Write your announcement..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.title ||
                  !formData.message ||
                  createAnnouncement.isPending ||
                  updateAnnouncement.isPending
                }
              >
                {(createAnnouncement.isPending || updateAnnouncement.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {selectedAnnouncement ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        description="Are you sure you want to delete this announcement?"
      />
    </DashboardLayout>
  );
}
