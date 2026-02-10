import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLibrary, LibraryBook } from '@/hooks/useLibrary';
import { useStudents } from '@/hooks/useStudents';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, BookOpen, BookCheck, BookX, Send, Trash2, Edit, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';

export default function LibraryManagement() {
  const { books, issues, requests, loading, addBook, updateBook, deleteBook, issueBook, returnBook, updateRequest } = useLibrary();
  const { students } = useStudents();
  const [search, setSearch] = useState('');
  const [bookDialog, setBookDialog] = useState(false);
  const [issueDialog, setIssueDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', category: 'General', total_quantity: 1, available_quantity: 1, description: '', publisher: '' });
  const [issueForm, setIssueForm] = useState({ book_id: '', student_id: '', due_date: '' });

  const filteredBooks = books.filter(b => `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(search.toLowerCase()));
  const activeIssues = issues.filter(i => i.status === 'issued');
  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleSaveBook = async () => {
    if (!bookForm.title || !bookForm.author) { toast.error('Title and Author are required'); return; }
    const success = editingBook
      ? await updateBook(editingBook.id, bookForm)
      : await addBook(bookForm);
    if (success) { setBookDialog(false); resetBookForm(); }
  };

  const handleIssueBook = async () => {
    if (!issueForm.book_id || !issueForm.student_id || !issueForm.due_date) { toast.error('All fields required'); return; }
    const success = await issueBook(issueForm.book_id, issueForm.student_id, new Date(issueForm.due_date).toISOString());
    if (success) { setIssueDialog(false); setIssueForm({ book_id: '', student_id: '', due_date: '' }); }
  };

  const resetBookForm = () => { setBookForm({ title: '', author: '', isbn: '', category: 'General', total_quantity: 1, available_quantity: 1, description: '', publisher: '' }); setEditingBook(null); };

  const openEdit = (book: LibraryBook) => {
    setEditingBook(book);
    setBookForm({ title: book.title, author: book.author, isbn: book.isbn || '', category: book.category, total_quantity: book.total_quantity, available_quantity: book.available_quantity, description: book.description || '', publisher: book.publisher || '' });
    setBookDialog(true);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Library Management" description="Manage books, issue/return, and student requests" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Books" value={books.length} icon={BookOpen} />
        <StatCard title="Books Issued" value={activeIssues.length} icon={BookCheck} variant="info" />
        <StatCard title="Pending Requests" value={pendingRequests.length} icon={Send} variant="warning" />
        <StatCard title="Overdue" value={activeIssues.filter(i => new Date(i.due_date) < new Date()).length} icon={BookX} variant="destructive" />
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="issued">Issued Books ({activeIssues.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="history">Return History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search books..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Button onClick={() => { resetBookForm(); setBookDialog(true); }} className="gap-2"><Plus className="h-4 w-4" />Add Book</Button>
            <Button variant="outline" onClick={() => setIssueDialog(true)} className="gap-2"><BookCheck className="h-4 w-4" />Issue Book</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Category</TableHead><TableHead>Available</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredBooks.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No books found</TableCell></TableRow>
                  ) : filteredBooks.map(book => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell><Badge variant="outline">{book.category}</Badge></TableCell>
                      <TableCell><Badge variant={book.available_quantity > 0 ? 'default' : 'destructive'}>{book.available_quantity}</Badge></TableCell>
                      <TableCell>{book.total_quantity}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(book)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteBook(book.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issued" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Student</TableHead><TableHead>Issued</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {activeIssues.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No active issues</TableCell></TableRow>
                  ) : activeIssues.map(issue => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.library_books?.title}</TableCell>
                      <TableCell>{issue.students?.first_name} {issue.students?.last_name}</TableCell>
                      <TableCell>{format(new Date(issue.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <span className={new Date(issue.due_date) < new Date() ? 'text-destructive font-medium' : ''}>{format(new Date(issue.due_date), 'MMM d, yyyy')}</span>
                      </TableCell>
                      <TableCell><Badge variant={new Date(issue.due_date) < new Date() ? 'destructive' : 'default'}>{new Date(issue.due_date) < new Date() ? 'Overdue' : 'Issued'}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="outline" className="gap-1" onClick={() => returnBook(issue.id, issue.book_id)}><RotateCcw className="h-3 w-3" />Return</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No requests</TableCell></TableRow>
                  ) : requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.library_books?.title}</TableCell>
                      <TableCell>{req.students?.first_name} {req.students?.last_name}</TableCell>
                      <TableCell>{format(new Date(req.request_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="default" onClick={() => updateRequest(req.id, 'approved')}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => updateRequest(req.id, 'rejected')}>Reject</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Student</TableHead><TableHead>Issued</TableHead><TableHead>Returned</TableHead></TableRow></TableHeader>
                <TableBody>
                  {issues.filter(i => i.status === 'returned').length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No returns yet</TableCell></TableRow>
                  ) : issues.filter(i => i.status === 'returned').map(issue => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">{issue.library_books?.title}</TableCell>
                      <TableCell>{issue.students?.first_name} {issue.students?.last_name}</TableCell>
                      <TableCell>{format(new Date(issue.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{issue.return_date ? format(new Date(issue.return_date), 'MMM d, yyyy') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Book Dialog */}
      <Dialog open={bookDialog} onOpenChange={setBookDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Title *</Label><Input value={bookForm.title} onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Author *</Label><Input value={bookForm.author} onChange={e => setBookForm(p => ({ ...p, author: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Category</Label><Input value={bookForm.category} onChange={e => setBookForm(p => ({ ...p, category: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>ISBN</Label><Input value={bookForm.isbn} onChange={e => setBookForm(p => ({ ...p, isbn: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Total Qty</Label><Input type="number" value={bookForm.total_quantity} onChange={e => setBookForm(p => ({ ...p, total_quantity: parseInt(e.target.value) || 1, available_quantity: parseInt(e.target.value) || 1 }))} /></div>
              <div className="grid gap-2"><Label>Publisher</Label><Input value={bookForm.publisher} onChange={e => setBookForm(p => ({ ...p, publisher: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Description</Label><Textarea value={bookForm.description} onChange={e => setBookForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBookDialog(false)}>Cancel</Button><Button onClick={handleSaveBook}>{editingBook ? 'Update' : 'Add Book'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Book Dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Book to Student</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Book</Label>
              <Select value={issueForm.book_id} onValueChange={v => setIssueForm(p => ({ ...p, book_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a book" /></SelectTrigger>
                <SelectContent>{books.filter(b => b.available_quantity > 0).map(b => <SelectItem key={b.id} value={b.id}>{b.title} (Available: {b.available_quantity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Student</Label>
              <Select value={issueForm.student_id} onValueChange={v => setIssueForm(p => ({ ...p, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Due Date</Label><Input type="date" value={issueForm.due_date} onChange={e => setIssueForm(p => ({ ...p, due_date: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIssueDialog(false)}>Cancel</Button><Button onClick={handleIssueBook}>Issue Book</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
