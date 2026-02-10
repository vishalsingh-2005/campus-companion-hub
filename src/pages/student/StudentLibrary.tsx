import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLibrary } from '@/hooks/useLibrary';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, BookCheck, Send, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';
import { supabase } from '@/integrations/supabase/client';

export default function StudentLibrary() {
  const { user } = useAuth();
  const { books, issues, requests, loading, requestBook } = useLibrary();
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function getStudentId() {
      if (!user) return;
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setStudentId(data.id);
    }
    getStudentId();
  }, [user]);

  const filteredBooks = books.filter(b => `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(search.toLowerCase()));
  const myIssues = issues.filter(i => i.student_id === studentId);
  const myRequests = requests.filter(r => r.student_id === studentId);
  const activeIssues = myIssues.filter(i => i.status === 'issued');

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Library" description="Browse books, view issued books, and request new ones" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available Books" value={books.filter(b => b.available_quantity > 0).length} icon={BookOpen} />
        <StatCard title="My Issued Books" value={activeIssues.length} icon={BookCheck} variant="info" />
        <StatCard title="My Requests" value={myRequests.filter(r => r.status === 'pending').length} icon={Send} variant="warning" />
        <StatCard title="Returned" value={myIssues.filter(i => i.status === 'returned').length} icon={Clock} variant="success" />
      </div>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Books</TabsTrigger>
          <TabsTrigger value="issued">My Issued Books ({activeIssues.length})</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search books..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBooks.map(book => (
              <Card key={book.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{book.category}</Badge>
                        <Badge variant={book.available_quantity > 0 ? 'default' : 'destructive'}>
                          {book.available_quantity > 0 ? `${book.available_quantity} available` : 'Unavailable'}
                        </Badge>
                      </div>
                      {studentId && book.available_quantity > 0 && (
                        <Button size="sm" className="mt-3 w-full gap-1" onClick={() => requestBook(book.id, studentId)}>
                          <Send className="h-3 w-3" />Request Book
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {activeIssues.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No issued books</TableCell></TableRow>
                ) : activeIssues.map(issue => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.library_books?.title}</TableCell>
                    <TableCell>{format(new Date(issue.issue_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><span className={new Date(issue.due_date) < new Date() ? 'text-destructive font-medium' : ''}>{format(new Date(issue.due_date), 'MMM d, yyyy')}</span></TableCell>
                    <TableCell><Badge variant={new Date(issue.due_date) < new Date() ? 'destructive' : 'default'}>{new Date(issue.due_date) < new Date() ? 'Overdue' : 'Issued'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {myRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No requests</TableCell></TableRow>
                ) : myRequests.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.library_books?.title}</TableCell>
                    <TableCell>{format(new Date(req.request_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
