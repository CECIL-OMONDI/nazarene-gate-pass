import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

type Comment = {
  id: string; body: string; created_at: string; user_id: string;
  profiles?: { full_name: string } | null;
};

export default function OrderComments({ orderId, label = "Discussion" }: { orderId: string; label?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);

  const load = async () => {
    const { data } = await supabase.from("order_comments")
      .select("id, body, created_at, user_id, profiles:user_id(full_name)")
      .eq("order_id", orderId).order("created_at");
    setItems((data ?? []) as any);
    setCount((data ?? []).length);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orderId]);

  useEffect(() => {
    if (!open) return;
    const ch = supabase.channel(`oc-${orderId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_comments", filter: `order_id=eq.${orderId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, orderId]);

  const send = async () => {
    if (!user || !body.trim()) return;
    const { error } = await supabase.from("order_comments").insert({ order_id: orderId, user_id: user.id, body: body.trim() });
    if (error) return toast.error(error.message);
    setBody(""); load();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2">
          <MessageSquare className="h-3 w-3 mr-1"/>{label}{count ? ` (${count})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Order Discussion</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-72 border rounded p-2">
          {items.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">No messages yet</div>}
          <div className="space-y-2">
            {items.map(c => (
              <div key={c.id} className={`text-sm ${c.user_id === user?.id ? "text-right" : ""}`}>
                <div className="text-[10px] text-muted-foreground">{c.profiles?.full_name ?? "—"} · {new Date(c.created_at).toLocaleString()}</div>
                <div className={`inline-block px-2 py-1 rounded ${c.user_id === user?.id ? "bg-primary/15" : "bg-muted"}`}>{c.body}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); send(); }}} placeholder="Type a message…" />
          <Button onClick={send} size="icon"><Send className="h-4 w-4"/></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
