import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'Henuz veri yok', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-dark-400">
      <Icon size={48} strokeWidth={1.5} />
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}
