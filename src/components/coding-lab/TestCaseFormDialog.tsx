import { useState } from 'react';
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
import { useLabTestCases, TestCase } from '@/hooks/useCodingLabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

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
  const { testCases, loading, addTestCase, deleteTestCase } = useLabTestCases(
    open ? labId : null
  );

  const [adding, setAdding] = useState(false);
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

          {/* Existing test cases */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : testCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No test cases added yet. Add your first test case above.
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {testCases.map((tc, index) => (
                  <Card key={tc.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-4">
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
