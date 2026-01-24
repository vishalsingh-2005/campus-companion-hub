import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, Copy, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    name?: string;
  } | null;
}

function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function ResetPasswordDialog({ open, onOpenChange, user }: ResetPasswordDialogProps) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Password copied to clipboard',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !password) return;
    
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: user.id,
          new_password: password,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;
      
      if (result.success) {
        setSuccess(true);
        toast({
          title: 'Password Reset',
          description: `Password for ${user.email} has been updated`,
        });
      } else {
        throw new Error(result.error || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setSuccess(false);
    setCopied(false);
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <strong>{user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Password Reset Successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share the new password securely with the user
              </p>
            </div>
            
            <div className="w-full p-4 rounded-lg bg-muted border">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono flex-1 truncate">{password}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPassword}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">New Password</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGeneratePassword}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="pr-20"
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    {password && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopyPassword}
                      >
                        {copied ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters
                </p>
              </div>

              {user.name && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-sm">
                    <span className="text-muted-foreground">User: </span>
                    <span className="font-medium">{user.name}</span>
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !password}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
