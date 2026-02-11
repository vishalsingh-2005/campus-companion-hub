import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background gradient-mesh">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="absolute inset-0 gradient-mesh" />
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-[15%] w-72 h-72 rounded-full bg-primary/8 blur-3xl float-shape" />
      <div className="absolute bottom-20 right-[15%] w-96 h-96 rounded-full bg-accent/6 blur-3xl float-shape-delayed" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/4 blur-3xl" />

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] items-center justify-center relative p-12">
        <div className="max-w-lg animate-slide-in-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-glow mb-8">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl xl:text-6xl font-bold text-foreground font-display leading-tight mb-6">
            Campus<br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              Companion
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Your all-in-one college management platform. Manage courses, track attendance, handle assignments, and more — all in one beautifully crafted space.
          </p>
          <div className="flex items-center gap-6">
            {['Students', 'Teachers', 'Admins'].map((role) => (
              <div key={role} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {role}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex justify-center mb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-glow">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground font-display">
              Campus <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Companion</span>
            </h1>
          </div>

          {/* Form card */}
          <div className="glass-strong rounded-3xl p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground font-display">Welcome back</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">Sign in with your institutional credentials</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 h-12 rounded-xl border-border/60 bg-background/50 focus:bg-background transition-colors"
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 h-12 rounded-xl border-border/60 bg-background/50 focus:bg-background transition-colors"
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold rounded-xl gradient-primary border-0 hover:opacity-90 transition-all duration-300 shadow-glow group"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Contact your administrator for account access or password reset.
          </p>
        </div>
      </div>
    </div>
  );
}