import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { toast } from "sonner";
import { Plus, Trash2, Send, MapPin, AlertOctagon } from "lucide-react";

type Props = { readOnly?: boolean };

export function ContractorHome({ readOnly = false }: Props) {
  const { user } = useAuth();
  const [sites, setSites] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    const q = readOnly
      ? supabase.from("sites").select("*").eq("is_active", true)
      : supabase.from("sites").select("*").eq("contractor_id", user.id).eq("is_active", true);
    q.then(({ data }) => setSites(data ?? []));
  }, [user, readOnly]);
  return (
    <AppShell title={readOnly ? "Contractor Sites (View Only)" : "My Sites"} backTo={readOnly ? "/admin" : undefined}>
      {sites.length === 0 && <div className="text-muted-foreground">No sites.</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map(s => (
          <Link key={s.id} to={readOnly ? `/admin/contractor/site/${s.id}` : `/contractor/site/${s.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2"><MapPin className="h-5 w-5 text-primary"/><span className="font-semibold">{s.name}</span></div>
                <div className="text-sm text-muted-foreground">{s.location}</div>
                <Button variant="outline" size="sm" className="mt-4">Open Site →</Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

export function ContractorSiteDetail({ readOnly = false }: Props) {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<any>(null);
  const [keeper, setKeeper] = useState<any>(null);
  const [workers, setWorkers] = useState({ skilled_count: 0, unskilled_count: 0 });
  const [tools, setTools] = useState<any[]>([]);
  const [siteInv, setSiteInv] = useState<any[]>([]);
  const [usageTotals, setUsageTotals] = useState<any[]>([]);
  const [yard, setYard] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const load = async () => {
    if (!id) return;
    const { data: s } = await supabase.from("sites").select("*, site_keeper:site_keeper_id(full_name, phone)").eq("id", id).maybeSingle();
    setSite(s); setKeeper(s?.site_keeper ?? null);
    const { data: w } = await supabase.from("workers").select("*").eq("site_id", id).maybeSingle();
    if (w) setWorkers({ skilled_count: w.skilled_count, unskilled_count: w.unskilled_count });
    const { data: t } = await supabase.from("tools").select("*").eq("site_id", id).order("name");
    setTools(t ?? []);
    const { data: si } = await supabase.from("site_inventory").select("material_id, quantity, materials(name, unit)").eq("site_id", id);
    setSiteInv(si ?? []);
    const { data: ut } = await supabase.from("v_site_material_usage_totals").select("material_id, total_used, materials(name, unit)").eq("site_id", id);
    setUsageTotals(ut ?? []);
    const { data: y } = await supabase.from("yard_inventory").select("material_id, quantity, materials(name, unit)");
    setYard(y ?? []);
    const { data: o } = await supabase
      .from("orders")
      .select("id, status, created_at, order_items(quantity, materials(name, unit)), order_dispatches(driver_name, plate_number)")
      .eq("site_id", id).neq("status", "received").order("created_at", { ascending: false });
    setOrders(o ?? []);
    const { data: m } = await supabase.from("materials").select("*").order("name");
    setMaterials(m ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const saveWorkers = async () => {
    const { error } = await supabase.from("workers").upsert({ site_id: id!, ...workers });
    if (error) return toast.error(error.message);
    toast.success("Workers updated");
  };

  const brokenTools = tools.filter(t => t.condition === "broken");

  return (
    <AppShell title={site?.name ?? "Site"}>
      <Link to={readOnly ? "/admin/contractor" : "/contractor"} className="text-sm text-primary hover:underline">← All sites</Link>

      {brokenTools.length > 0 && (
        <div className="mt-3 border border-destructive/40 bg-destructive/10 rounded-lg p-3 flex items-start gap-2">
          <AlertOctagon className="h-4 w-4 text-destructive mt-0.5"/>
          <div className="text-sm">
            <span className="font-medium text-destructive">Broken tools:</span>{" "}
            {brokenTools.map(t => `${t.name} (${t.quantity})`).join(", ")}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
        <Card><CardHeader><CardTitle>Site Storekeeper</CardTitle></CardHeader><CardContent>
          {keeper ? <div><div className="font-medium">{keeper.full_name}</div><div className="text-sm text-muted-foreground">{keeper.phone}</div></div>
            : <div className="text-muted-foreground text-sm">No storekeeper assigned</div>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Workers</CardTitle></CardHeader><CardContent className="space-y-2">
          <div><Label>Skilled</Label><Input type="number" min="0" value={workers.skilled_count} disabled={readOnly} onChange={e=>setWorkers({...workers, skilled_count: Number(e.target.value)})} /></div>
          <div><Label>Unskilled</Label><Input type="number" min="0" value={workers.unskilled_count} disabled={readOnly} onChange={e=>setWorkers({...workers, unskilled_count: Number(e.target.value)})} /></div>
          {!readOnly && <Button onClick={saveWorkers} size="sm" className="w-full">Save</Button>}
        </CardContent></Card>
        <ToolsCard siteId={id!} tools={tools} reload={load} readOnly={readOnly} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card><CardHeader><CardTitle>Site Stock</CardTitle></CardHeader><CardContent>
          <ScrollArea className="max-h-[50vh]">
            <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead>In Store</TableHead><TableHead>Total Used</TableHead></TableRow></TableHeader>
              <TableBody>
                {siteInv.map(s => {
                  const used = usageTotals.find(u => u.material_id === s.material_id);
                  return (<TableRow key={s.material_id}>
                    <TableCell>{s.materials?.name}</TableCell>
                    <TableCell className="font-mono">{Number(s.quantity).toFixed(2)} {s.materials?.unit}</TableCell>
                    <TableCell className="font-mono">{used ? Number(used.total_used).toFixed(2) : "0.00"} {s.materials?.unit}</TableCell>
                  </TableRow>);
                })}
                {siteInv.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No stock yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Yard Stock (read-only)</CardTitle></CardHeader><CardContent>
          <ScrollArea className="max-h-[50vh]">
            <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
              <TableBody>
                {yard.map(y => <TableRow key={y.material_id}><TableCell>{y.materials?.name}</TableCell><TableCell className="font-mono">{Number(y.quantity).toFixed(2)} {y.materials?.unit}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {!readOnly && <PlaceOrderCard siteId={id!} materials={materials} reload={load} />}
        <Card className={readOnly ? "lg:col-span-2" : ""}><CardHeader><CardTitle>Open Orders <span className="text-xs font-normal text-muted-foreground">(quantities reflect yard's final adjustments)</span></CardTitle></CardHeader><CardContent>
          <ScrollArea className="max-h-[50vh] pr-3">
            <div className="space-y-3">
              {orders.length === 0 && <div className="text-muted-foreground text-sm">No open orders</div>}
              {orders.map(o => (
                <div key={o.id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-muted">{o.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <ul className="text-sm mt-2">
                    {o.order_items.map((it: any, i: number) => <li key={i} className="flex justify-between border-t py-1"><span>{it.materials?.name}</span><span className="font-mono">{Number(it.quantity).toFixed(2)} {it.materials?.unit}</span></li>)}
                  </ul>
                  {o.order_dispatches && <div className="text-xs text-muted-foreground mt-2">In transit · Driver {o.order_dispatches.driver_name} · {o.order_dispatches.plate_number}</div>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent></Card>
      </div>
    </AppShell>
  );
}

function ToolsCard({ siteId, tools, reload, readOnly }: { siteId: string; tools: any[]; reload: () => void; readOnly: boolean }) {
  const [name, setName] = useState(""); const [qty, setQty] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("tools").upsert({ site_id: siteId, name, quantity: Number(qty) }, { onConflict: "site_id,name" });
    if (error) return toast.error(error.message);
    setName(""); setQty(""); reload();
  };
  const del = async (id: string) => { await supabase.from("tools").delete().eq("id", id); reload(); };
  return (
    <Card><CardHeader><CardTitle>Tools</CardTitle></CardHeader><CardContent className="space-y-2">
      {!readOnly && (
        <form onSubmit={add} className="flex gap-2">
          <Input placeholder="e.g. wheelbarrow" value={name} onChange={e=>setName(e.target.value)} required />
          <Input type="number" min="0" placeholder="qty" value={qty} onChange={e=>setQty(e.target.value)} required className="w-20" />
          <Button size="icon"><Plus className="h-4 w-4"/></Button>
        </form>
      )}
      <ScrollArea className="max-h-64">
        <ul className="text-sm divide-y">
          {tools.map(t => <li key={t.id} className="flex items-center justify-between py-1.5">
            <span className="flex items-center gap-2">
              {t.name}
              {t.condition === "broken" && <span className="text-xs text-destructive font-medium">broken</span>}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono">{t.quantity}</span>
              {!readOnly && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>del(t.id)}><Trash2 className="h-3 w-3"/></Button>}
            </span>
          </li>)}
          {tools.length === 0 && <li className="text-muted-foreground py-2">No tools</li>}
        </ul>
      </ScrollArea>
    </CardContent></Card>
  );
}

function PlaceOrderCard({ siteId, materials, reload }: { siteId: string; materials: any[]; reload: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<{ material_id: string; quantity: string }[]>([{ material_id: "", quantity: "" }]);
  const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = items.filter(i => i.material_id && Number(i.quantity) > 0);
    if (valid.length === 0) return toast.error("Add at least one material");
    if (!user) return;
    setBusy(true);
    const { data: order, error } = await supabase.from("orders")
      .insert({ site_id: siteId, contractor_id: user.id, notes: notes || null }).select("id").single();
    if (error || !order) { setBusy(false); return toast.error(error?.message || "Failed"); }
    const { error: e2 } = await supabase.from("order_items").insert(valid.map(v => ({
      order_id: order.id, material_id: v.material_id, quantity: Number(v.quantity),
    })));
    setBusy(false);
    if (e2) return toast.error(e2.message);
    toast.success("Order placed");
    setItems([{ material_id: "", quantity: "" }]); setNotes(""); reload();
  };

  return (
    <Card><CardHeader><CardTitle>Place Order to Yard</CardTitle></CardHeader><CardContent>
      <form onSubmit={submit} className="space-y-3">
        <ScrollArea className="max-h-72 pr-3">
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_auto] gap-2">
                <Select value={it.material_id} onValueChange={v => setItems(items.map((x, i) => i === idx ? { ...x, material_id: v } : x))}>
                  <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                  <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="0.01" step="0.01" placeholder="qty" value={it.quantity} onChange={e => setItems(items.map((x,i) => i===idx ? {...x, quantity: e.target.value} : x))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}><Trash2 className="h-4 w-4"/></Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { material_id: "", quantity: "" }])}><Plus className="h-4 w-4 mr-1"/>Add line</Button>
        <div><Label>Notes</Label><Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional" /></div>
        <Button type="submit" className="w-full" disabled={busy}><Send className="h-4 w-4 mr-1"/>{busy ? "Placing…" : "Submit Order"}</Button>
      </form>
    </CardContent></Card>
  );
}
