'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteDayOff } from '@/app/actions';
import type { DayOffEntry } from './month-grid';

export function DayOffPopover({ entry }: { entry: DayOffEntry }) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteDayOff({ id: entry.id, confirmName, expectedName: entry.name });
      if (res.ok) {
        toast.success('Deleted');
        setOpen(false); setConfirmName('');
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmName(''); }}>
      <PopoverTrigger className="block w-full truncate rounded bg-muted px-1.5 py-0.5 text-left hover:bg-muted/80">
        {entry.name}
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <div className="text-sm font-medium">{entry.name}</div>
        <div className="text-xs text-muted-foreground">
          {entry.startDate}{entry.endDate !== entry.startDate ? ` → ${entry.endDate}` : ''}
        </div>
        {entry.note && <div className="text-sm">{entry.note}</div>}
        <div className="space-y-1 pt-2 border-t">
          <div className="text-xs">Type <span className="font-mono">{entry.name}</span> to confirm delete:</div>
          <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={entry.name} />
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDelete}
            disabled={pending || confirmName.trim() !== entry.name.trim()}
          >
            Delete
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
