import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Smartphone, 
  Sun, 
  Moon, 
  Monitor,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useDeviceFingerprint } from '@/hooks/useSecureAttendance';
import { cn } from '@/lib/utils';

export default function StudentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { fingerprint } = useDeviceFingerprint();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Password Updated',
        description: 'Your password has been changed successfully',
      });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  // Get device info
  const deviceInfo = {
    browser: navigator.userAgent.match(/(firefox|chrome|safari|opera|edge)/i)?.[0] || 'Unknown',
    os: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-primary" />
              Appearance
            </CardTitle>
            <CardDescription>
              Choose your preferred theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border transition-all',
                    theme === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  )}
                >
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    theme === option.value ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <option.icon className={cn(
                      'h-5 w-5',
                      theme === option.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <span className={cn(
                    'font-medium flex-1 text-left',
                    theme === option.value && 'text-primary'
                  )}>
                    {option.label}
                  </span>
                  {theme === option.value && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Device Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              Device Information
            </CardTitle>
            <CardDescription>
              Your current device details (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Device ID</p>
                <p className="font-mono text-sm truncate">
                  {fingerprint || 'Generating...'}
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Browser</p>
                <p className="font-medium capitalize">{deviceInfo.browser}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Operating System</p>
                <p className="font-medium">{deviceInfo.os}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Screen Resolution</p>
                <p className="font-medium">{deviceInfo.screenSize}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Language</p>
                <p className="font-medium">{deviceInfo.language}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{deviceInfo.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Notice */}
      <Card className="border-info/30 bg-info/5">
        <CardContent className="flex items-start gap-4 py-4">
          <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="font-medium">One Device Policy</p>
            <p className="text-sm text-muted-foreground">
              For security purposes, your account can only be used on one device at a time. 
              If you need to change devices, please contact your administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
