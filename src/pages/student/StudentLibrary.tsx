import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLibrary } from '@/hooks/useLibrary';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BookOpen, BookCheck, Send, Clock, Filter, AlertTriangle, DollarSign } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';
import { supabase } from '@/integrations/supabase/client';

const FINE_PER_DAY = 2;

function calculateFine(dueDate: string): number {
  const overdueDays = differenceInDays(new Date(), new Date(dueDate));
  return overdueDays > 0 ? overdueDays * FINE_PER_DAY : 0;
}

export default function StudentLibrary() {
  const { user } = useAuth();
  const { books, issues, requests, loading, requestBook } = useLibrary();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    async function getStudentId() {
      if (!user) return;
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (data) setStudentId(data.id);
    }
    getStudentId();
  }, [user]);

  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category));
    return Array.from(cats).sort();
  }, [books]);

  const filteredBooks = books.filter(b => {
    const matchesSearch = `${b.title} ${b.author} ${b.isbn || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const myIssues = issues.filter(i => i.student_id === studentId);
  const myRequests = requests.filter(r => r.student_id === studentId);
  const activeIssues = myIssues.filter(i => i.status === 'issued');
  const overdueIssues = activeIssues.filter(i => new Date(i.due_date) < new Date());
  const totalFines = activeIssues.reduce((sum, i) => sum + calculateFine(i.due_date), 0);

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Library" description="Browse books, view issued books, and request new ones" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Available Books" value={books.filter(b => b.available_quantity > 0).length} icon={BookOpen} />
        <StatCard title="My Issued Books" value={activeIssues.length} icon={BookCheck} variant="info" />
        <StatCard title="Overdue" value={overdueIssues.length} icon={AlertTriangle} variant={overdueIssues.length > 0 ? 'destructive' : 'success'} />
        <StatCard title="Pending Fines" value={totalFines > 0 ? `₹${totalFines}` : '₹0'} icon={DollarSign} variant={totalFines > 0 ? 'warning' : 'success'} />
      </div>

      {/* Overdue Warning */}
      {overdueIssues.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-sm text-destructive">You have {overdueIssues.length} overdue book(s)!</p>
              <p className="text-xs text-muted-foreground">Please return them to avoid additional fines (₹{FINE_PER_DAY}/day)</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Books</TabsTrigger>
          <TabsTrigger value="issued">My Books ({activeIssues.length})</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by title, author, or ISBN..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
                      {book.isbn && <p className="text-xs text-muted-foreground/70">ISBN: {book.isbn}</p>}
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
            {filteredBooks.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No books found matching your search</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Fine</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {activeIssues.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No issued books</TableCell></TableRow>
                ) : activeIssues.map(issue => {
                  const fine = calculateFine(issue.due_date);
                  const isOverdue = new Date(issue.due_date) < new Date();
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.library_books?.title}</TableCell>
                      <TableCell>{format(new Date(issue.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell><span className={isOverdue ? 'text-destructive font-medium' : ''}>{format(new Date(issue.due_date), 'MMM d, yyyy')}</span></TableCell>
                      <TableCell>{fine > 0 ? <Badge variant="destructive">₹{fine}</Badge> : '—'}</TableCell>
                      <TableCell><Badge variant={isOverdue ? 'destructive' : 'default'}>{isOverdue ? 'Overdue' : 'Issued'}</Badge></TableCell>
                    </TableRow>
                  );
                })}
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

        <TabsContent value="history" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Issued</TableHead><TableHead>Returned</TableHead><TableHead>Fine</TableHead></TableRow></TableHeader>
              <TableBody>
                {myIssues.filter(i => i.status === 'returned').length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No history</TableCell></TableRow>
                ) : myIssues.filter(i => i.status === 'returned').map(issue => {
                  const overdueDays = differenceInDays(new Date(issue.return_date || issue.due_date), new Date(issue.due_date));
                  const fine = overdueDays > 0 ? overdueDays * FINE_PER_DAY : 0;
                  return (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.library_books?.title}</TableCell>
                      <TableCell>{format(new Date(issue.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{issue.return_date ? format(new Date(issue.return_date), 'MMM d, yyyy') : '-'}</TableCell>
                      <TableCell>{fine > 0 ? <Badge variant="destructive">₹{fine}</Badge> : <span className="text-success">No fine</span>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
