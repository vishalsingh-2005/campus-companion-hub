import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import type { ClassroomLocation } from '@/hooks/useClassroomLocations';

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  building: z.string().max(100).optional(),
  room_number: z.string().max(50).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radius_meters: z.coerce.number().min(10).max(500).default(50),
});

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: ClassroomLocation | null;
  onSubmit: (data: LocationFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSubmit,
  isLoading,
}: LocationFormDialogProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const isEditing = !!location;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      building: '',
      room_number: '',
      latitude: 0,
      longitude: 0,
      radius_meters: 50,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        building: location.building || '',
        room_number: location.room_number || '',
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        radius_meters: location.radius_meters,
      });
    } else {
      form.reset({
        name: '',
        building: '',
        room_number: '',
        latitude: 0,
        longitude: 0,
        radius_meters: 50,
      });
    }
  }, [location, form]);

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      form.setValue('latitude', position.coords.latitude);
      form.setValue('longitude', position.coords.longitude);
      toast.success('Location captured successfully');
    } catch (error: any) {
      console.error('Error getting location:', error);
      if (error.code === error.PERMISSION_DENIED) {
        toast.error('Location permission denied. Please enable it in your browser settings.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        toast.error('Location information unavailable.');
      } else if (error.code === error.TIMEOUT) {
        toast.error('Location request timed out.');
      } else {
        toast.error('Failed to get current location');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async (data: LocationFormValues) => {
    await onSubmit(data);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {isEditing ? 'Edit Classroom Location' : 'Add Classroom Location'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Hall Room 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="building"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Block A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="room_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>GPS Coordinates *</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Crosshair className="h-4 w-4 mr-1" />
                  )}
                  Use Current Location
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g., 17.3850"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="e.g., 78.4867"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="radius_meters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed Radius (meters)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={10}
                      max={500}
                      placeholder="50"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Students must be within this distance to mark attendance (10-500m)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update Location' : 'Add Location'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
