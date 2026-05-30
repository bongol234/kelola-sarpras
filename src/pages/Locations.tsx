import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Loc { id: string; name: string; building: string | null; floor: string | null; description: string | null; }

export default function Locations() {
  const { isStaff } = useAuth();
  const [data, setData] = useState<Loc[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loc | null>(null);

  async function load() {
    const { data } = await supabase.from("locations").select("*").order("name");
    setData((data as Loc[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")).trim(),
      building: (fd.get("building") as string) || null,
      floor: (fd.get("floor") as string) || null,
      description: (fd.get("description") as string) || null,
    };
    const { error } = editing
      ? await supabase.from("locations").update(payload).eq("id", editing.id)
      : await supabase.from("locations").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("Tersimpan"); setOpen(false); setEditing(null); load(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus lokasi ini?")) return;
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Dihapus"); load(); }
  }

  return (
    <div>
      <PageHeader title="Ruang & Lokasi" description="Daftar ruang dan tempat penyimpanan sarpras"
        action={isStaff && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Tambah Lokasi</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Lokasi</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Nama Ruang *</Label><Input name="name" required defaultValue={editing?.name} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Gedung</Label><Input name="building" defaultValue={editing?.building ?? ""} /></div>
                  <div className="space-y-2"><Label>Lantai</Label><Input name="floor" defaultValue={editing?.floor ?? ""} /></div>
                </div>
                <div className="space-y-2"><Label>Deskripsi</Label><Textarea name="description" defaultValue={editing?.description ?? ""} /></div>
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
            <TableHead>Nama</TableHead><TableHead>Gedung</TableHead><TableHead>Lantai</TableHead><TableHead>Deskripsi</TableHead>
            {isStaff && <TableHead className="w-24">Aksi</TableHead>}
          </TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Belum ada lokasi</TableCell></TableRow>
            ) : data.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{l.name}</TableCell>
                <TableCell>{l.building || "—"}</TableCell>
                <TableCell>{l.floor || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{l.description || "—"}</TableCell>
                {isStaff && <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(l); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
