import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string;
  total_quantity: number;
  available_quantity: number;
  description: string | null;
  publisher: string | null;
  published_year: number | null;
  created_at: string;
}

export interface BookIssue {
  id: string;
  book_id: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
  notes: string | null;
  library_books?: LibraryBook;
  students?: { id: string; first_name: string; last_name: string; student_id: string };
}

export interface BookRequest {
  id: string;
  book_id: string;
  student_id: string;
  status: string;
  request_date: string;
  admin_notes: string | null;
  library_books?: LibraryBook;
  students?: { id: string; first_name: string; last_name: string; student_id: string };
}

export function useLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    const { data, error } = await supabase.from('library_books').select('*').order('title');
    if (error) { toast.error('Failed to fetch books'); return; }
    setBooks(data || []);
  }, []);

  const fetchIssues = useCallback(async () => {
    const { data, error } = await supabase
      .from('book_issues')
      .select('*, library_books(*), students(id, first_name, last_name, student_id)')
      .order('issue_date', { ascending: false });
    if (error) { console.error(error); return; }
    setIssues((data as any) || []);
  }, []);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('book_requests')
      .select('*, library_books(*), students(id, first_name, last_name, student_id)')
      .order('request_date', { ascending: false });
    if (error) { console.error(error); return; }
    setRequests((data as any) || []);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBooks(), fetchIssues(), fetchRequests()]);
    setLoading(false);
  }, [fetchBooks, fetchIssues, fetchRequests]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addBook = async (book: Partial<LibraryBook>) => {
    const { error } = await supabase.from('library_books').insert([book as any]);
    if (error) { toast.error('Failed to add book: ' + error.message); return false; }
    toast.success('Book added successfully');
    await fetchBooks();
    return true;
  };

  const updateBook = async (id: string, book: Partial<LibraryBook>) => {
    const { error } = await supabase.from('library_books').update(book as any).eq('id', id);
    if (error) { toast.error('Failed to update book'); return false; }
    toast.success('Book updated');
    await fetchBooks();
    return true;
  };

  const deleteBook = async (id: string) => {
    const { error } = await supabase.from('library_books').delete().eq('id', id);
    if (error) { toast.error('Failed to delete book'); return false; }
    toast.success('Book deleted');
    await fetchBooks();
    return true;
  };

  const issueBook = async (bookId: string, studentId: string, dueDate: string) => {
    const { error } = await supabase.from('book_issues').insert([{ book_id: bookId, student_id: studentId, due_date: dueDate, issued_by: user?.id }]);
    if (error) { toast.error('Failed to issue book: ' + error.message); return false; }
    // Decrease available quantity
    const book = books.find(b => b.id === bookId);
    if (book) {
      await supabase.from('library_books').update({ available_quantity: Math.max(0, book.available_quantity - 1) }).eq('id', bookId);
    }
    toast.success('Book issued successfully');
    await fetchAll();
    return true;
  };

  const returnBook = async (issueId: string, bookId: string) => {
    const { error } = await supabase.from('book_issues').update({ status: 'returned', return_date: new Date().toISOString() }).eq('id', issueId);
    if (error) { toast.error('Failed to return book'); return false; }
    const book = books.find(b => b.id === bookId);
    if (book) {
      await supabase.from('library_books').update({ available_quantity: Math.min(book.total_quantity, book.available_quantity + 1) }).eq('id', bookId);
    }
    toast.success('Book returned successfully');
    await fetchAll();
    return true;
  };

  const requestBook = async (bookId: string, studentId: string) => {
    const { error } = await supabase.from('book_requests').insert([{ book_id: bookId, student_id: studentId }]);
    if (error) { toast.error('Failed to request book: ' + error.message); return false; }
    toast.success('Book request submitted');
    await fetchRequests();
    return true;
  };

  const updateRequest = async (id: string, status: string, adminNotes?: string) => {
    const { error } = await supabase.from('book_requests').update({ status, admin_notes: adminNotes } as any).eq('id', id);
    if (error) { toast.error('Failed to update request'); return false; }
    toast.success('Request updated');
    await fetchRequests();
    return true;
  };

  return { books, issues, requests, loading, addBook, updateBook, deleteBook, issueBook, returnBook, requestBook, updateRequest, refetch: fetchAll };
}
