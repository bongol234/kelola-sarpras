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
import { Plus, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface Loan {
  id: string; item_id: string; borrower_id: string; quantity: number; purpose: string | null;
  loan_date: string; expected_return_date: string | null; actual_return_date: string | null;
  return_condition: string | null; status: "diajukan" | "disetujui" | "ditolak" | "dipinjam" | "dikembalikan";
}
interface ItemRef { id: string; name: string; code: string; }
interface ProfileRef { id: string; full_name: string; }

const STATUS_LABEL: Record<string, string> = {
  diajukan: "Diajukan", disetujui: "Disetujui", ditolak: "Ditolak", dipinjam: "Dipinjam", dikembalikan: "Dikembalikan",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  diajukan: "outline", disetujui: "secondary", ditolak: "destructive", dipinjam: "default", dikembalikan: "secondary",
};

export default function Loans() {
  const { user, isStaff } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [items, setItems] = useState<ItemRef[]>([]);
  const [profiles, setProfiles] = useState<ProfileRef[]>([]);
  const [open, setOpen] = useState(false);
  const [returnLoan, setReturnLoan] = useState<Loan | null>(null);

  async function load() {
    const [l, i, p] = await Promise.all([
      supabase.from("loans").select("*").order("created_at", { ascending: false }),
      supabase.from("items").select("id, name, code").order("name"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setLoans((l.data as Loan[]) ?? []);
    setItems((i.data as ItemRef[]) ?? []);
    setProfiles((p.data as ProfileRef[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const itemLabel = (id: string) => {
    const it = items.find(x => x.id === id);
    return it ? `${it.name} (${it.code})` : "—";
  };
  const userLabel = (id: string) => profiles.find(p => p.id === id)?.full_name ?? "—";

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("loans").insert({
      item_id: String(fd.get("item_id")),
      borrower_id: user.id,
      quantity: parseInt(String(fd.get("quantity") || "1")),
      purpose: (fd.get("purpose") as string) || null,
      loan_date: String(fd.get("loan_date")),
      expected_return_date: (fd.get("expected_return_date") as string) || null,
      status: isStaff ? "dipinjam" : "diajukan",
    });
    if (error) toast.error(error.message);
    else { toast.success("Peminjaman dicatat"); setOpen(false); load(); }
  }

  async function setStatus(id: string, status: Loan["status"]) {
    const { error } = await supabase.from("loans").update({ status, approved_by: user?.id }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Diperbarui"); load(); }
  }

  async function handleReturn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!returnLoan) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("loans").update({
      status: "dikembalikan",
      actual_return_date: String(fd.get("actual_return_date")),
      return_condition: fd.get("return_condition") as any,
      return_notes: (fd.get("return_notes") as string) || null,
    }).eq("id", returnLoan.id);
    if (error) toast.error(error.message);
    else { toast.success("Barang dikembalikan"); setReturnLoan(null); load(); }
  }

  return (
    <div>
      <PageHeader title="Peminjaman & Pengembalian" description="Catat dan kelola peminjaman barang sekolah"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Ajukan Peminjaman</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Pengajuan Peminjaman</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Barang *</Label>
                  <Select name="item_id" required>
                    <SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                    <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Jumlah *</Label><Input name="quantity" type="number" min="1" defaultValue={1} required /></div>
                  <div className="space-y-2"><Label>Tanggal Pinjam *</Label><Input name="loan_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
                </div>
                <div className="space-y-2"><Label>Rencana Kembali</Label><Input name="expected_return_date" type="date" /></div>
                <div className="space-y-2"><Label>Tujuan/Keperluan</Label><Textarea name="purpose" rows={2} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit">Ajukan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Barang</TableHead>
              <TableHead>Peminjam</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Tgl Pinjam</TableHead>
              <TableHead>Rencana Kembali</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Belum ada peminjaman</TableCell></TableRow>
            ) : loans.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{itemLabel(l.item_id)}</TableCell>
                <TableCell>{userLabel(l.borrower_id)}</TableCell>
                <TableCell className="text-right">{l.quantity}</TableCell>
                <TableCell>{l.loan_date}</TableCell>
                <TableCell>{l.expected_return_date || "—"}</TableCell>
                <TableCell><Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {isStaff && l.status === "diajukan" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "dipinjam")}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(l.id, "ditolak")}><XCircle className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                    {isStaff && l.status === "dipinjam" && (
                      <Button size="sm" variant="outline" onClick={() => setReturnLoan(l)}><RotateCcw className="mr-2 h-3 w-3" /> Kembalikan</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!returnLoan} onOpenChange={(o) => !o && setReturnLoan(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catat Pengembalian</DialogTitle></DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2"><Label>Tanggal Pengembalian *</Label>
              <Input name="actual_return_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="space-y-2"><Label>Kondisi Saat Kembali *</Label>
              <Select name="return_condition" defaultValue="baik" required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baik">Baik</SelectItem>
                  <SelectItem value="rusak_ringan">Rusak Ringan</SelectItem>
                  <SelectItem value="rusak_berat">Rusak Berat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Textarea name="return_notes" rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnLoan(null)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
