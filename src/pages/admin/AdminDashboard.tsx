import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Package, Users, MapPin, Boxes, Trash2, AlertTriangle, ExternalLink } from "lucide-react";

type Material = { id: string; name: string; unit: string; category: string | null };
type Profile = { id: string; username: string; full_name: string };
type Site = { id: string; name: string; location: string | null; contractor_id: string | null; site_keeper_id: string | null; is_active: boolean };

export default function AdminDashboard() {
  return (
    <AppShell title="Administrator Dashboard">
      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="overview"><Boxes className="h-4 w-4 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="yard"><Package className="h-4 w-4 mr-1" />Yard</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="sites"><MapPin className="h-4 w-4 mr-1" />Sites</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="usage">Site Usage</TabsTrigger>
          <TabsTrigger value="alerts"><AlertTriangle className="h-4 w-4 mr-1"/>Alerts</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview /></TabsContent>
        <TabsContent value="yard"><YardTab /></TabsContent>
        <TabsContent value="materials"><MaterialsTab /></TabsContent>
        <TabsContent value="sites"><SitesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="usage"><UsageTab /></TabsContent>
        <TabsContent value="alerts"><AlertsTab /></TabsContent>
        <TabsContent value="dashboards"><DashboardsTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Overview() {
  const [stats, setStats] = useState({ sites: 0, materials: 0, pendingOrders: 0, users: 0 });
  useEffect(() => {
    (async () => {
      const [a, b, c, d] = await Promise.all([
        supabase.from("sites").select("*", { count: "exact", head: true }),
        supabase.from("materials").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);
      setStats({ sites: a.count ?? 0, materials: b.count ?? 0, pendingOrders: c.count ?? 0, users: d.count ?? 0 });
    })();
  }, []);
  const cards = [
    { label: "Active Sites", value: stats.sites },
    { label: "Materials in Catalog", value: stats.materials },
    { label: "Pending Orders", value: stats.pendingOrders },
    { label: "Users", value: stats.users },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}><CardContent className="pt-6">
          <div className="text-3xl font-bold text-primary">{c.value}</div>
          <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function MaterialsTab() {
  const [list, setList] = useState<Material[]>([]);
  const [name, setName] = useState(""); const [unit, setUnit] = useState(""); const [cat, setCat] = useState("");
  const load = async () => {
    const { data } = await supabase.from("materials").select("*").order("name");
    setList((data ?? []) as Material[]);
  };
  useEffect(() => { load(); }, []);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("materials").insert({ name, unit, category: cat || null });
    if (error) return toast.error(error.message);
    toast.success("Material added"); setName(""); setUnit(""); setCat(""); load();
  };
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1"><CardHeader><CardTitle>Add Material</CardTitle></CardHeader><CardContent>
        <form onSubmit={add} className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Cement, Steel T12" /></div>
          <div><Label>Unit</Label><Input value={unit} onChange={e=>setUnit(e.target.value)} required placeholder="e.g. bag, m, pc" /></div>
          <div><Label>Category</Label><Input value={cat} onChange={e=>setCat(e.target.value)} placeholder="e.g. Steel" /></div>
          <Button className="w-full"><Plus className="h-4 w-4 mr-1"/>Add</Button>
        </form>
      </CardContent></Card>
      <Card className="md:col-span-2"><CardHeader><CardTitle>Material Catalog</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Unit</TableHead><TableHead>Category</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(m => (<TableRow key={m.id}><TableCell className="font-medium">{m.name}</TableCell><TableCell>{m.unit}</TableCell><TableCell>{m.category}</TableCell></TableRow>))}
            {list.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No materials yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function YardTab() {
  const [stock, setStock] = useState<Array<{ material_id: string; quantity: number; materials: Material }>>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matId, setMatId] = useState(""); const [qty, setQty] = useState(""); const [supplier, setSupplier] = useState("");

  const load = async () => {
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from("yard_inventory").select("material_id, quantity, materials(id,name,unit,category)"),
      supabase.from("materials").select("*").order("name"),
    ]);
    setStock((s ?? []) as any); setMaterials((m ?? []) as Material[]);
  };
  useEffect(() => { load(); }, []);

  const restock = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = Number(qty);
    if (!matId || !(q > 0)) return toast.error("Choose material and positive quantity");
    const { error } = await supabase.rpc("restock_yard", { _material_id: matId, _quantity: q, _supplier: supplier || null, _notes: null });
    if (error) return toast.error(error.message);
    toast.success("Yard restocked"); setQty(""); setSupplier(""); load();
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card><CardHeader><CardTitle>Restock Yard</CardTitle></CardHeader><CardContent>
        <form onSubmit={restock} className="space-y-3">
          <div><Label>Material</Label>
            <Select value={matId} onValueChange={setMatId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(e.target.value)} required /></div>
          <div><Label>Supplier (optional)</Label><Input value={supplier} onChange={e=>setSupplier(e.target.value)} /></div>
          <Button className="w-full">Add to Yard</Button>
        </form>
      </CardContent></Card>
      <Card className="md:col-span-2"><CardHeader><CardTitle>Yard Inventory</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Qty in Yard</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
          <TableBody>
            {stock.map(s => (<TableRow key={s.material_id}>
              <TableCell className="font-medium">{s.materials?.name}</TableCell>
              <TableCell className="font-mono">{Number(s.quantity).toFixed(2)}</TableCell>
              <TableCell>{s.materials?.unit}</TableCell>
            </TableRow>))}
            {stock.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Yard empty</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function SitesTab() {
  const [sites, setSites] = useState<Site[]>([]);
  const [profiles, setProfiles] = useState<Array<Profile & { roles: string[] }>>([]);
  const [name, setName] = useState(""); const [loc, setLoc] = useState("");
  const [contractorId, setContractorId] = useState<string>(""); const [keeperId, setKeeperId] = useState<string>("");

  const load = async () => {
    const { data: s } = await supabase.from("sites").select("*").order("name");
    setSites((s ?? []) as Site[]);
    const { data: p } = await supabase.from("profiles").select("id, username, full_name");
    const { data: r } = await supabase.from("user_roles").select("user_id, role");
    const map: Record<string, string[]> = {};
    (r ?? []).forEach((x) => { (map[x.user_id] ??= []).push(x.role); });
    setProfiles((p ?? []).map((u) => ({ ...u, roles: map[u.id] ?? [] })) as any);
  };
  useEffect(() => { load(); }, []);

  const contractors = profiles.filter(p => p.roles.includes("contractor"));
  const keepers = profiles.filter(p => p.roles.includes("site_storekeeper"));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("sites").insert({
      name, location: loc || null,
      contractor_id: contractorId || null,
      site_keeper_id: keeperId || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Site created"); setName(""); setLoc(""); setContractorId(""); setKeeperId(""); load();
  };

  const updateAssignment = async (id: string, field: "contractor_id" | "site_keeper_id", value: string | null) => {
    const { error } = await supabase.from("sites").update({ [field]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card><CardHeader><CardTitle>Create Site</CardTitle></CardHeader><CardContent>
        <form onSubmit={create} className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required /></div>
          <div><Label>Location</Label><Input value={loc} onChange={e=>setLoc(e.target.value)} /></div>
          <div><Label>Contractor</Label>
            <Select value={contractorId} onValueChange={setContractorId}>
              <SelectTrigger><SelectValue placeholder="Assign later…" /></SelectTrigger>
              <SelectContent>{contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.username})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Site Storekeeper</Label>
            <Select value={keeperId} onValueChange={setKeeperId}>
              <SelectTrigger><SelectValue placeholder="Assign later…" /></SelectTrigger>
              <SelectContent>{keepers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.username})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full">Create Site</Button>
        </form>
      </CardContent></Card>
      <Card className="md:col-span-2"><CardHeader><CardTitle>All Sites</CardTitle></CardHeader><CardContent>
        <ScrollArea className="max-h-[70vh]">
          <Table>
            <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Contractor</TableHead><TableHead>Site Keeper</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {sites.map(s => (
                <TableRow key={s.id}>
                  <TableCell><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.location}</div></TableCell>
                  <TableCell>
                    <Select value={s.contractor_id ?? "_none"} onValueChange={v => updateAssignment(s.id, "contractor_id", v === "_none" ? null : v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— unassigned —</SelectItem>
                        {contractors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={s.site_keeper_id ?? "_none"} onValueChange={v => updateAssignment(s.id, "site_keeper_id", v === "_none" ? null : v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— unassigned —</SelectItem>
                        {keepers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <DeleteSiteButton site={s} reload={load} />
                  </TableCell>
                </TableRow>
              ))}
              {sites.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No sites yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent></Card>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<Array<Profile & { roles: string[] }>>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", phone: "", role: "contractor" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, username, full_name").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map: Record<string, string[]> = {};
    (r ?? []).forEach((x) => { (map[x.user_id] ??= []).push(x.role); });
    setUsers((p ?? []).map((u) => ({ ...u, roles: map[u.id] ?? [] })) as any);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", { body: form });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("User created");
      setForm({ username: "", password: "", full_name: "", phone: "", role: "contractor" });
      setOpen(false); load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card><CardHeader className="flex-row items-center justify-between">
      <CardTitle>Users</CardTitle>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1"/>Add User</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={e=>setForm({...form, full_name: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Username</Label><Input value={form.username} onChange={e=>setForm({...form, username: e.target.value.toLowerCase()})} required pattern="[a-z0-9_.\-]{3,32}" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div><Label>Password (min 8)</Label><Input type="password" minLength={8} value={form.password} onChange={e=>setForm({...form, password: e.target.value})} required /></div>
            <div><Label>Role</Label>
              <Select value={form.role} onValueChange={v=>setForm({...form, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="yard_storekeeper">Yard Storekeeper</SelectItem>
                  <SelectItem value="site_storekeeper">Site Storekeeper</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={busy}>{busy ? "Creating…" : "Create"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </CardHeader><CardContent>
      <ScrollArea className="max-h-[70vh]">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Roles</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="font-mono text-sm">{u.username}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{u.roles.map(r => <span key={r} className="text-xs bg-muted px-2 py-0.5 rounded">{r}</span>)}</div></TableCell>
                <TableCell><DeleteUserButton user={u} reload={load} /></TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No users yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </ScrollArea>
    </CardContent></Card>
  );
}

function UsageTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("v_site_material_usage_totals")
        .select("site_id, material_id, total_used, sites(name), materials(name, unit)")
        .order("site_id");
      setRows(data ?? []);
    })();
  }, []);
  return (
    <Card><CardHeader><CardTitle>Total Materials Used per Site (per material)</CardTitle></CardHeader><CardContent>
      <Table>
        <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Material</TableHead><TableHead>Total Used</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.sites?.name}</TableCell>
              <TableCell>{r.materials?.name}</TableCell>
              <TableCell className="font-mono">{Number(r.total_used).toFixed(2)}</TableCell>
              <TableCell>{r.materials?.unit}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No usage recorded yet</TableCell></TableRow>}
        </TableBody>
      </Table>
    </CardContent></Card>
  );
}
