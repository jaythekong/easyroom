import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { PlatformOrganization } from "@/hooks/useSuperAdmin";

interface StatusUpdateModalProps {
  organization: PlatformOrganization | null;
  newStatus: 'active' | 'suspended' | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isLoading?: boolean;
}

export function StatusUpdateModal({
  organization,
  newStatus,
  open,
  onClose,
  onConfirm,
  isLoading = false
}: StatusUpdateModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!organization || !newStatus) return null;

  const isSuspending = newStatus === 'suspended';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuspending ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {isSuspending ? 'Suspend' : 'Reactivate'} Organization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{organization.name}</span>
              <Badge variant={organization.status === 'active' ? 'default' : 'destructive'}>
                {organization.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Slug: {organization.slug}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              {isSuspending ? 'Suspension' : 'Reactivation'} Reason {isSuspending && '*'}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                isSuspending 
                  ? "Please provide a reason for suspending this organization..."
                  : "Optional: Provide a reason for reactivating this organization..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            {isSuspending && (
              <div className="text-xs text-muted-foreground">
                * A reason is required when suspending an organization
              </div>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${isSuspending ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className={`text-sm ${isSuspending ? 'text-red-800' : 'text-green-800'}`}>
              {isSuspending ? (
                <>
                  <strong>Warning:</strong> Suspending this organization will prevent users from accessing it. 
                  All bookings and functionality will be disabled until reactivated.
                </>
              ) : (
                <>
                  <strong>Confirm:</strong> This will reactivate the organization and restore full access 
                  for all users and functionality.
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || (isSuspending && !reason.trim())}
            variant={isSuspending ? 'destructive' : 'default'}
          >
            {isLoading ? 'Processing...' : (isSuspending ? 'Suspend Organization' : 'Reactivate Organization')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}