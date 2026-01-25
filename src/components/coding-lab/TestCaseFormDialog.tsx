import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLabTestCases, TestCase } from '@/hooks/useCodingLabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  FileJson,
  FileSpreadsheet,
  ChevronDown,
  Download,
  AlertCircle,
  CheckCircle2,
  GripVertical,
} from 'lucide-react';

interface TestCaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labId: string;
  labTitle: string;
}

export function TestCaseFormDialog({
  open,
  onOpenChange,
  labId,
  labTitle,
}: TestCaseFormDialogProps) {
  const { toast } = useToast();
  const { testCases, loading, addTestCase, deleteTestCase, updateTestCase } = useLabTestCases(
    open ? labId : null
  );

  const [adding, setAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{
    input: string;
    expected_output: string;
    is_sample: boolean;
    weight: number;
    description: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newTestCase, setNewTestCase] = useState({
    input: '',
    expected_output: '',
    is_sample: false,
    is_hidden: true,
    weight: 1,
    description: '',
  });

  const handleAdd = async () => {
    if (!newTestCase.input.trim() && !newTestCase.expected_output.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide input and expected output',
        variant: 'destructive',
      });
      return;
    }

    setAdding(true);

    try {
      await addTestCase({
        lab_id: labId,
        input: newTestCase.input,
        expected_output: newTestCase.expected_output,
        is_sample: newTestCase.is_sample,
        is_hidden: !newTestCase.is_sample,
        weight: newTestCase.weight,
        description: newTestCase.description || null,
        order_index: testCases.length,
      });

      toast({
        title: 'Test Case Added',
        description: 'The test case has been added successfully',
      });

      setNewTestCase({
        input: '',
        expected_output: '',
        is_sample: false,
        is_hidden: true,
        weight: 1,
        description: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add test case',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTestCase(id);
      toast({
        title: 'Test Case Deleted',
        description: 'The test case has been removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete test case',
        variant: 'destructive',
      });
    }
  };

  // Parse CSV content
  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('input') && header.includes('output');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map((line, index) => {
      // Handle quoted CSV values
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length < 2) {
        throw new Error(`Row ${index + 1}: Must have at least input and expected_output columns`);
      }

      return {
        input: values[0] || '',
        expected_output: values[1] || '',
        is_sample: values[2]?.toLowerCase() === 'true' || values[2] === '1',
        weight: parseInt(values[3]) || 1,
        description: values[4] || '',
      };
    });
  };

  // Parse JSON content
  const parseJSON = (content: string) => {
    const data = JSON.parse(content);
    const testCasesArray = Array.isArray(data) ? data : data.testCases || data.test_cases || [];

    if (!Array.isArray(testCasesArray) || testCasesArray.length === 0) {
      throw new Error('JSON must contain an array of test cases');
    }

    return testCasesArray.map((tc: any, index: number) => {
      if (tc.input === undefined || tc.expected_output === undefined) {
        throw new Error(`Test case ${index + 1}: Must have 'input' and 'expected_output' fields`);
      }

      return {
        input: String(tc.input || ''),
        expected_output: String(tc.expected_output || tc.expectedOutput || ''),
        is_sample: Boolean(tc.is_sample || tc.isSample || tc.sample),
        weight: parseInt(tc.weight) || 1,
        description: String(tc.description || ''),
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const isJSON = file.name.endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{');
      
      const parsed = isJSON ? parseJSON(content) : parseCSV(content);
      setImportPreview(parsed);

      toast({
        title: 'File Parsed',
        description: `Found ${parsed.length} test cases. Review and confirm import.`,
      });
    } catch (error: any) {
      console.error('Parse error:', error);
      toast({
        title: 'Parse Error',
        description: error.message || 'Failed to parse file',
        variant: 'destructive',
      });
      setImportPreview([]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkImport = async () => {
    if (importPreview.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < importPreview.length; i++) {
        const tc = importPreview[i];
        try {
          await addTestCase({
            lab_id: labId,
            input: tc.input,
            expected_output: tc.expected_output,
            is_sample: tc.is_sample,
            is_hidden: !tc.is_sample,
            weight: tc.weight,
            description: tc.description || null,
            order_index: testCases.length + i,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successCount} test cases${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      setImportPreview([]);
      setBulkOpen(false);
    } catch (error: any) {
      toast({
        title: 'Import Error',
        description: error.message || 'Failed to import test cases',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const csv = `input,expected_output,is_sample,weight,description
"1 2","3",false,1,"Addition test"
"5 3","8",true,1,"Sample addition"`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test_cases_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify([
        { input: "1 2", expected_output: "3", is_sample: false, weight: 1, description: "Addition test" },
        { input: "5 3", expected_output: "8", is_sample: true, weight: 1, description: "Sample addition" }
      ], null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test_cases_template.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportTestCases = (format: 'csv' | 'json') => {
    if (testCases.length === 0) {
      toast({
        title: 'No Test Cases',
        description: 'There are no test cases to export',
        variant: 'destructive',
      });
      return;
    }

    if (format === 'csv') {
      const header = 'input,expected_output,is_sample,weight,description';
      const rows = testCases.map((tc) => {
        const input = `"${tc.input.replace(/"/g, '""')}"`;
        const output = `"${tc.expected_output.replace(/"/g, '""')}"`;
        const description = `"${(tc.description || '').replace(/"/g, '""')}"`;
        return `${input},${output},${tc.is_sample},${tc.weight},${description}`;
      });
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${labTitle.replace(/\s+/g, '_')}_test_cases.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const exportData = testCases.map((tc) => ({
        input: tc.input,
        expected_output: tc.expected_output,
        is_sample: tc.is_sample,
        weight: tc.weight,
        description: tc.description || '',
      }));
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${labTitle.replace(/\s+/g, '_')}_test_cases.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: 'Export Successful',
      description: `Exported ${testCases.length} test cases as ${format.toUpperCase()}`,
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    setReordering(true);
    try {
      const draggedIndex = testCases.findIndex((tc) => tc.id === draggedId);
      const targetIndex = testCases.findIndex((tc) => tc.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Create new order
      const newOrder = [...testCases];
      const [draggedItem] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedItem);

      // Update order_index for all affected items
      const updates = newOrder.map((tc, index) => ({
        id: tc.id,
        order_index: index,
      }));

      // Update each test case's order_index
      for (const update of updates) {
        await updateTestCase(update.id, { order_index: update.order_index });
      }

      toast({
        title: 'Reordered',
        description: 'Test case order updated successfully',
      });
    } catch (error) {
      console.error('Error reordering test cases:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder test cases',
        variant: 'destructive',
      });
    } finally {
      setDraggedId(null);
      setDragOverId(null);
      setReordering(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const sampleCount = testCases.filter((tc) => tc.is_sample).length;
  const hiddenCount = testCases.filter((tc) => !tc.is_sample).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Test Cases - {labTitle}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({sampleCount} sample, {hiddenCount} hidden)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new test case form */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Input</Label>
                  <Textarea
                    value={newTestCase.input}
                    onChange={(e) =>
                      setNewTestCase({ ...newTestCase, input: e.target.value })
                    }
                    placeholder="Enter input..."
                    className="font-mono text-sm min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Output</Label>
                  <Textarea
                    value={newTestCase.expected_output}
                    onChange={(e) =>
                      setNewTestCase({
                        ...newTestCase,
                        expected_output: e.target.value,
                      })
                    }
                    placeholder="Enter expected output..."
                    className="font-mono text-sm min-h-[80px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_sample"
                      checked={newTestCase.is_sample}
                      onCheckedChange={(checked) =>
                        setNewTestCase({
                          ...newTestCase,
                          is_sample: checked,
                          is_hidden: !checked,
                        })
                      }
                    />
                    <Label htmlFor="is_sample" className="cursor-pointer">
                      Visible to students (sample)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="weight">Weight:</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={newTestCase.weight}
                      onChange={(e) =>
                        setNewTestCase({
                          ...newTestCase,
                          weight: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-16"
                      min={1}
                    />
                  </div>
                </div>

                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Test Case
                </Button>
              </div>

              {newTestCase.is_sample && (
                <div className="space-y-2">
                  <Label>Description (shown to students)</Label>
                  <Input
                    value={newTestCase.description}
                    onChange={(e) =>
                      setNewTestCase({
                        ...newTestCase,
                        description: e.target.value,
                      })
                    }
                    placeholder="e.g., Basic test case"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Import Section */}
          <Collapsible open={bulkOpen} onOpenChange={setBulkOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Bulk Import from CSV/JSON
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    bulkOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Download Templates */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Download a template to get started:
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate('csv')}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplate('json')}
                      >
                        <FileJson className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label>Upload File</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select CSV or JSON File
                    </Button>
                  </div>

                  {/* Preview */}
                  {importPreview.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Preview ({importPreview.length} test cases)
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setImportPreview([])}
                        >
                          Clear
                        </Button>
                      </div>

                      <ScrollArea className="h-[150px] border rounded-lg">
                        <div className="p-2 space-y-2">
                          {importPreview.map((tc, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 text-xs bg-muted/30 rounded p-2"
                            >
                              <span className="font-medium w-8">#{i + 1}</span>
                              <div className="flex-1 truncate font-mono">
                                In: {tc.input.substring(0, 30)}...
                              </div>
                              <div className="flex-1 truncate font-mono">
                                Out: {tc.expected_output.substring(0, 30)}...
                              </div>
                              <Badge variant={tc.is_sample ? 'default' : 'outline'} className="text-xs">
                                {tc.is_sample ? 'Sample' : 'Hidden'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <Button
                        onClick={handleBulkImport}
                        disabled={importing}
                        className="w-full"
                      >
                        {importing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Import {importPreview.length} Test Cases
                      </Button>
                    </div>
                  )}

                  {/* Format Help */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Format Requirements:
                    </p>
                    <p><strong>CSV:</strong> input, expected_output, is_sample (true/false), weight, description</p>
                    <p><strong>JSON:</strong> Array of objects with input, expected_output, is_sample, weight, description</p>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Export Section */}
          {testCases.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Export {testCases.length} test cases for backup or sharing
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportTestCases('csv')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => exportTestCases('json')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  JSON
                </Button>
              </div>
            </div>
          )}

          {/* Existing test cases */}
          {loading || reordering ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              {reordering && <span className="ml-2 text-sm text-muted-foreground">Reordering...</span>}
            </div>
          ) : testCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No test cases added yet. Add your first test case above.
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {testCases.length > 1 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <GripVertical className="h-3 w-3" />
                    Drag to reorder test cases
                  </div>
                )}
                {testCases.map((tc, index) => (
                  <Card
                    key={tc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tc.id)}
                    onDragOver={(e) => handleDragOver(e, tc.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, tc.id)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all cursor-move ${
                      draggedId === tc.id ? 'opacity-50 scale-95' : ''
                    } ${
                      dragOverId === tc.id ? 'border-primary border-2 shadow-lg' : ''
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center justify-center h-full pt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">
                              Case {index + 1}
                            </span>
                            {tc.is_sample ? (
                              <Badge className="bg-success/10 text-success text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Sample
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hidden
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              Weight: {tc.weight}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Input
                              </div>
                              <div className="bg-muted/50 rounded p-2 font-mono text-xs whitespace-pre-wrap max-h-[60px] overflow-auto">
                                {tc.input || '(empty)'}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Expected Output
                              </div>
                              <div className="bg-muted/50 rounded p-2 font-mono text-xs whitespace-pre-wrap max-h-[60px] overflow-auto">
                                {tc.expected_output}
                              </div>
                            </div>
                          </div>

                          {tc.description && (
                            <div className="text-xs text-muted-foreground mt-2">
                              {tc.description}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(tc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
