import { ConfirmDialog } from "../ui/confirm-dialog";

export function ConfirmModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return <ConfirmDialog {...props} />;
}

