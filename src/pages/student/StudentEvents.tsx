import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Search,
  CalendarCheck,
  PartyPopper,
  Filter,
  CheckCircle2,
  Ticket,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  venue: string | null;
  start_date: string;
  end_date: string | null;
  max_participants: number | null;
  registration_deadline: string | null;
  status: string;
  is_public: boolean;
  registration_count?: number;
  is_registered?: boolean;
}

const eventTypeColors: Record<string, string> = {
  seminar: 'bg-blue-500/10 text-blue-500',
  workshop: 'bg-purple-500/10 text-purple-500',
  conference: 'bg-orange-500/10 text-orange-500',
  competition: 'bg-red-500/10 text-red-500',
  cultural: 'bg-pink-500/10 text-pink-500',
  sports: 'bg-green-500/10 text-green-500',
  general: 'bg-gray-500/10 text-gray-500',
};

export default function StudentEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Fetch student data
  const { data: student } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, phone')
        .eq('user_id', user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch public events
  const { data: events, isLoading } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'published')
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Get registration counts and check user registrations
      const eventsWithDetails = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          // Check if current user is registered
          let isRegistered = false;
          if (user?.id) {
            const { data: registration } = await supabase
              .from('event_registrations')
              .select('id')
              .eq('event_id', event.id)
              .eq('user_id', user.id)
              .maybeSingle();
            isRegistered = !!registration;
          }

          return {
            ...event,
            registration_count: count || 0,
            is_registered: isRegistered,
          };
        })
      );

      return eventsWithDetails as Event[];
    },
  });

  // Register for event mutation
  const registerMutation = useMutation({
    mutationFn: async (event: Event) => {
      if (!student) throw new Error('Student profile not found');

      const { error } = await supabase.from('event_registrations').insert({
        event_id: event.id,
        user_id: user?.id,
        student_id: student.id,
        participant_name: `${student.first_name} ${student.last_name}`,
        participant_email: student.email,
        participant_phone: student.phone,
        status: 'registered',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-events'] });
      toast.success('Successfully registered for the event!');
      setSelectedEvent(null);
      setIsRegistering(false);
    },
    onError: (error: Error) => {
      toast.error(`Registration failed: ${error.message}`);
      setIsRegistering(false);
    },
  });

  const handleRegister = () => {
    if (!selectedEvent) return;
    setIsRegistering(true);
    registerMutation.mutate(selectedEvent);
  };

  // Filter events
  const filteredEvents = events?.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const upcomingEvents = filteredEvents.filter((e) => isFuture(parseISO(e.start_date)));
  const pastEvents = filteredEvents.filter((e) => isPast(parseISO(e.start_date)));
  const registeredEvents = filteredEvents.filter((e) => e.is_registered);

  const canRegister = (event: Event) => {
    if (event.is_registered) return false;
    if (isPast(parseISO(event.start_date))) return false;
    if (event.registration_deadline && isPast(parseISO(event.registration_deadline))) return false;
    if (event.max_participants && event.registration_count && event.registration_count >= event.max_participants) return false;
    return true;
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="absolute top-4 left-4 z-10">
          <Badge className={cn('capitalize', eventTypeColors[event.event_type] || eventTypeColors.general)}>
            {event.event_type}
          </Badge>
        </div>
        {event.is_registered && (
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="default" className="gap-1 bg-success text-success-foreground">
              <CheckCircle2 className="h-3 w-3" />
              Registered
            </Badge>
          </div>
        )}
        <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">
              {format(parseISO(event.start_date), 'd')}
            </p>
            <p className="text-sm font-medium text-primary">
              {format(parseISO(event.start_date), 'MMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </CardTitle>
        {event.description && (
          <CardDescription className="line-clamp-2">
            {event.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>{format(parseISO(event.start_date), 'EEEE, MMM d, yyyy • h:mm a')}</span>
        </div>
        {event.venue && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{event.venue}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>
            {event.registration_count} registered
            {event.max_participants && ` / ${event.max_participants} max`}
          </span>
        </div>
        {event.registration_deadline && (
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <span>
              Deadline: {format(parseISO(event.registration_deadline), 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        {canRegister(event) ? (
          <Button
            className="w-full gap-2"
            onClick={() => setSelectedEvent(event)}
          >
            <Ticket className="h-4 w-4" />
            Register Now
          </Button>
        ) : event.is_registered ? (
          <Button variant="secondary" className="w-full gap-2" disabled>
            <CheckCircle2 className="h-4 w-4" />
            Already Registered
          </Button>
        ) : isPast(parseISO(event.start_date)) ? (
          <Button variant="outline" className="w-full" disabled>
            Event Ended
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Registration Closed
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader title="Events" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Campus Events"
          description="Browse and register for upcoming campus events"
          backTo="/dashboard"
        />

        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registeredEvents.length}</p>
                <p className="text-sm text-muted-foreground">My Registrations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pastEvents.length}</p>
                <p className="text-sm text-muted-foreground">Past Events</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events by name, type, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-2">
              <PartyPopper className="h-4 w-4" />
              Upcoming ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="registered" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              My Registrations ({registeredEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <Calendar className="h-4 w-4" />
              Past ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6">
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <PartyPopper className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Upcoming Events</h3>
                  <p className="text-muted-foreground">Check back later for new events!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="registered" className="space-y-6">
            {registeredEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Registrations Yet</h3>
                  <p className="text-muted-foreground">Register for events to see them here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {registeredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-6">
            {pastEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Past Events</h3>
                  <p className="text-muted-foreground">Past events will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Registration Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register for Event</DialogTitle>
            <DialogDescription>
              Confirm your registration for this event
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <h4 className="font-semibold">{selectedEvent.title}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(parseISO(selectedEvent.start_date), 'EEEE, MMM d, yyyy • h:mm a')}
                  </p>
                  {selectedEvent.venue && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedEvent.venue}
                    </p>
                  )}
                </div>
              </div>

              {student && (
                <div className="p-4 rounded-lg border space-y-2">
                  <p className="text-sm font-medium">Registering as:</p>
                  <p className="text-sm text-muted-foreground">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{student.email}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={isRegistering}>
              {isRegistering ? 'Registering...' : 'Confirm Registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
