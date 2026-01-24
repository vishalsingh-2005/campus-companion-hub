import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveSession, useSessionParticipants, useLiveKitToken, useSessionChat, useSendChatMessage } from '@/hooks/useLiveSessions';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Phone,
  Users,
  MessageSquare,
  Hand,
  Settings,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LiveRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, isLoading: sessionLoading } = useLiveSession(sessionId);
  const { participants, refetch: refetchParticipants } = useSessionParticipants(sessionId);
  const { messages, refetch: refetchMessages } = useSessionChat(sessionId);
  const sendChatMessage = useSendChatMessage();
  const { createRoom, joinRoom, endRoom, approveParticipant } = useLiveKitToken();

  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const participantName = user?.user_metadata?.full_name || user?.email || 'Participant';

  useEffect(() => {
    if (session && user) {
      setIsHost(session.host_id === user.id);
    }
  }, [session, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to chat updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = (window as any).supabase
      ?.channel(`chat-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_chat',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        refetchMessages();
      })
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [sessionId, refetchMessages]);

  const handleStartSession = async () => {
    if (!sessionId) return;
    
    setIsConnecting(true);
    try {
      const data = await createRoom(sessionId, participantName);
      setToken(data.token);
      setLivekitUrl(data.livekitUrl);
      setIsHost(true);
      toast.success('Session started successfully');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionId) return;
    
    setIsConnecting(true);
    try {
      const data = await joinRoom(sessionId, participantName);
      
      if (data.status === 'waiting') {
        setWaitingForApproval(true);
        toast.info('Waiting for host approval...');
        // Poll for approval
        const pollInterval = setInterval(async () => {
          try {
            const retryData = await joinRoom(sessionId, participantName);
            if (retryData.token) {
              clearInterval(pollInterval);
              setWaitingForApproval(false);
              setToken(retryData.token);
              setLivekitUrl(retryData.livekitUrl);
              setIsHost(retryData.isHost);
              toast.success('You have been approved to join');
            }
          } catch (e) {
            // Still waiting
          }
        }, 3000);
        return;
      }

      setToken(data.token);
      setLivekitUrl(data.livekitUrl);
      setIsHost(data.isHost);
      toast.success('Joined session successfully');
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    
    try {
      await endRoom(sessionId);
      toast.success('Session ended');
      navigate('/live-sessions');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    }
  };

  const handleApproveParticipant = async (participantId: string) => {
    try {
      await approveParticipant(participantId);
      refetchParticipants();
      toast.success('Participant approved');
    } catch (error) {
      console.error('Error approving participant:', error);
      toast.error('Failed to approve participant');
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !sessionId) return;
    
    try {
      await sendChatMessage.mutateAsync({
        sessionId,
        message: chatMessage,
        senderName: participantName,
      });
      setChatMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (sessionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This session may have been deleted or you don't have access.
            </p>
            <Button onClick={() => navigate('/live-sessions')}>
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Pre-join screen
  if (!token) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{session.title}</CardTitle>
                  <p className="text-muted-foreground mt-1">{session.description}</p>
                </div>
                <Badge variant={session.session_type === 'live_class' ? 'default' : 'secondary'}>
                  {session.session_type === 'live_class' ? 'Live Class' : 'Interview'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Scheduled Start</p>
                  <p className="font-medium">
                    {format(new Date(session.scheduled_start), 'PPp')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={session.status === 'live' ? 'default' : 'secondary'}
                    className={cn(
                      session.status === 'live' && 'bg-success text-success-foreground'
                    )}
                  >
                    {session.status}
                  </Badge>
                </div>
                {session.courses && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Course</p>
                    <p className="font-medium">
                      {session.courses.course_code} - {session.courses.course_name}
                    </p>
                  </div>
                )}
              </div>

              {waitingForApproval ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                  <h3 className="font-semibold mb-2">Waiting for Host Approval</h3>
                  <p className="text-muted-foreground">
                    The host will admit you shortly...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Device preview would go here */}
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Camera preview</p>
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    {isHost && session.status !== 'live' ? (
                      <Button
                        size="lg"
                        onClick={handleStartSession}
                        disabled={isConnecting}
                        className="min-w-[200px]"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-2" />
                            Start Session
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={handleJoinSession}
                        disabled={isConnecting || session.status === 'ended'}
                        className="min-w-[200px]"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            <Video className="h-4 w-4 mr-2" />
                            Join Session
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waiting room participants (for host) */}
          {isHost && participants.filter(p => !p.is_approved).length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Waiting Room ({participants.filter(p => !p.is_approved).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {participants.filter(p => !p.is_approved).map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <span>{participant.participant_name}</span>
                      <Button
                        size="sm"
                        onClick={() => handleApproveParticipant(participant.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Admit
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // In-session view with LiveKit
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold truncate max-w-[300px]">{session.title}</h1>
          <Badge variant="default" className="bg-success text-success-foreground">
            Live
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className={cn(showParticipants && 'bg-muted')}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className={cn(showChat && 'bg-muted')}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          {isHost && (
            <Button variant="destructive" size="sm" onClick={handleEndSession}>
              <Phone className="h-4 w-4 mr-1" />
              End
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative">
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl!}
            connect={true}
            video={true}
            audio={true}
            onDisconnected={() => {
              setToken(null);
              navigate('/live-sessions');
            }}
            style={{ height: '100%' }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>

        {/* Side panels */}
        {(showChat || showParticipants) && (
          <div className="w-80 border-l flex flex-col">
            {/* Participants panel */}
            {showParticipants && (
              <div className="border-b p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participants ({participants.filter(p => p.is_approved).length})
                </h3>
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {participants.filter(p => p.is_approved).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {p.participant_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.participant_name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {p.role}
                          </p>
                        </div>
                        {p.hand_raised && (
                          <Hand className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Waiting room (for host) */}
                {isHost && participants.filter(p => !p.is_approved).length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Waiting ({participants.filter(p => !p.is_approved).length})
                    </h4>
                    <div className="space-y-2">
                      {participants.filter(p => !p.is_approved).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted"
                        >
                          <span className="text-sm truncate">{p.participant_name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApproveParticipant(p.id)}
                          >
                            Admit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat panel */}
            {showChat && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </h3>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {msg.sender_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!chatMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
