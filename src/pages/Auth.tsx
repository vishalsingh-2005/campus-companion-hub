import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import './Auth.css';

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
      <div className="flex h-screen items-center justify-center bg-[#0a0a1a]">
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
    <div className="auth-scene">
      {/* Ambient light effects */}
      <div className="auth-ambient auth-ambient--1" />
      <div className="auth-ambient auth-ambient--2" />
      <div className="auth-ambient auth-ambient--3" />

      {/* Ground line */}
      <div className="auth-ground" />

      {/* Walking character (silhouette) */}
      <div className="auth-character">
        <svg viewBox="0 0 120 200" className="auth-character__svg">
          {/* Head */}
          <circle cx="60" cy="28" r="16" fill="hsl(var(--primary))" opacity="0.9" />
          {/* Body */}
          <rect x="48" y="44" width="24" height="50" rx="8" fill="hsl(var(--primary))" opacity="0.8" />
          {/* Left arm */}
          <rect x="30" y="50" width="18" height="8" rx="4" fill="hsl(var(--primary))" opacity="0.7" className="auth-arm-left" />
          {/* Right arm (carrying bag) */}
          <rect x="72" y="50" width="18" height="8" rx="4" fill="hsl(var(--primary))" opacity="0.7" className="auth-arm-right" />
          {/* Left leg */}
          <rect x="48" y="94" width="10" height="40" rx="5" fill="hsl(var(--primary))" opacity="0.75" className="auth-leg-left" />
          {/* Right leg */}
          <rect x="62" y="94" width="10" height="40" rx="5" fill="hsl(var(--primary))" opacity="0.75" className="auth-leg-right" />
          {/* Shoes */}
          <ellipse cx="53" cy="136" rx="8" ry="4" fill="hsl(var(--primary))" opacity="0.6" className="auth-leg-left" />
          <ellipse cx="67" cy="136" rx="8" ry="4" fill="hsl(var(--primary))" opacity="0.6" className="auth-leg-right" />
        </svg>
      </div>

      {/* Bag */}
      <div className="auth-bag">
        <svg viewBox="0 0 100 80" className="auth-bag__svg">
          {/* Bag body */}
          <rect x="10" y="20" width="80" height="55" rx="6" fill="hsl(var(--accent))" opacity="0.85" />
          {/* Bag flap (opens) */}
          <rect x="10" y="15" width="80" height="12" rx="4" fill="hsl(var(--accent))" opacity="0.95" className="auth-bag__flap" />
          {/* Handle */}
          <path d="M35 20 Q35 5, 50 5 Q65 5, 65 20" stroke="hsl(var(--accent))" strokeWidth="4" fill="none" opacity="0.7" />
          {/* Buckle */}
          <rect x="42" y="22" width="16" height="10" rx="3" fill="hsl(var(--primary))" opacity="0.5" />
          {/* Light shine */}
          <rect x="18" y="30" width="20" height="3" rx="1.5" fill="white" opacity="0.15" />
        </svg>
      </div>

      {/* Login form emerging from bag */}
      <div className="auth-form-container">
        <div className="auth-form-card">
          {/* Brand */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold font-display text-foreground">
              Campus <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Companion</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-11 rounded-xl border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:bg-white/10 focus:border-primary/50 transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-11 rounded-xl border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground/50 focus:bg-white/10 focus:border-primary/50 transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl gradient-primary border-0 hover:opacity-90 transition-all shadow-glow group mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground/60 mt-5">
            Contact your administrator for access
          </p>
        </div>
      </div>

      {/* Footer particles */}
      <div className="auth-particles">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="auth-particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
