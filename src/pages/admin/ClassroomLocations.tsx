import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { LocationFormDialog } from '@/components/locations/LocationFormDialog';
import {
  useClassroomLocations,
  useCreateClassroomLocation,
  useUpdateClassroomLocation,
  useDeleteClassroomLocation,
  type ClassroomLocation,
} from '@/hooks/useClassroomLocations';
import { Plus, MapPin, Building2, Pencil, Trash2, Navigation } from 'lucide-react';

export default function ClassroomLocations() {
  const { locations, isLoading } = useClassroomLocations();
  const createLocation = useCreateClassroomLocation();
  const updateLocation = useUpdateClassroomLocation();
  const deleteLocation = useDeleteClassroomLocation();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<ClassroomLocation | null>(null);

  const handleCreate = () => {
    setSelectedLocation(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (location: ClassroomLocation) => {
    setSelectedLocation(location);
    setFormDialogOpen(true);
  };

  const handleDelete = (location: ClassroomLocation) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: {
    name: string;
    building?: string;
    room_number?: string;
    latitude: number;
    longitude: number;
    radius_meters?: number;
  }) => {
    if (selectedLocation) {
      await updateLocation.mutateAsync({ id: selectedLocation.id, ...data });
    } else {
      await createLocation.mutateAsync(data);
    }
    setFormDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedLocation) {
      await deleteLocation.mutateAsync(selectedLocation.id);
      setDeleteDialogOpen(false);
      setSelectedLocation(null);
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const columns = [
    {
      header: 'Location Name',
      accessor: (location: ClassroomLocation) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{location.name}</span>
        </div>
      ),
    },
    {
      header: 'Building',
      accessor: (location: ClassroomLocation) => (
        <div className="flex items-center gap-2">
          {location.building ? (
            <>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{location.building}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Room',
      accessor: (location: ClassroomLocation) =>
        location.room_number || <span className="text-muted-foreground">—</span>,
    },
    {
      header: 'Coordinates',
      accessor: (location: ClassroomLocation) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-xs font-mono"
          onClick={() => openInMaps(Number(location.latitude), Number(location.longitude))}
        >
          <Navigation className="h-3 w-3 mr-1" />
          {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
        </Button>
      ),
    },
    {
      header: 'Radius',
      accessor: (location: ClassroomLocation) => (
        <Badge variant="secondary">{location.radius_meters}m</Badge>
      ),
    },
  ];

  const actions = (location: ClassroomLocation) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleEdit(location)}
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDelete(location)}
        title="Delete"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Classroom Locations"
        description="Manage GPS locations for secure attendance sessions"
      >
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All Locations ({locations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={locations}
            searchKey="name"
            searchPlaceholder="Search locations..."
            actions={actions}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <LocationFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        location={selectedLocation}
        onSubmit={handleSubmit}
        isLoading={createLocation.isPending || updateLocation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Location"
        description={`Are you sure you want to delete "${selectedLocation?.name}"? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}
