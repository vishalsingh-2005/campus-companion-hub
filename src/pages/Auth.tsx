import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowRight, GraduationCap, Shield, BookOpen, Users } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import './Auth.css';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const FEATURES = [
  { icon: GraduationCap, label: 'Academic Management', desc: 'Marks, GPA & Results' },
  { icon: BookOpen, label: 'Smart Library', desc: 'Books, Fines & Reservations' },
  { icon: Users, label: 'Live Sessions', desc: 'Video Classes & Interviews' },
  { icon: Shield, label: 'Secure Attendance', desc: 'QR + GPS Verification' },
];

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
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
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
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
        toast.error(error.message.includes('Invalid login credentials') ? 'Invalid email or password' : error.message);
      } else {
        toast.success('Welcome back!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split">
      {/* Left Panel – Brand & Features */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          {/* Floating accent shapes */}
          <div className="auth-shape auth-shape-1" />
          <div className="auth-shape auth-shape-2" />
          <div className="auth-shape auth-shape-3" />

          <div className="relative z-10">
            <div className="auth-brand-logo">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="auth-brand-title">
              Campus<br />
              <span className="auth-brand-highlight">Companion</span>
            </h1>
            <p className="auth-brand-subtitle">
              Complete Academic ERP for modern institutions
            </p>

            <div className="auth-features">
              {FEATURES.map((f, i) => (
                <div key={i} className="auth-feature-item" style={{ animationDelay: `${0.8 + i * 0.15}s` }}>
                  <div className="auth-feature-icon">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="auth-feature-label">{f.label}</p>
                    <p className="auth-feature-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="auth-brand-footer">
            Trusted by institutions worldwide
          </p>
        </div>
      </div>

      {/* Right Panel – Login Form */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="text-center mb-8">
            <div className="auth-form-logo-mobile">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mt-4">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@institution.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-11 h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 h-12 rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-lg shadow-primary/25 group"
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

          <p className="text-center text-xs text-muted-foreground mt-8">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
}
