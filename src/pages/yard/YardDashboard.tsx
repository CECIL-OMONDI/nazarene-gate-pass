import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck } from "lucide-react";

export default function YardDashboard() {
  const [pending, setPending] = useState<any[]>([]);
  const [yard, setYard] = useState<any[]>([]);
  const load = async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, status, created_at, notes, sites(name), profiles:contractor_id(full_name), order_items(quantity, materials(id, name, unit))")
      .eq("status", "pending")
      .order("created_at");
    setPending(orders ?? []);
    const { data: y } = await supabase.from("yard_inventory").select("material_id, quantity, materials(name, unit)");
    setYard(y ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <AppShell title="Yard Storekeeper">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card><CardHeader><CardTitle>Pending Orders</CardTitle></CardHeader><CardContent className="space-y-3">
            {pending.length === 0 && <div className="text-muted-foreground text-sm">No pending orders.</div>}
            {pending.map(o => <OrderCard key={o.id} order={o} onChange={load} />)}
          </CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle>Yard Stock</CardTitle></CardHeader><CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
            <TableBody>
              {yard.map(s => <TableRow key={s.material_id}><TableCell>{s.materials?.name}</TableCell><TableCell className="font-mono">{Number(s.quantity).toFixed(2)} {s.materials?.unit}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </AppShell>
  );
}

function OrderCard({ order, onChange }: { order: any; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [driver, setDriver] = useState(""); const [plate, setPlate] = useState(""); const [vehicle, setVehicle] = useState("");
  const [busy, setBusy] = useState(false);

  const dispatch = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.rpc("dispatch_order", { _order_id: order.id, _driver: driver, _plate: plate, _vehicle: vehicle || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Order dispatched"); setOpen(false); onChange();
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{order.sites?.name}</div>
          <div className="text-xs text-muted-foreground">By {order.profiles?.full_name} · {new Date(order.created_at).toLocaleString()}</div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Truck className="h-4 w-4 mr-1"/>Dispatch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Dispatch Order</DialogTitle></DialogHeader>
            <form onSubmit={dispatch} className="space-y-3">
              <div><Label>Driver name</Label><Input value={driver} onChange={e=>setDriver(e.target.value)} required /></div>
              <div><Label>Plate number</Label><Input value={plate} onChange={e=>setPlate(e.target.value)} required /></div>
              <div><Label>Vehicle (optional)</Label><Input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="e.g. Isuzu Lorry" /></div>
              <Button className="w-full" disabled={busy}>{busy ? "Dispatching…" : "Confirm Dispatch"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <ul className="mt-3 text-sm">
        {order.order_items.map((it: any, i: number) => (
          <li key={i} className="flex justify-between border-t py-1.5">
            <span>{it.materials?.name}</span>
            <span className="font-mono">{Number(it.quantity).toFixed(2)} {it.materials?.unit}</span>
          </li>
        ))}
      </ul>
      {order.notes && <div className="text-xs text-muted-foreground mt-2">Notes: {order.notes}</div>}
    </div>
  );
}
