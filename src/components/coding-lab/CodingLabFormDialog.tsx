import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCodingLabs, CodingLab } from '@/hooks/useCodingLabs';
import { Loader2, Code2, ChevronDown } from 'lucide-react';

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

interface CodingLabFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lab: CodingLab | null;
  onSuccess: () => void;
}

const LANGUAGES = [
  { value: 'c', label: 'C', extension: 'c' },
  { value: 'cpp', label: 'C++', extension: 'cpp' },
  { value: 'java', label: 'Java', extension: 'java' },
  { value: 'python', label: 'Python', extension: 'py' },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  c: `#include <stdio.h>

int main() {
    // Your code here
    
    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    
    return 0;
}`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
        
    }
}`,
  python: `# Your code here

def main():
    pass

if __name__ == "__main__":
    main()`,
};

export function CodingLabFormDialog({
  open,
  onOpenChange,
  lab,
  onSuccess,
}: CodingLabFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createLab, updateLab } = useCodingLabs();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [starterCodeOpen, setStarterCodeOpen] = useState(false);
  const [starterCode, setStarterCode] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    time_limit_seconds: 2,
    memory_limit_mb: 256,
    allowed_languages: ['python', 'cpp'],
    course_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    async function fetchCourses() {
      if (!user) return;

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (teacher) {
        const { data } = await supabase
          .from('courses')
          .select('id, course_code, course_name')
          .eq('teacher_id', teacher.id);

        setCourses(data || []);
      }
    }

    fetchCourses();
  }, [user]);

  useEffect(() => {
    if (lab) {
      setFormData({
        title: lab.title,
        description: lab.description,
        difficulty: lab.difficulty,
        time_limit_seconds: lab.time_limit_seconds,
        memory_limit_mb: lab.memory_limit_mb,
        allowed_languages: lab.allowed_languages,
        course_id: lab.course_id || '',
        start_date: lab.start_date ? lab.start_date.split('T')[0] : '',
        end_date: lab.end_date ? lab.end_date.split('T')[0] : '',
      });
      // Load existing starter code
      setStarterCode(lab.starter_code || {});
    } else {
      setFormData({
        title: '',
        description: '',
        difficulty: 'medium',
        time_limit_seconds: 2,
        memory_limit_mb: 256,
        allowed_languages: ['python', 'cpp'],
        course_id: courses[0]?.id || '',
        start_date: '',
        end_date: '',
      });
      setStarterCode({});
    }
  }, [lab, open, courses]);

  const handleLanguageToggle = (lang: string) => {
    setFormData((prev) => ({
      ...prev,
      allowed_languages: prev.allowed_languages.includes(lang)
        ? prev.allowed_languages.filter((l) => l !== lang)
        : [...prev.allowed_languages, lang],
    }));
  };

  const handleStarterCodeChange = (lang: string, code: string) => {
    setStarterCode((prev) => ({
      ...prev,
      [lang]: code,
    }));
  };

  const applyDefaultTemplate = (lang: string) => {
    setStarterCode((prev) => ({
      ...prev,
      [lang]: DEFAULT_TEMPLATES[lang] || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const labData = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        time_limit_seconds: formData.time_limit_seconds,
        memory_limit_mb: formData.memory_limit_mb,
        allowed_languages: formData.allowed_languages,
        course_id: formData.course_id || null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        created_by: user?.id,
        status: 'draft' as const,
        is_enabled: true,
        starter_code: starterCode,
        updated_at: new Date().toISOString(),
      };

      if (lab) {
        await updateLab(lab.id, labData);
        toast({
          title: 'Lab Updated',
          description: 'The coding lab has been updated successfully',
        });
      } else {
        await createLab(labData);
        toast({
          title: 'Lab Created',
          description: 'The coding lab has been created successfully',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lab',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lab ? 'Edit Coding Lab' : 'Create Coding Lab'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course">Course (Optional)</Label>
            <Select
              value={formData.course_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, course_id: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No course</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Two Sum Problem"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Problem Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the problem, input/output format, constraints..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({ ...formData, difficulty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_limit">Time Limit (seconds)</Label>
              <Input
                id="time_limit"
                type="number"
                value={formData.time_limit_seconds}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time_limit_seconds: parseInt(e.target.value) || 2,
                  })
                }
                min={1}
                max={10}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memory_limit">Memory Limit (MB)</Label>
            <Input
              id="memory_limit"
              type="number"
              value={formData.memory_limit_mb}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  memory_limit_mb: parseInt(e.target.value) || 256,
                })
              }
              min={64}
              max={512}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Allowed Languages</Label>
            <div className="flex flex-wrap gap-4 pt-1">
              {LANGUAGES.map((lang) => (
                <div key={lang.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={lang.value}
                    checked={formData.allowed_languages.includes(lang.value)}
                    onCheckedChange={() => handleLanguageToggle(lang.value)}
                  />
                  <label
                    htmlFor={lang.value}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {lang.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date (Optional)</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date (Optional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </div>
          </div>

          {/* Starter Code Section */}
          <Collapsible open={starterCodeOpen} onOpenChange={setStarterCodeOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Starter Code Templates
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    starterCodeOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              {formData.allowed_languages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select at least one language above to add starter code
                </p>
              ) : (
                <Tabs
                  defaultValue={formData.allowed_languages[0]}
                  className="w-full"
                >
                  <TabsList className="w-full">
                    {formData.allowed_languages.map((lang) => {
                      const langInfo = LANGUAGES.find((l) => l.value === lang);
                      return (
                        <TabsTrigger key={lang} value={lang} className="flex-1">
                          {langInfo?.label || lang}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {formData.allowed_languages.map((lang) => {
                    const langInfo = LANGUAGES.find((l) => l.value === lang);
                    return (
                      <TabsContent key={lang} value={lang} className="mt-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>
                              {langInfo?.label} Starter Code (.{langInfo?.extension})
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => applyDefaultTemplate(lang)}
                            >
                              Use Default Template
                            </Button>
                          </div>
                          <Textarea
                            value={starterCode[lang] || ''}
                            onChange={(e) =>
                              handleStarterCodeChange(lang, e.target.value)
                            }
                            placeholder={`// Enter starter code for ${langInfo?.label}...`}
                            className="font-mono text-sm min-h-[200px]"
                          />
                          <p className="text-xs text-muted-foreground">
                            This code will be pre-filled when students start the lab
                          </p>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {lab ? 'Update Lab' : 'Create Lab'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
