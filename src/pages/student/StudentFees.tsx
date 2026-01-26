import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyFees } from '@/hooks/useFees';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { IndianRupee, Calendar, CheckCircle, Clock, AlertCircle, CreditCard } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function StudentFees() {
  const { data: fees = [], isLoading } = useMyFees();

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      partial: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
      overdue: { variant: 'destructive', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center w-fit">
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Calculate summary
  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0);
  const totalPending = totalFees - totalPaid;
  const paymentProgress = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
        title="My Fees"
        description="View your fee details and payment status"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">₹{totalPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">₹{totalPending.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={paymentProgress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {paymentProgress.toFixed(1)}% of total fees paid
          </p>
        </CardContent>
      </Card>

      {/* Fee Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fee Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fee records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fees.map((fee) => {
                const remaining = fee.amount - (fee.paid_amount || 0);
                const progress = (fee.paid_amount || 0) / fee.amount * 100;

                return (
                  <div
                    key={fee.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{fee.fee_type}</h3>
                        {fee.description && (
                          <p className="text-sm text-muted-foreground">{fee.description}</p>
                        )}
                      </div>
                      {getStatusBadge(fee.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium">₹{fee.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid</p>
                        <p className="font-medium text-success">₹{(fee.paid_amount || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Remaining</p>
                        <p className="font-medium text-warning">₹{remaining.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due Date
                        </p>
                        <p className="font-medium">{format(new Date(fee.due_date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>

                    {fee.status !== 'paid' && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% paid</p>
                      </div>
                    )}

                    {fee.academic_year && (
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline">{fee.academic_year}</Badge>
                        {fee.semester && <Badge variant="outline">{fee.semester}</Badge>}
                      </div>
                    )}

                    {fee.payment_date && (
                      <p className="text-xs text-muted-foreground">
                        Last payment: {format(new Date(fee.payment_date), 'MMM dd, yyyy')}
                        {fee.payment_method && ` via ${fee.payment_method}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
