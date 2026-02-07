import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateUser } from '@/hooks/useCreateUser';
import { toast } from 'sonner';
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateCredentialsSectionProps {
  email: string;
  fullName: string;
  role: 'teacher' | 'student';
  onUserCreated: (userId: string) => void;
  existingUserId: string | null;
}

export function CreateCredentialsSection({
  email,
  fullName,
  role,
  onUserCreated,
  existingUserId,
}: CreateCredentialsSectionProps) {
  const [createCredentials, setCreateCredentials] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { createUserAccount, isCreating } = useCreateUser();

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setErrorMessage(null);
  };

  const handleCreateCredentials = async () => {
    setErrorMessage(null);

    if (!email) {
      toast.error('Please enter an email address first');
      return;
    }

    if (!fullName) {
      toast.error('Please enter a name first');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const result = await createUserAccount(email, password, role, fullName);

    if (result.userId) {
      setCreatedUserId(result.userId);
      onUserCreated(result.userId);
      toast.success('Login credentials created successfully!');
    } else {
      const errMsg = result.error || 'Failed to create credentials';
      setErrorMessage(errMsg);
      toast.error(errMsg);
    }
  };

  if (existingUserId || createdUserId) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Login account linked</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            This {role} can log in with their email and password.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Login Credentials</CardTitle>
          </div>
          <Switch
            checked={createCredentials}
            onCheckedChange={(c) => { setCreateCredentials(c); setErrorMessage(null); }}
          />
        </div>
        <CardDescription>
          Create login credentials so this {role} can access the portal
        </CardDescription>
      </CardHeader>

      {createCredentials && (
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
                placeholder="Enter password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setErrorMessage(null); }}
              placeholder="Confirm password"
              className={cn(
                confirmPassword && password !== confirmPassword && 'border-destructive'
              )}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generatePassword}
            >
              Generate Password
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCredentials}
              disabled={isCreating || !password || password !== confirmPassword}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Credentials'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The {role} will use their email ({email || 'not set'}) to log in.
            {' '}If the email is already registered, the credentials will be updated.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
