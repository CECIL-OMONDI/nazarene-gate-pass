import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Truck, Trash2, Pencil, AlertTriangle, Eye, XCircle, Search } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Props = { readOnly?: boolean };

export default function YardDashboard({ readOnly = false }: Props) {
  const [pending, setPending] = useState<any[]>([]);
  const [yard, setYard] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [siteInv, setSiteInv] = useState<any[]>([]);
  const [siteTools, setSiteTools] = useState<any[]>([]);
  const [yardSearch, setYardSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

  const load = async () => {
    const [{ data: orders }, { data: y }, { data: m }, { data: a }, { data: s }, { data: si }, { data: tl }] = await Promise.all([
      supabase.from("orders")
        .select("id, status, created_at, notes, sites(name), profiles:contractor_id(full_name), order_items(id, quantity, materials(id, name, unit))")
        .eq("status", "pending").order("created_at"),
      supabase.from("yard_inventory").select("material_id, quantity, materials(name, unit)"),
      supabase.from("materials").select("id, name, unit").order("name"),
      supabase.from("low_stock_alerts").select("id, material_id, message, status, created_at, materials(name, unit)").order("created_at", { ascending: false }),
      supabase.from("sites").select("id, name, location"),
      supabase.from("site_inventory").select("site_id, material_id, quantity, sites(name), materials(name, unit)"),
      supabase.from("tools").select("id, name, quantity, condition, site_id, sites(name)"),
    ]);
    setPending(orders ?? []); setYard(y ?? []); setMaterials(m ?? []);
    setAlerts(a ?? []); setSites(s ?? []); setSiteInv(si ?? []); setSiteTools(tl ?? []);
  };
  useEffect(() => { load(); }, []);

  return (
    <AppShell title={readOnly ? "Yard Storekeeper (View Only)" : "Yard Storekeeper"} backTo={readOnly ? "/admin" : undefined}>
      <Tabs defaultValue="orders">
        <div className="mb-4 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="yard">Yard Stock</TabsTrigger>
            <TabsTrigger value="sites"><Eye className="h-4 w-4 mr-1"/>Site Stock & Tools</TabsTrigger>
            <TabsTrigger value="alerts"><AlertTriangle className="h-4 w-4 mr-1"/>Low-Stock Alerts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders">
          <Card><CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Pending Orders</CardTitle>
            <div className="relative w-56"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
              <Input className="pl-7 h-9" placeholder="Search site/contractor…" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} /></div>
          </CardHeader><CardContent>
            <ScrollArea className="max-h-[70vh] pr-3">
              <div className="space-y-3">
                {pending.length === 0 && <div className="text-muted-foreground text-sm">No pending orders.</div>}
                {pending.filter(o => {
                  const q = orderSearch.toLowerCase();
                  if (!q) return true;
                  return (o.sites?.name ?? "").toLowerCase().includes(q) || (o.profiles?.full_name ?? "").toLowerCase().includes(q);
                }).map(o => <OrderCard key={o.id} order={o} yard={yard} onChange={load} readOnly={readOnly} />)}
              </div>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="yard">
          <Card><CardHeader><CardTitle>Yard Stock</CardTitle></CardHeader><CardContent>
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
                <TableBody>
                  {yard.map(s => <TableRow key={s.material_id}><TableCell>{s.materials?.name}</TableCell><TableCell className="font-mono">{Number(s.quantity).toFixed(2)} {s.materials?.unit}</TableCell></TableRow>)}
                  {yard.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Empty</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="sites">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Site Stock (read-only)</CardTitle></CardHeader><CardContent>
              <ScrollArea className="max-h-[70vh]">
                <Table>
                  <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Material</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {siteInv.map((s, i) => <TableRow key={i}><TableCell>{s.sites?.name}</TableCell><TableCell>{s.materials?.name}</TableCell><TableCell className="font-mono">{Number(s.quantity).toFixed(2)} {s.materials?.unit}</TableCell></TableRow>)}
                    {siteInv.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No site stock</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Site Tools (read-only)</CardTitle></CardHeader><CardContent>
              <ScrollArea className="max-h-[70vh]">
                <Table>
                  <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Tool</TableHead><TableHead>Qty</TableHead><TableHead>Condition</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {siteTools.map(t => <TableRow key={t.id}><TableCell>{t.sites?.name}</TableCell><TableCell>{t.name}</TableCell><TableCell className="font-mono">{t.quantity}</TableCell><TableCell><span className={t.condition === "broken" ? "text-destructive font-medium" : "text-muted-foreground"}>{t.condition}</span></TableCell></TableRow>)}
                    {siteTools.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No tools</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <Card><CardHeader className="flex-row items-center justify-between">
            <CardTitle>Low-Stock Alerts</CardTitle>
            {!readOnly && <NewAlertButton materials={materials} reload={load} />}
          </CardHeader><CardContent>
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead>Raised</TableHead></TableRow></TableHeader>
                <TableBody>
                  {alerts.map(a => <TableRow key={a.id}>
                    <TableCell>{a.materials?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.message}</TableCell>
                    <TableCell><span className={a.status === "open" ? "text-destructive font-medium" : "text-muted-foreground"}>{a.status}</span></TableCell>
                    <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                  </TableRow>)}
                  {alerts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No alerts</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function OrderCard({ order, yard, onChange, readOnly }: { order: any; yard: any[]; onChange: () => void; readOnly: boolean }) {
  const [open, setOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [driver, setDriver] = useState(""); const [plate, setPlate] = useState(""); const [vehicle, setVehicle] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lineQty, setLineQty] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    order.order_items.forEach((it: any) => {
      const avail = yard.find(y => y.material_id === it.materials?.id)?.quantity ?? 0;
      r[it.id] = String(Math.min(Number(it.quantity), Number(avail)));
    });
    return r;
  });

  const dispatch = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    for (const it of order.order_items) {
      const q = Number(lineQty[it.id] ?? it.quantity);
      if (Number.isNaN(q) || q < 0) { setBusy(false); return toast.error("Invalid line quantity"); }
      const { error } = await supabase.from("order_items").update({ dispatched_qty: q } as any).eq("id", it.id);
      if (error) { setBusy(false); return toast.error(error.message); }
    }
    const { error } = await supabase.rpc("dispatch_order_partial" as any, {
      _order_id: order.id, _driver: driver, _plate: plate,
      _vehicle: vehicle || null, _delivery_notes: deliveryNotes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Order dispatched"); setOpen(false); onChange();
  };

  const cancelOrder = async () => {
    const { error } = await supabase.rpc("cancel_pending_order", { _order_id: order.id });
    if (error) return toast.error(error.message);
    toast.success("Order cancelled"); onChange();
  };

  const rejectOrder = async () => {
    if (rejectReason.trim().length < 3) return toast.error("Reason required (min 3 chars)");
    const { error } = await supabase.rpc("reject_order" as any, { _order_id: order.id, _reason: rejectReason });
    if (error) return toast.error(error.message);
    toast.success("Order rejected"); setRejectOpen(false); setRejectReason(""); onChange();
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold">{order.sites?.name}</div>
          <div className="text-xs text-muted-foreground">By {order.profiles?.full_name} · {new Date(order.created_at).toLocaleString()}</div>
        </div>
        {!readOnly && (
          <div className="flex gap-2 flex-wrap">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Truck className="h-4 w-4 mr-1"/>Dispatch</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Dispatch Order (partial allowed)</DialogTitle></DialogHeader>
                <form onSubmit={dispatch} className="space-y-3">
                  <div className="border rounded p-2 max-h-60 overflow-auto">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Set quantity to dispatch per line (0 = skip):</div>
                    {order.order_items.map((it: any) => {
                      const avail = yard.find(y => y.material_id === it.materials?.id)?.quantity ?? 0;
                      return (
                        <div key={it.id} className="grid grid-cols-[1fr_90px] gap-2 items-center py-1 border-t first:border-t-0">
                          <div className="text-sm"><div>{it.materials?.name}</div>
                            <div className="text-xs text-muted-foreground">requested {Number(it.quantity)} · yard {Number(avail).toFixed(2)}</div></div>
                          <Input type="number" min="0" step="0.01"
                            value={lineQty[it.id] ?? ""} onChange={e => setLineQty({ ...lineQty, [it.id]: e.target.value })} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Driver</Label><Input value={driver} onChange={e=>setDriver(e.target.value)} required /></div>
                    <div><Label>Plate</Label><Input value={plate} onChange={e=>setPlate(e.target.value)} required /></div>
                  </div>
                  <div><Label>Vehicle</Label><Input value={vehicle} onChange={e=>setVehicle(e.target.value)} /></div>
                  <div><Label>Delivery notes (proof / instructions)</Label><Textarea rows={2} value={deliveryNotes} onChange={e=>setDeliveryNotes(e.target.value)} /></div>
                  <Button className="w-full" disabled={busy}>{busy ? "Dispatching…" : "Confirm Dispatch"}</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><XCircle className="h-4 w-4 mr-1"/>Reject</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Reject Order</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <Label>Reason (visible to contractor)</Label>
                  <Textarea rows={3} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. duplicate order, awaiting restock…" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setRejectOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={rejectOrder}>Reject Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                  <AlertDialogDescription>Permanently removes the pending order.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep</AlertDialogCancel>
                  <AlertDialogAction onClick={cancelOrder}>Cancel Order</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
      <ul className="mt-3 text-sm">
        {order.order_items.map((it: any) => {
          const inYard = yard.find(y => y.material_id === it.materials?.id);
          const avail = inYard ? Number(inYard.quantity) : 0;
          const short = avail < Number(it.quantity);
          return (
            <li key={it.id} className="flex items-center justify-between border-t py-1.5 gap-2">
              <span className="flex-1">{it.materials?.name}
                {short && <span className="ml-2 text-xs text-destructive">(yard has {avail.toFixed(2)})</span>}
              </span>
              <span className="font-mono text-sm">{Number(it.quantity).toFixed(2)} {it.materials?.unit}</span>
              {!readOnly && <EditItemButton item={it} maxAvail={avail} reload={onChange} />}
            </li>
          );
        })}
      </ul>
      {order.notes && <div className="text-xs text-muted-foreground mt-2">Notes: {order.notes}</div>}
    </div>
  );
}

function EditItemButton({ item, maxAvail, reload }: { item: any; maxAvail: number; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(item.quantity));
  const save = async () => {
    const q = Number(val);
    if (Number.isNaN(q) || q < 0) return toast.error("Enter a valid quantity");
    const { error } = await supabase.rpc("update_pending_order_item", { _item_id: item.id, _new_quantity: q });
    if (error) return toast.error(error.message);
    toast.success(q === 0 ? "Line removed" : "Quantity updated");
    setOpen(false); reload();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3 w-3"/></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {item.materials?.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>New quantity ({item.materials?.unit}) — yard has {maxAvail.toFixed(2)}</Label>
          <Input type="number" min="0" step="0.01" value={val} onChange={e => setVal(e.target.value)} />
          <p className="text-xs text-muted-foreground">Set to 0 to remove this item. The contractor will see your final adjusted quantity.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAlertButton({ materials, reload }: { materials: any[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [matId, setMatId] = useState(""); const [msg, setMsg] = useState("");
  const submit = async () => {
    if (!matId) return toast.error("Choose a material");
    const { error } = await supabase.rpc("create_low_stock_alert", { _material_id: matId, _message: msg || null });
    if (error) return toast.error(error.message);
    toast.success("Alert raised to admin"); setOpen(false); setMatId(""); setMsg(""); reload();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><AlertTriangle className="h-4 w-4 mr-1"/>Alert Admin</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Low-Stock Alert</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Material</Label>
            <Select value={matId} onValueChange={setMatId}>
              <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
              <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Message (optional)</Label><Input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="e.g. Only 2 bags of cement left" /></div>
        </div>
        <DialogFooter><Button onClick={submit}>Send Alert</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
