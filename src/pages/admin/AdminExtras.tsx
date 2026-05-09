// Additional admin tabs: Audit log, Material transfers, Dispatched-orders cancel.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileDown, XCircle, ArrowRightLeft } from "lucide-react";

function downloadCSV(filename: string, rows: any[]) {
  if (rows.length === 0) return toast.info("No data to export");
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function AuditLogTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [entity, setEntity] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    let q = supabase.from("audit_logs")
      .select("id, action, entity, entity_id, payload, created_at, actor_id, profiles:actor_id(full_name)")
      .order("created_at", { ascending: false }).limit(500);
    if (entity !== "all") q = q.eq("entity", entity);
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entity]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.entity.toLowerCase().includes(s)
      || (r.profiles?.full_name ?? "").toLowerCase().includes(s)
      || r.action.toLowerCase().includes(s);
  });

  const csvRows = filtered.map(r => ({
    when: r.created_at, actor: r.profiles?.full_name ?? r.actor_id ?? "system",
    action: r.action, entity: r.entity, entity_id: r.entity_id, payload: JSON.stringify(r.payload),
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Audit Log <span className="text-xs font-normal text-muted-foreground">(last 500)</span></CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} className="w-40 h-9" />
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-40 h-9"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
              <SelectItem value="sites">Sites</SelectItem>
              <SelectItem value="user_roles">Roles</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={()=>downloadCSV("audit.csv", csvRows)}><FileDown className="h-4 w-4 mr-1"/>CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>ID</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell>{r.profiles?.full_name ?? <span className="text-muted-foreground">system</span>}</TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded ${r.action==="DELETE"?"bg-destructive/20 text-destructive":r.action==="INSERT"?"bg-success/20":"bg-muted"}`}>{r.action}</span></TableCell>
                  <TableCell className="font-mono text-xs">{r.entity}</TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[180px]">{r.entity_id}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function TransfersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("material_transfers")
      .select("*, materials(name, unit), from:from_site(name), to:to_site(name), requester:requested_by(full_name)")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_material_transfer" as any, { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Transfer completed"); load();
  };
  const reject = async (id: string, reason: string) => {
    const { error } = await supabase.rpc("reject_material_transfer" as any, { _id: id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Transfer rejected"); load();
  };

  return (
    <Card>
      <CardHeader><CardTitle><ArrowRightLeft className="h-4 w-4 inline mr-1"/>Material Transfers Between Sites</CardTitle></CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Material</TableHead><TableHead>Qty</TableHead><TableHead>Requested by</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.from?.name}</TableCell>
                  <TableCell>{r.to?.name}</TableCell>
                  <TableCell>{r.materials?.name}</TableCell>
                  <TableCell className="font-mono">{Number(r.quantity).toFixed(2)} {r.materials?.unit}</TableCell>
                  <TableCell>{r.requester?.full_name}</TableCell>
                  <TableCell><span className={r.status==="pending"?"text-amber-600 font-medium":r.status==="completed"?"text-success":"text-muted-foreground"}>{r.status}</span></TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => approve(r.id)}>Approve</Button>
                        <RejectTransferDialog onSubmit={(reason) => reject(r.id, reason)} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No transfer requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RejectTransferDialog({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Reject</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject Transfer</DialogTitle></DialogHeader>
        <div><Label>Reason</Label><Textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} /></div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={()=>{ onSubmit(reason); setOpen(false); }}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DispatchedOrdersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("orders")
      .select("id, status, dispatched_at, sites(name), profiles:contractor_id(full_name), order_items(quantity, dispatched_qty, materials(name, unit))")
      .in("status", ["dispatched","partially_dispatched"])
      .order("dispatched_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string, reason: string) => {
    const { error } = await supabase.rpc("cancel_dispatched_order" as any, { _order_id: id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Order cancelled and goods returned to yard"); load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>In-Transit Orders <span className="text-xs font-normal text-muted-foreground">(cancellable — returns goods to yard)</span></CardTitle></CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-3">
            {rows.length === 0 && <div className="text-muted-foreground text-sm">No in-transit orders.</div>}
            {rows.map(o => (
              <div key={o.id} className="border rounded p-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <div className="font-semibold">{o.sites?.name} <span className="text-xs text-muted-foreground">· {o.profiles?.full_name}</span></div>
                    <div className="text-xs text-muted-foreground">Dispatched {o.dispatched_at && new Date(o.dispatched_at).toLocaleString()}</div>
                  </div>
                  <CancelDispatchedDialog onSubmit={(r) => cancel(o.id, r)} />
                </div>
                <ul className="text-sm mt-2">
                  {o.order_items.map((it: any, i: number) => (
                    <li key={i} className="flex justify-between border-t py-1">
                      <span>{it.materials?.name}</span>
                      <span className="font-mono">{Number(it.dispatched_qty ?? it.quantity).toFixed(2)} {it.materials?.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CancelDispatchedDialog({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="destructive"><XCircle className="h-4 w-4 mr-1"/>Cancel & Return</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Cancel dispatched order?</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Reason (truck breakdown, site rejected, etc.)</Label>
          <Textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} />
          <p className="text-xs text-muted-foreground">All dispatched quantities are returned to yard inventory.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Keep</Button>
          <Button variant="destructive" onClick={()=>{ if(reason.trim().length<3) return toast.error("Reason required"); onSubmit(reason); setOpen(false); }}>Cancel Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
