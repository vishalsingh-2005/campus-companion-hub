import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Search,
  MoreHorizontal,
  UserCheck,
  UserMinus,
  Trash2,
  Loader2,
  Plus,
  Download,
  Users,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useEvents } from '@/hooks/useEvents';
import { useEventAttendance } from '@/hooks/useEventAttendance';
import { useEventRegistrations } from '@/hooks/useEvents';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

export default function EventAttendance() {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newAttendee, setNewAttendee] = useState({
    participant_name: '',
    participant_email: '',
    notes: '',
  });

  const { events, isLoading: eventsLoading } = useEvents({ createdByMe: true });
  const { attendance, isLoading, recordAttendance, checkOutParticipant, deleteAttendance } =
    useEventAttendance(selectedEventId);
  const { registrations } = useEventRegistrations(selectedEventId);

  const publishedEvents = events.filter((e) => e.status === 'published' || e.status === 'completed');

  const filteredAttendance = attendance.filter(
    (a) =>
      a.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.participant_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddAttendee = async () => {
    if (!selectedEventId || !newAttendee.participant_name || !newAttendee.participant_email) return;

    await recordAttendance.mutateAsync({
      event_id: selectedEventId,
      participant_name: newAttendee.participant_name,
      participant_email: newAttendee.participant_email,
      attendance_method: 'manual',
      notes: newAttendee.notes || undefined,
    });

    setNewAttendee({ participant_name: '', participant_email: '', notes: '' });
    setAddDialogOpen(false);
  };

  const handleQuickCheckIn = async (registration: any) => {
    await recordAttendance.mutateAsync({
      event_id: selectedEventId,
      registration_id: registration.id,
      participant_name: registration.participant_name,
      participant_email: registration.participant_email,
      attendance_method: 'registration',
    });
  };

  const handleCheckOut = async (id: string) => {
    await checkOutParticipant.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteAttendance.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const exportAttendance = () => {
    const headers = ['Name', 'Email', 'Check-in Time', 'Check-out Time', 'Method'];
    const rows = filteredAttendance.map((a) => [
      a.participant_name,
      a.participant_email,
      format(new Date(a.check_in_time), 'yyyy-MM-dd HH:mm'),
      a.check_out_time ? format(new Date(a.check_out_time), 'yyyy-MM-dd HH:mm') : '',
      a.attendance_method,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${selectedEventId}.csv`;
    a.click();
  };

  // Find registrations that haven't been marked as attended yet
  const pendingRegistrations = registrations.filter(
    (reg) => !attendance.some((a) => a.registration_id === reg.id)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Event Attendance"
          description="Track and manage event attendance"
          showBackButton
        />

        {/* Event Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Event</CardTitle>
            <CardDescription>Choose an event to manage attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {publishedEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} - {format(new Date(event.start_date), 'MMM d, yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEventId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Registered</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    {registrations.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Attended</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2 text-success">
                    <UserCheck className="h-5 w-5" />
                    {attendance.length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Attendance Rate</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2 text-info">
                    <Clock className="h-5 w-5" />
                    {registrations.length > 0
                      ? Math.round((attendance.length / registrations.length) * 100)
                      : 0}
                    %
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Quick Check-in from Registrations */}
            {pendingRegistrations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Check-in</CardTitle>
                  <CardDescription>
                    {pendingRegistrations.length} registered participants not yet checked in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {pendingRegistrations.slice(0, 10).map((reg) => (
                      <Button
                        key={reg.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickCheckIn(reg)}
                        disabled={recordAttendance.isPending}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        {reg.participant_name}
                      </Button>
                    ))}
                    {pendingRegistrations.length > 10 && (
                      <span className="text-sm text-muted-foreground self-center">
                        +{pendingRegistrations.length - 10} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>All checked-in participants</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={exportAttendance} disabled={attendance.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manual
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search attendees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredAttendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records yet
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.participant_name}</TableCell>
                            <TableCell>{record.participant_email}</TableCell>
                            <TableCell>
                              {format(new Date(record.check_in_time), 'h:mm a')}
                            </TableCell>
                            <TableCell>
                              {record.check_out_time ? (
                                format(new Date(record.check_out_time), 'h:mm a')
                              ) : (
                                <Badge variant="secondary">Present</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.attendance_method}</Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!record.check_out_time && (
                                    <DropdownMenuItem onClick={() => handleCheckOut(record.id)}>
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Check Out
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteId(record.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add Manual Attendee Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Attendee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newAttendee.participant_name}
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, participant_name: e.target.value })
                }
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newAttendee.participant_email}
                onChange={(e) =>
                  setNewAttendee({ ...newAttendee, participant_email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={newAttendee.notes}
                onChange={(e) => setNewAttendee({ ...newAttendee, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddAttendee}
                disabled={
                  !newAttendee.participant_name ||
                  !newAttendee.participant_email ||
                  recordAttendance.isPending
                }
              >
                {recordAttendance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Attendee
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Attendance Record"
        description="Are you sure you want to delete this attendance record?"
      />
    </DashboardLayout>
  );
}
