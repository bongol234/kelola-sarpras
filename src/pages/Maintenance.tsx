import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";

interface Maint {
  id: string; item_id: string; scheduled_date: string; completed_date: string | null;
  description: string; cost: number | null; status: "terjadwal" | "berlangsung" | "selesai"; performed_by: string | null;
}
interface ItemRef { id: string; name: string; code: string; }

const STATUS_LABEL: Record<string, string> = { terjadwal: "Terjadwal", berlangsung: "Berlangsung", selesai: "Selesai" };
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  terjadwal: "outline", berlangsung: "default", selesai: "secondary",
};

export default function Maintenance() {
  const { user, isStaff } = useAuth();
  const [data, setData] = useState<Maint[]>([]);
  const [items, setItems] = useState<ItemRef[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const [m, i] = await Promise.all([
      supabase.from("maintenance_records").select("*").order("scheduled_date", { ascending: false }),
      supabase.from("items").select("id, name, code").order("name"),
    ]);
    setData((m.data as Maint[]) ?? []);
    setItems((i.data as ItemRef[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const itemLabel = (id: string) => {
    const it = items.find(x => x.id === id);
    return it ? `${it.name} (${it.code})` : "—";
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("maintenance_records").insert({
      item_id: String(fd.get("item_id")),
      scheduled_date: String(fd.get("scheduled_date")),
      description: String(fd.get("description")),
      cost: parseFloat(String(fd.get("cost") || "0")) || 0,
      performed_by: (fd.get("performed_by") as string) || null,
      status: "terjadwal",
      created_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Perawatan dijadwalkan"); setOpen(false); load(); }
  }

  async function setStatus(id: string, status: Maint["status"]) {
    const patch: any = { status };
    if (status === "selesai") patch.completed_date = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("maintenance_records").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Diperbarui"); load(); }
  }

  return (
    <div>
      <PageHeader title="Jadwal & Catatan Perawatan" description="Kelola jadwal perawatan dan perbaikan barang"
        action={isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Jadwalkan Perawatan</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Jadwalkan Perawatan</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Barang *</Label>
                  <Select name="item_id" required>
                    <SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                    <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Tanggal Jadwal *</Label><Input name="scheduled_date" type="date" required /></div>
                <div className="space-y-2"><Label>Deskripsi Perawatan *</Label><Textarea name="description" required rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Pelaksana</Label><Input name="performed_by" /></div>
                  <div className="space-y-2"><Label>Biaya (Rp)</Label><Input name="cost" type="number" step="0.01" defaultValue={0} /></div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />
      <Card>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Barang</TableHead><TableHead>Jadwal</TableHead><TableHead>Selesai</TableHead>
            <TableHead>Deskripsi</TableHead><TableHead>Pelaksana</TableHead>
            <TableHead className="text-right">Biaya (Rp)</TableHead><TableHead>Status</TableHead>
            {isStaff && <TableHead>Aksi</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Belum ada catatan perawatan</TableCell></TableRow>
            ) : data.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{itemLabel(m.item_id)}</TableCell>
                <TableCell>{m.scheduled_date}</TableCell>
                <TableCell>{m.completed_date || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{m.description}</TableCell>
                <TableCell>{m.performed_by || "—"}</TableCell>
                <TableCell className="text-right">{(m.cost ?? 0).toLocaleString("id-ID")}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status]}</Badge></TableCell>
                {isStaff && (
                  <TableCell>
                    {m.status !== "selesai" && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, "selesai")}>
                        <CheckCircle2 className="mr-1 h-4 w-4 text-success" /> Selesai
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
