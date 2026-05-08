import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, MinusCircle, Wrench, AlertOctagon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Props = { readOnly?: boolean };

export default function SiteKeeperDashboard({ readOnly = false }: Props) {
  const { user } = useAuth();
  const [sites, setSites] = useState<any[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string>("");
  const [incoming, setIncoming] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);

  const loadSites = async () => {
    if (!user) return;
    const q = readOnly
      ? supabase.from("sites").select("*")
      : supabase.from("sites").select("*").eq("site_keeper_id", user.id);
    const { data } = await q;
    setSites(data ?? []);
    if (data && data.length && !activeSiteId) setActiveSiteId(data[0].id);
  };

  const loadSite = async () => {
    if (!activeSiteId) return;
    const [{ data: o }, { data: s }, { data: t }] = await Promise.all([
      supabase.from("orders")
        .select("id, status, created_at, sites(name), order_items(quantity, materials(name, unit)), order_dispatches(driver_name, plate_number, vehicle)")
        .eq("site_id", activeSiteId).eq("status", "dispatched"),
      supabase.from("site_inventory").select("material_id, quantity, materials(id, name, unit)").eq("site_id", activeSiteId),
      supabase.from("tools").select("id, name, quantity, condition, broken_count").eq("site_id", activeSiteId).order("name"),
    ]);
    setIncoming(o ?? []); setStock(s ?? []); setTools(t ?? []);
  };

  useEffect(() => { loadSites(); }, [user]);
  useEffect(() => { loadSite(); }, [activeSiteId]);

  const confirm = async (id: string) => {
    const { error } = await supabase.rpc("receive_order", { _order_id: id });
    if (error) return toast.error(error.message);
    toast.success("Order received and added to site stock");
    loadSite();
  };

  return (
    <AppShell title={readOnly ? "Site Storekeeper (View Only)" : "Site Storekeeper"} backTo={readOnly ? "/admin" : undefined}>
      <div className="mb-4 max-w-sm">
        <Label>Site</Label>
        <Select value={activeSiteId} onValueChange={setActiveSiteId}>
          <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
          <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!activeSiteId ? <div className="text-muted-foreground">No sites assigned.</div> : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Incoming Deliveries</CardTitle></CardHeader><CardContent>
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-3">
                  {incoming.length === 0 && <div className="text-muted-foreground text-sm">No incoming deliveries.</div>}
                  {incoming.map(o => (
                    <div key={o.id} className="border rounded p-3">
                      <div className="flex justify-between"><span className="font-semibold">Delivery</span><span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span></div>
                      {o.order_dispatches && <div className="text-xs text-muted-foreground">Driver {o.order_dispatches.driver_name} · {o.order_dispatches.plate_number}{o.order_dispatches.vehicle ? ` · ${o.order_dispatches.vehicle}` : ""}</div>}
                      <ul className="text-sm mt-2">
                        {o.order_items.map((it: any, i: number) => <li key={i} className="flex justify-between border-t py-1"><span>{it.materials?.name}</span><span className="font-mono">{Number(it.quantity).toFixed(2)} {it.materials?.unit}</span></li>)}
                      </ul>
                      {!readOnly && <Button size="sm" className="mt-3 w-full" onClick={() => confirm(o.id)}><CheckCircle2 className="h-4 w-4 mr-1"/>Confirm Receipt</Button>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent></Card>

            {!readOnly && <UsageCard siteId={activeSiteId} stock={stock} reload={loadSite} />}
          </div>

          <Card className="mt-4"><CardHeader><CardTitle>Site Stock</CardTitle></CardHeader><CardContent>
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Quantity</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stock.map(s => <TableRow key={s.material_id}><TableCell>{s.materials?.name}</TableCell><TableCell className="font-mono">{Number(s.quantity).toFixed(2)} {s.materials?.unit}</TableCell></TableRow>)}
                  {stock.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Empty</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>

          <Card className="mt-4"><CardHeader><CardTitle><Wrench className="h-4 w-4 inline mr-1"/>Tools — Mark Condition</CardTitle></CardHeader><CardContent>
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader><TableRow><TableHead>Tool</TableHead><TableHead>Qty</TableHead><TableHead>Broken</TableHead><TableHead>Condition</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {tools.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell className="font-mono">{t.quantity}</TableCell>
                      <TableCell className="font-mono">{t.broken_count ?? 0}</TableCell>
                      <TableCell><span className={t.condition === "broken" ? "text-destructive font-medium" : "text-muted-foreground"}>{t.condition}</span></TableCell>
                      <TableCell className="text-right">
                        {!readOnly && <BrokenDialog tool={t} reload={loadSite} />}
                      </TableCell>
                    </TableRow>
                  ))}
                  {tools.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No tools yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent></Card>
        </>
      )}
    </AppShell>
  );
}

function UsageCard({ siteId, stock, reload }: { siteId: string; stock: any[]; reload: () => void }) {
  const [matId, setMatId] = useState(""); const [qty, setQty] = useState(""); const [notes, setNotes] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matId || !(Number(qty) > 0)) return toast.error("Pick material and positive quantity");
    const { error } = await supabase.rpc("record_usage", { _site_id: siteId, _material_id: matId, _quantity: Number(qty), _used_on: null, _notes: notes || null });
    if (error) return toast.error(error.message);
    toast.success("Usage recorded"); setMatId(""); setQty(""); setNotes(""); reload();
  };
  return (
    <Card><CardHeader><CardTitle>Record Daily Usage</CardTitle></CardHeader><CardContent>
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Material (from site stock)</Label>
          <Select value={matId} onValueChange={setMatId}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {stock.filter(s => Number(s.quantity) > 0).map(s => <SelectItem key={s.material_id} value={s.material_id}>{s.materials?.name} ({Number(s.quantity).toFixed(2)} {s.materials?.unit} avail)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Quantity used</Label><Input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(e.target.value)} required /></div>
        <div><Label>Notes</Label><Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional" /></div>
        <Button className="w-full"><MinusCircle className="h-4 w-4 mr-1"/>Record Usage</Button>
      </form>
    </CardContent></Card>
  );
}

function BrokenDialog({ tool, reload }: { tool: any; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(String(tool.broken_count ?? 0));
  const save = async () => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0 || n > tool.quantity) return toast.error(`Enter a whole number between 0 and ${tool.quantity}`);
    const { error } = await supabase.rpc("set_tool_broken_count", { _tool_id: tool.id, _broken: n });
    if (error) return toast.error(error.message);
    toast.success("Updated"); setOpen(false); reload();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setVal(String(tool.broken_count ?? 0)); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <AlertOctagon className="h-3 w-3 mr-1"/>Mark Broken
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{tool.name} — broken count</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>How many of the {tool.quantity} unit(s) are broken?</Label>
          <Input type="number" min="0" max={tool.quantity} step="1" value={val} onChange={e=>setVal(e.target.value)} />
          <p className="text-xs text-muted-foreground">Set to 0 to mark all working again.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
