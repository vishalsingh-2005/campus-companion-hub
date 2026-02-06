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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Holiday, HolidayFormData } from '@/hooks/useHolidays';

const HOLIDAY_TYPES = [
  { value: 'national', label: 'National Holiday' },
  { value: 'academic', label: 'Academic Break' },
  { value: 'religious', label: 'Religious Holiday' },
  { value: 'exam', label: 'Exam Period' },
  { value: 'general', label: 'General' },
];

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: HolidayFormData) => void;
  holiday?: Holiday | null;
  isSubmitting?: boolean;
}

export function HolidayFormDialog({
  open,
  onOpenChange,
  onSubmit,
  holiday,
  isSubmitting,
}: HolidayFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState('general');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    if (holiday) {
      setTitle(holiday.title);
      setDescription(holiday.description || '');
      setHolidayDate(holiday.holiday_date);
      setHolidayType(holiday.holiday_type);
      setIsRecurring(holiday.is_recurring);
    } else {
      setTitle('');
      setDescription('');
      setHolidayDate('');
      setHolidayType('general');
      setIsRecurring(false);
    }
  }, [holiday, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description: description || null,
      holiday_date: holidayDate,
      holiday_type: holidayType,
      is_recurring: isRecurring,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {holiday ? 'Edit Holiday' : 'Add Holiday'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Republic Day"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={holidayType} onValueChange={setHolidayType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
            <Label htmlFor="recurring">Recurring annually</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {holiday ? 'Update' : 'Add'} Holiday
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
