import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Code2,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  FileCode,
  ToggleLeft,
  ToggleRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCodingLabs, CodingLab } from '@/hooks/useCodingLabs';
import { format } from 'date-fns';
import { CodingLabFormDialog } from '@/components/coding-lab/CodingLabFormDialog';
import { TestCaseFormDialog } from '@/components/coding-lab/TestCaseFormDialog';
import { ViewSubmissionsDialog } from '@/components/coding-lab/ViewSubmissionsDialog';
import { PlagiarismDialog } from '@/components/coding-lab/PlagiarismDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';

export default function TeacherCodingLabs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { labs, loading, updateLab, deleteLab } = useCodingLabs();

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [testCaseDialogOpen, setTestCaseDialogOpen] = useState(false);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [plagiarismDialogOpen, setPlagiarismDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLab, setSelectedLab] = useState<CodingLab | null>(null);

  const handleToggleStatus = async (lab: CodingLab) => {
    try {
      await updateLab(lab.id, {
        status: lab.status === 'active' ? 'draft' : 'active',
      });
      toast({
        title: lab.status === 'active' ? 'Lab Deactivated' : 'Lab Activated',
        description: lab.status === 'active'
          ? 'Students can no longer access this lab'
          : 'Students can now access this lab',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update lab status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedLab) return;

    try {
      await deleteLab(selectedLab.id);
      toast({
        title: 'Lab Deleted',
        description: 'The coding lab has been deleted successfully',
      });
      setDeleteDialogOpen(false);
      setSelectedLab(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete lab',
        variant: 'destructive',
      });
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const variants: Record<string, string> = {
      easy: 'bg-success/10 text-success',
      medium: 'bg-warning/10 text-warning',
      hard: 'bg-destructive/10 text-destructive',
    };
    return variants[difficulty] || 'bg-muted text-muted-foreground';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; class: string }> = {
      draft: { label: 'Draft', class: 'bg-muted text-muted-foreground' },
      active: { label: 'Active', class: 'bg-success/10 text-success' },
      archived: { label: 'Archived', class: 'bg-muted text-muted-foreground' },
    };
    return variants[status] || { label: status, class: 'bg-muted text-muted-foreground' };
  };

  // Stats
  const activeLabs = labs.filter((l) => l.status === 'active').length;
  const draftLabs = labs.filter((l) => l.status === 'draft').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Coding Labs"
        description="Create and manage coding challenges for your students"
        actions={
          <Button
            onClick={() => {
              setSelectedLab(null);
              setFormDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Lab
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Labs"
          value={labs.length}
          icon={Code2}
          description="All coding labs"
        />
        <StatCard
          title="Active"
          value={activeLabs}
          icon={CheckCircle2}
          description="Available to students"
        />
        <StatCard
          title="Drafts"
          value={draftLabs}
          icon={FileCode}
          description="Not yet published"
        />
      </div>

      {/* Labs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            All Labs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lab</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Languages</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No coding labs created yet. Click "Create Lab" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  labs.map((lab) => {
                    const status = getStatusBadge(lab.status);
                    return (
                      <TableRow key={lab.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lab.title}</div>
                            {lab.courses && (
                              <div className="text-sm text-muted-foreground">
                                {lab.courses.course_name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyBadge(lab.difficulty)}>
                            {lab.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {lab.allowed_languages.map((lang) => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {lab.time_limit_seconds}s
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {lab.memory_limit_mb}MB
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.class}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLab(lab);
                                setTestCaseDialogOpen(true);
                              }}
                              title="Manage Test Cases"
                            >
                              <FileCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLab(lab);
                                setSubmissionsDialogOpen(true);
                              }}
                              title="View Submissions"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLab(lab);
                                setPlagiarismDialogOpen(true);
                              }}
                              title="Plagiarism Check"
                              className="text-warning hover:text-warning"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLab(lab);
                                setFormDialogOpen(true);
                              }}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(lab)}
                              title={lab.status === 'active' ? 'Deactivate' : 'Activate'}
                              className={
                                lab.status === 'active'
                                  ? 'text-success hover:text-success'
                                  : 'text-muted-foreground'
                              }
                            >
                              {lab.status === 'active' ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedLab(lab);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CodingLabFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        lab={selectedLab}
        onSuccess={() => {
          setFormDialogOpen(false);
          setSelectedLab(null);
        }}
      />

      <TestCaseFormDialog
        open={testCaseDialogOpen}
        onOpenChange={setTestCaseDialogOpen}
        labId={selectedLab?.id || ''}
        labTitle={selectedLab?.title || ''}
      />

      <ViewSubmissionsDialog
        open={submissionsDialogOpen}
        onOpenChange={setSubmissionsDialogOpen}
        labId={selectedLab?.id || ''}
        labTitle={selectedLab?.title || ''}
      />

      <PlagiarismDialog
        open={plagiarismDialogOpen}
        onOpenChange={setPlagiarismDialogOpen}
        labId={selectedLab?.id || ''}
        labTitle={selectedLab?.title || ''}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Coding Lab"
        description={`Are you sure you want to delete "${selectedLab?.title}"? This will also delete all test cases and submissions.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
