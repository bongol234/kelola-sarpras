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
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";

interface Item {
  id: string; code: string; name: string; category_id: string | null; location_id: string | null;
  condition: "baik" | "rusak_ringan" | "rusak_berat"; quantity: number; acquisition_date: string | null;
  funding_source: string | null; asset_value: number | null; notes: string | null;
}
interface Ref { id: string; name: string; }

const COND_LABEL: Record<string, string> = { baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat" };
const COND_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  baik: "default", rusak_ringan: "secondary", rusak_berat: "destructive",
};

export default function Items() {
  const { isStaff } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Ref[]>([]);
  const [locs, setLocs] = useState<Ref[]>([]);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterCond, setFilterCond] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  async function load() {
    const [i, c, l] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
    ]);
    setItems((i.data as Item[]) ?? []);
    setCats((c.data as Ref[]) ?? []);
    setLocs((l.data as Ref[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const filtered = items.filter(it => {
    if (q && !`${it.code} ${it.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterCat !== "all" && it.category_id !== filterCat) return false;
    if (filterCond !== "all" && it.condition !== filterCond) return false;
    return true;
  });

  const catName = (id: string | null) => cats.find(c => c.id === id)?.name ?? "—";
  const locName = (id: string | null) => locs.find(l => l.id === id)?.name ?? "—";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      code: String(fd.get("code")).trim(),
      name: String(fd.get("name")).trim(),
      category_id: (fd.get("category_id") as string) || null,
      location_id: (fd.get("location_id") as string) || null,
      condition: fd.get("condition") as Item["condition"],
      quantity: parseInt(String(fd.get("quantity") || "1")),
      acquisition_date: (fd.get("acquisition_date") as string) || null,
      funding_source: (fd.get("funding_source") as string) || null,
      asset_value: parseFloat(String(fd.get("asset_value") || "0")) || 0,
      notes: (fd.get("notes") as string) || null,
    };
    const { error } = editing
      ? await supabase.from("items").update(payload).eq("id", editing.id)
      : await supabase.from("items").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "Barang diperbarui" : "Barang ditambahkan");
      setOpen(false); setEditing(null); load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus barang ini?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Dihapus"); load(); }
  }

  return (
    <div>
      <PageHeader
        title="Inventaris Barang"
        description="Daftar semua barang sarana dan prasarana sekolah"
        action={isStaff && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Tambah Barang</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kode Inventaris *</Label>
                    <Input name="code" required defaultValue={editing?.code} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Barang *</Label>
                    <Input name="name" required defaultValue={editing?.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select name="category_id" defaultValue={editing?.category_id ?? undefined}>
                      <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                      <SelectContent>{cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lokasi</Label>
                    <Select name="location_id" defaultValue={editing?.location_id ?? undefined}>
                      <SelectTrigger><SelectValue placeholder="Pilih lokasi" /></SelectTrigger>
                      <SelectContent>{locs.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kondisi *</Label>
                    <Select name="condition" defaultValue={editing?.condition ?? "baik"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baik">Baik</SelectItem>
                        <SelectItem value="rusak_ringan">Rusak Ringan</SelectItem>
                        <SelectItem value="rusak_berat">Rusak Berat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Jumlah *</Label>
                    <Input name="quantity" type="number" min="1" required defaultValue={editing?.quantity ?? 1} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Perolehan</Label>
                    <Input name="acquisition_date" type="date" defaultValue={editing?.acquisition_date ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sumber Dana</Label>
                    <Input name="funding_source" defaultValue={editing?.funding_source ?? ""} placeholder="BOS, APBD, Hibah..." />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Nilai Aset (Rp)</Label>
                    <Input name="asset_value" type="number" step="0.01" defaultValue={editing?.asset_value ?? 0} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Catatan</Label>
                    <Textarea name="notes" defaultValue={editing?.notes ?? ""} rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit">{editing ? "Simpan" : "Tambah"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode atau nama..." className="pl-9" />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCond} onValueChange={setFilterCond}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Kondisi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kondisi</SelectItem>
              <SelectItem value="baik">Baik</SelectItem>
              <SelectItem value="rusak_ringan">Rusak Ringan</SelectItem>
              <SelectItem value="rusak_berat">Rusak Berat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Nilai (Rp)</TableHead>
              {isStaff && <TableHead className="w-24">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isStaff ? 8 : 7} className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto h-10 w-10 opacity-40 mb-2" />
                  Belum ada barang
                </TableCell>
              </TableRow>
            ) : filtered.map(it => (
              <TableRow key={it.id}>
                <TableCell className="font-mono text-xs">{it.code}</TableCell>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell>{catName(it.category_id)}</TableCell>
                <TableCell>{locName(it.location_id)}</TableCell>
                <TableCell><Badge variant={COND_VARIANT[it.condition]}>{COND_LABEL[it.condition]}</Badge></TableCell>
                <TableCell className="text-right">{it.quantity}</TableCell>
                <TableCell className="text-right">{(it.asset_value ?? 0).toLocaleString("id-ID")}</TableCell>
                {isStaff && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(it.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
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
