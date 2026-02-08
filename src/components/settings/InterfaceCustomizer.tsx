import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  LayoutGrid,
  Type,
  PanelLeft,
  Loader2,
} from 'lucide-react';
import { usePreferences, ACCENT_COLORS } from '@/contexts/PreferencesContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

const ACCENT_OPTIONS = [
  { value: 'blue', label: 'Blue', preview: 'bg-blue-500' },
  { value: 'teal', label: 'Teal', preview: 'bg-teal-500' },
  { value: 'purple', label: 'Purple', preview: 'bg-purple-500' },
  { value: 'rose', label: 'Rose', preview: 'bg-rose-500' },
  { value: 'orange', label: 'Orange', preview: 'bg-orange-500' },
  { value: 'green', label: 'Green', preview: 'bg-green-500' },
  { value: 'amber', label: 'Amber', preview: 'bg-amber-500' },
  { value: 'indigo', label: 'Indigo', preview: 'bg-indigo-500' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const DENSITY_OPTIONS = [
  { value: 'compact', label: 'Compact', description: 'Tighter spacing, more content visible' },
  { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing (default)' },
  { value: 'spacious', label: 'Spacious', description: 'Generous spacing, easier reading' },
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', preview: 'text-sm' },
  { value: 'medium', label: 'Medium', preview: 'text-base' },
  { value: 'large', label: 'Large', preview: 'text-lg' },
];

export function InterfaceCustomizer() {
  const { preferences, updatePreference, isSaving } = usePreferences();
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            Theme
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
          <CardDescription>Choose between light, dark, or system theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updatePreference('theme', option.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                  preferences.theme === option.value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    preferences.theme === option.value ? 'bg-primary/15' : 'bg-muted'
                  )}
                >
                  <option.icon
                    className={cn(
                      'h-5 w-5',
                      preferences.theme === option.value ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    preferences.theme === option.value ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {option.label}
                </span>
                {preferences.theme === option.value && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Accent Color
          </CardTitle>
          <CardDescription>Pick your preferred accent color for the interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {ACCENT_OPTIONS.map((color) => (
              <button
                key={color.value}
                onClick={() => updatePreference('accent_color', color.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                  preferences.accent_color === color.value
                    ? 'border-primary shadow-sm scale-105'
                    : 'border-transparent hover:border-border'
                )}
                title={color.label}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full shadow-md transition-transform',
                    color.preview
                  )}
                />
                <span className="text-xs font-medium text-muted-foreground">{color.label}</span>
                {preferences.accent_color === color.value && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Layout Density */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Layout Density
          </CardTitle>
          <CardDescription>Control how much content is shown at once</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updatePreference('layout_density', option.value)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                  preferences.layout_density === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex-1">
                  <p
                    className={cn(
                      'font-medium',
                      preferences.layout_density === option.value && 'text-primary'
                    )}
                  >
                    {option.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {preferences.layout_density === option.value && (
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            Font Size
          </CardTitle>
          <CardDescription>Adjust text size throughout the application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updatePreference('font_size', option.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  preferences.font_size === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <span className={cn('font-medium', option.preview)}>Aa</span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    preferences.font_size === option.value ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {option.label}
                </span>
                {preferences.font_size === option.value && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PanelLeft className="h-5 w-5 text-primary" />
            Sidebar
          </CardTitle>
          <CardDescription>Customize the navigation sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl border">
            <div>
              <p className="font-medium">Collapsed Sidebar</p>
              <p className="text-sm text-muted-foreground">
                Show only icons in the sidebar for more workspace
              </p>
            </div>
            <Button
              variant={preferences.sidebar_collapsed ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePreference('sidebar_collapsed', !preferences.sidebar_collapsed)}
            >
              {preferences.sidebar_collapsed ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
