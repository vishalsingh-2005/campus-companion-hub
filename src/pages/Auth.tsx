import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowRight, GraduationCap, Shield, BookOpen, Users, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';
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
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
        <div className="auth-mesh-gradient" />
        <div className="auth-grid-overlay" />
        <div className="auth-brand-content">
          {/* Floating accent shapes */}
          <div className="auth-shape auth-shape-1" />
          <div className="auth-shape auth-shape-2" />
          <div className="auth-shape auth-shape-3" />

          <div className="relative z-10">
            <div className="auth-badge">
              <Sparkles className="h-3 w-3" />
              <span>Education OS · v2.0</span>
            </div>
            <div className="auth-brand-logo">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="auth-brand-title">
              Campus<br />
              <span className="auth-brand-highlight">Companion</span>
            </h1>
            <p className="auth-brand-subtitle">
              The all-in-one platform powering modern campuses — from attendance to analytics.
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

            <div className="auth-stats">
              <div className="auth-stat">
                <div className="auth-stat-value">50K+</div>
                <div className="auth-stat-label">Students</div>
              </div>
              <div className="auth-stat-divider" />
              <div className="auth-stat">
                <div className="auth-stat-value">99.9%</div>
                <div className="auth-stat-label">Uptime</div>
              </div>
              <div className="auth-stat-divider" />
              <div className="auth-stat">
                <div className="auth-stat-value">4.9★</div>
                <div className="auth-stat-label">Rating</div>
              </div>
            </div>
          </div>

          <p className="auth-brand-footer">
            © {new Date().getFullYear()} Campus Companion · Trusted worldwide
          </p>
        </div>
      </div>

      {/* Right Panel – Login Form */}
      <div className="auth-form-panel">
        <div className="auth-form-glow" />
        <div className="auth-form-container">
          <div className="text-center mb-8 lg:text-left">
            <div className="auth-form-logo-mobile mx-auto lg:mx-0">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground mt-4">
              Welcome back 👋
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              Sign in to continue to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@institution.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="auth-input pl-11 h-12 rounded-xl"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="auth-input pl-11 pr-11 h-12 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only peer"
              />
              <span className="auth-checkbox">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity" />
              </span>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Keep me signed in
              </span>
            </label>

            <Button
              type="submit"
              className="auth-submit-btn w-full h-12 text-sm font-semibold rounded-xl group"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <div className="auth-divider">
            <span>Secure access</span>
          </div>

          <div className="auth-trust-badges">
            <div className="auth-trust-item">
              <Shield className="h-3.5 w-3.5" />
              <span>SSL Encrypted</span>
            </div>
            <div className="auth-trust-item">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>SOC 2 Compliant</span>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Need access? <span className="text-foreground font-medium">Contact your administrator</span>
          </p>
        </div>
      </div>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </div>
  );
}
