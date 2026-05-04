import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, MinusCircle } from "lucide-react";

export default function SiteKeeperDashboard() {
  const { user } = useAuth();
  const [sites, setSites] = useState<any[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string>("");
  const [incoming, setIncoming] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);

  const loadSites = async () => {
    if (!user) return;
    const { data } = await supabase.from("sites").select("*").eq("site_keeper_id", user.id);
    setSites(data ?? []);
    if (data && data.length && !activeSiteId) setActiveSiteId(data[0].id);
  };

  const loadSite = async () => {
    if (!activeSiteId) return;
    const { data: o } = await supabase.from("orders")
      .select("id, status, created_at, sites(name), order_items(quantity, materials(name, unit)), order_dispatches(driver_name, plate_number, vehicle)")
      .eq("site_id", activeSiteId).eq("status", "dispatched");
    setIncoming(o ?? []);
    const { data: s } = await supabase.from("site_inventory").select("material_id, quantity, materials(id, name, unit)").eq("site_id", activeSiteId);
    setStock(s ?? []);
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
    <AppShell title="Site Storekeeper">
      <div className="mb-4 max-w-sm">
        <Label>Site</Label>
        <Select value={activeSiteId} onValueChange={setActiveSiteId}>
          <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
          <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!activeSiteId ? <div className="text-muted-foreground">No sites assigned.</div> : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle>Incoming Deliveries</CardTitle></CardHeader><CardContent className="space-y-3">
            {incoming.length === 0 && <div className="text-muted-foreground text-sm">No incoming deliveries.</div>}
            {incoming.map(o => (
              <div key={o.id} className="border rounded p-3">
                <div className="flex justify-between"><span className="font-semibold">Delivery</span><span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span></div>
                {o.order_dispatches && <div className="text-xs text-muted-foreground">Driver {o.order_dispatches.driver_name} · {o.order_dispatches.plate_number}{o.order_dispatches.vehicle ? ` · ${o.order_dispatches.vehicle}` : ""}</div>}
                <ul className="text-sm mt-2">
                  {o.order_items.map((it: any, i: number) => <li key={i} className="flex justify-between border-t py-1"><span>{it.materials?.name}</span><span className="font-mono">{Number(it.quantity).toFixed(2)} {it.materials?.unit}</span></li>)}
                </ul>
                <Button size="sm" className="mt-3 w-full" onClick={() => confirm(o.id)}><CheckCircle2 className="h-4 w-4 mr-1"/>Confirm Receipt</Button>
              </div>
            ))}
          </CardContent></Card>

          <UsageCard siteId={activeSiteId} stock={stock} reload={loadSite} />
        </div>
      )}

      <Card className="mt-4"><CardHeader><CardTitle>Site Stock</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Quantity</TableHead></TableRow></TableHeader>
          <TableBody>
            {stock.map(s => <TableRow key={s.material_id}><TableCell>{s.materials?.name}</TableCell><TableCell className="font-mono">{Number(s.quantity).toFixed(2)} {s.materials?.unit}</TableCell></TableRow>)}
            {stock.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Empty</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
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
