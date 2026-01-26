import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, CreditCard, IndianRupee, AlertCircle, CheckCircle } from 'lucide-react';
import { useFees, useDeleteFee, StudentFee } from '@/hooks/useFees';
import { FeeFormDialog } from '@/components/fees/FeeFormDialog';
import { PaymentDialog } from '@/components/fees/PaymentDialog';
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function FeesManagement() {
  const { data: fees = [], isLoading } = useFees();
  const deleteFee = useDeleteFee();
  
  const [formOpen, setFormOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);

  const handleEdit = (fee: StudentFee) => {
    setSelectedFee(fee);
    setFormOpen(true);
  };

  const handlePayment = (fee: StudentFee) => {
    setSelectedFee(fee);
    setPaymentOpen(true);
  };

  const handleDelete = (fee: StudentFee) => {
    setSelectedFee(fee);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedFee) {
      await deleteFee.mutateAsync(selectedFee.id);
      setDeleteOpen(false);
      setSelectedFee(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      pending: 'outline',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  // Calculate summary stats
  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
  const totalPending = totalFees - totalPaid;
  const overdueCount = fees.filter(f => f.status === 'overdue').length;

  const columns = [
    {
      header: 'Student',
      accessor: (fee: StudentFee) => {
        const student = fee.students;
        return student ? (
          <div>
            <div className="font-medium">{student.first_name} {student.last_name}</div>
            <div className="text-sm text-muted-foreground">{student.student_id}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Fee Type',
      accessor: 'fee_type' as keyof StudentFee,
    },
    {
      header: 'Amount',
      accessor: (fee: StudentFee) => (
        <span className="font-medium">₹{fee.amount.toFixed(2)}</span>
      ),
    },
    {
      header: 'Paid',
      accessor: (fee: StudentFee) => (
        <span className="text-success">₹{(fee.paid_amount || 0).toFixed(2)}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (fee: StudentFee) => format(new Date(fee.due_date), 'MMM dd, yyyy'),
    },
    {
      header: 'Status',
      accessor: (fee: StudentFee) => getStatusBadge(fee.status),
    },
  ];

  const renderActions = (fee: StudentFee) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {fee.status !== 'paid' && (
          <DropdownMenuItem onClick={() => handlePayment(fee)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Record Payment
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleEdit(fee)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDelete(fee)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fees Management"
        description="Manage student fees and payments"
      >
        <Button onClick={() => { setSelectedFee(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Fee
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalFees.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">₹{totalPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <IndianRupee className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">₹{totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={fees}
        searchKey="fee_type"
        searchPlaceholder="Search by fee type..."
        actions={renderActions}
      />

      <FeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        fee={selectedFee}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        fee={selectedFee}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Fee Record"
        description="Are you sure you want to delete this fee record? This action cannot be undone."
      />
    </div>
  );
}
