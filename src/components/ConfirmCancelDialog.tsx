import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title of the booking being cancelled, shown so people can see what they are about to remove. */
  bookingTitle?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Label of the destructive button, e.g. "Cancel booking" or "Delete booking". */
  confirmLabel?: string;
}

/**
 * One extra tap before a booking is removed. Cancelling also alerts everyone
 * subscribed on Telegram, so an accidental tap would disrupt other people.
 */
export function ConfirmCancelDialog({
  open,
  onOpenChange,
  bookingTitle,
  onConfirm,
  loading = false,
  confirmLabel = "Cancel booking",
}: ConfirmCancelDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            {bookingTitle ? <>"{bookingTitle}" will be removed</> : <>This booking will be removed</>} and
            people subscribed to Telegram alerts will be told. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep booking</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async (e) => {
              // Keep the dialog open until the work is finished, then close it ourselves.
              e.preventDefault();
              await onConfirm();
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
