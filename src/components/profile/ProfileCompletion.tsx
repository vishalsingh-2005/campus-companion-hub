import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileCompletionProps {
  data: Record<string, any>;
  requiredFields: { key: string; label: string }[];
}

export function ProfileCompletion({ data, requiredFields }: ProfileCompletionProps) {
  const filled = requiredFields.filter(f => data[f.key] && String(data[f.key]).trim() !== '');
  const total = requiredFields.length;
  const pct = Math.round((filled.length / total) * 100);
  const missing = requiredFields.filter(f => !data[f.key] || String(data[f.key]).trim() === '');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Profile Completion</span>
        <span className="text-sm font-bold text-primary">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      {missing.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1 font-medium"><AlertCircle className="h-3 w-3" /> Missing fields:</p>
          <p>{missing.map(m => m.label).join(', ')}</p>
        </div>
      )}
      {missing.length === 0 && (
        <p className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> All required fields completed!</p>
      )}
    </div>
  );
}
