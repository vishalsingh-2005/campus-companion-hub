import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

const DOC_TYPES = [
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: '10th_marksheet', label: '10th Marksheet' },
  { value: '12th_marksheet', label: '12th Marksheet' },
  { value: 'transfer_certificate', label: 'Transfer Certificate' },
  { value: 'other', label: 'Other Document' },
];

interface DocumentUploadProps {
  studentId: string;
  readOnly?: boolean;
}

export function DocumentUpload({ studentId, readOnly = false }: DocumentUploadProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (!error) setDocuments((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [studentId]);

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { toast.error('Only PDF, JPEG, PNG, WebP allowed'); return; }

    setUploading(docType);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${docType}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('student-documents').upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(path);
      
      // Remove existing doc of same type
      await supabase.from('student_documents').delete().eq('student_id', studentId).eq('document_type', docType);

      const { error: insertError } = await supabase.from('student_documents').insert({
        student_id: studentId,
        document_type: docType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        uploaded_by: user.id,
      } as any);
      if (insertError) throw insertError;

      toast.success('Document uploaded');
      await fetchDocuments();
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (doc: Document) => {
    const { error } = await supabase.from('student_documents').delete().eq('id', doc.id);
    if (error) { toast.error('Delete failed'); return; }
    toast.success('Document removed');
    await fetchDocuments();
  };

  const uploaded = new Set(documents.map(d => d.document_type));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" /> Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          DOC_TYPES.map(dt => {
            const doc = documents.find(d => d.document_type === dt.value);
            return (
              <div key={dt.value} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{dt.label}</p>
                    {doc && <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc ? (
                    <>
                      <Badge variant="secondary" className="bg-success/10 text-success text-xs">Uploaded</Badge>
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" /></a>
                      </Button>
                      {!readOnly && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </>
                  ) : !readOnly ? (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(dt.value, e.target.files[0]); }}
                        disabled={uploading === dt.value}
                      />
                      <div className="flex items-center gap-1 text-xs text-primary hover:underline">
                        {uploading === dt.value ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Upload
                      </div>
                    </label>
                  ) : (
                    <Badge variant="outline" className="text-xs">Not uploaded</Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
