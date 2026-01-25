import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, UserCheck, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useEventRegistrations, type Event } from '@/hooks/useEvents';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

interface RegistrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export function RegistrationsDialog({ open, onOpenChange, event }: RegistrationsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { registrations, isLoading, checkInParticipant, deleteRegistration } =
    useEventRegistrations(event?.id);

  const filteredRegistrations = registrations.filter(
    (r) =>
      r.participant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.participant_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string, checkedInAt: string | null) => {
    if (checkedInAt) {
      return <Badge className="bg-success/10 text-success">Checked In</Badge>;
    }
    switch (status) {
      case 'registered':
        return <Badge className="bg-info/10 text-info">Registered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCheckIn = async (id: string) => {
    await checkInParticipant.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteRegistration.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (!event) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Registrations - {event.title}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredRegistrations.length} registration(s)
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No registrations found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        {registration.participant_name}
                      </TableCell>
                      <TableCell>{registration.participant_email}</TableCell>
                      <TableCell>{registration.participant_phone || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(registration.registered_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(registration.status, registration.checked_in_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!registration.checked_in_at && (
                              <DropdownMenuItem onClick={() => handleCheckIn(registration.id)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Check In
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(registration.id)}
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Registration"
        description="Are you sure you want to delete this registration? This action cannot be undone."
      />
    </>
  );
}
