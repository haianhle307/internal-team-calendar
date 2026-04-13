'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDayOff } from '@/app/actions';

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function AddDayOffDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await createDayOff({
        name,
        startDate,
        endDate: endDate || startDate,
        note: note.trim() ? note.trim() : null,
      });
      if (res.ok) {
        toast.success('Day off added');
        setName(''); setStart(''); setEnd(''); setNote('');
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add day off</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end">End date</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button onClick={submit} disabled={pending || !name.trim() || !startDate}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
