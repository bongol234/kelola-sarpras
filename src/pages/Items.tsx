import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
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
import { Plus, Search, Pencil, Trash2, Package, Upload, FileDown, Loader2 } from "lucide-react";

interface Item {
  id: string; code: string; name: string; category_id: string | null; location_id: string | null;
  condition: "baik" | "rusak_ringan" | "rusak_berat"; quantity: number; acquisition_date: string | null;
  funding_source: string | null; asset_value: number | null; notes: string | null;
}
interface Ref { id: string; name: string; }

interface ParsedRow {
  code: string; name: string; category: string; location: string;
  condition: Item["condition"]; quantity: number; acquisition_date: string | null;
  funding_source: string | null; asset_value: number; notes: string | null;
  error?: string;
}

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

function parseCondition(v: unknown): Item["condition"] {
  const s = norm(v);
  if (s.includes("berat")) return "rusak_berat";
  if (s.includes("ringan")) return "rusak_ringan";
  return "baik";
}

function parseDateCell(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

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
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [importBusy, setImportBusy] = useState(false);
  const importValid = importRows.filter(r => !r.error).length;
  const importErrors = importRows.length - importValid;

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

  function downloadTemplate() {
    const header = ["Kode", "Nama Barang", "Kategori", "Lokasi", "Kondisi", "Jumlah", "Tanggal Perolehan", "Sumber Dana", "Nilai Aset", "Catatan"];
    const examples = [
      ["INV-001", "Kursi Siswa", "Perabot", "Ruang Kelas 7A", "Baik", 40, "2024-07-15", "BOS", 250000, ""],
      ["INV-002", "Proyektor", "Elektronik", "Lab Komputer", "Rusak Ringan", 1, "2023-01-10", "APBD", 4500000, "Lampu perlu diganti"],
    ];
    const csv = "\uFEFF" + [header, ...examples].map(r => r.map(c => String(c).includes(",") ? `"${c}"` : c).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template_import_barang.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (raw.length === 0) { toast.error("File kosong atau tidak memiliki data."); return; }
      const pick = (row: Record<string, unknown>, ...names: string[]) => {
        for (const n of names) {
          const key = Object.keys(row).find(k => norm(k) === norm(n));
          if (key !== undefined) return row[key];
        }
        return "";
      };
      const rows: ParsedRow[] = raw.map(r => {
        const quantity = parseInt(String(pick(r, "Jumlah") || "1"), 10) || 0;
        const assetValue = parseFloat(String(pick(r, "Nilai Aset", "Nilai") ?? "0").replace(/[^\d.,\-]/g, "").replace(",", ".")) || 0;
        const code = String(pick(r, "Kode", "Kode Inventaris") ?? "").trim();
        const name = String(pick(r, "Nama Barang", "Nama") ?? "").trim();
        let error: string | undefined;
        if (!code) error = "Kode kosong";
        else if (!name) error = "Nama kosong";
        else if (quantity < 1) error = "Jumlah tidak valid";
        return {
          code, name,
          category: String(pick(r, "Kategori") ?? "").trim(),
          location: String(pick(r, "Lokasi", "Ruang") ?? "").trim(),
          condition: parseCondition(pick(r, "Kondisi")),
          quantity,
          acquisition_date: parseDateCell(pick(r, "Tanggal Perolehan")),
          funding_source: String(pick(r, "Sumber Dana") ?? "").trim() || null,
          asset_value: assetValue,
          notes: String(pick(r, "Catatan") ?? "").trim() || null,
          error,
        };
      });
      const seen = new Set<string>();
      const existing = new Set(items.map(i => i.code.toLowerCase()));
      rows.forEach(r => {
        const k = r.code.toLowerCase();
        if (!r.error && seen.has(k)) r.error = "Kode duplikat di file";
        else if (!r.error && existing.has(k)) r.error = "Kode sudah terdaftar";
        seen.add(k);
      });
      setImportRows(rows);
    } catch {
      toast.error("Gagal membaca file. Gunakan format template yang disediakan.");
    }
  }

  async function runImport() {
    const valid = importRows.filter(r => !r.error);
    if (valid.length === 0) return;
    setImportBusy(true);
    try {
      const ensureRefs = async (table: "categories" | "locations", refs: Ref[], names: string[]) => {
        const map = new Map<string, string>();
        refs.forEach(r => map.set(r.name.trim().toLowerCase(), r.id));
        const missing = [...new Set(names.map(n => n.trim()).filter(Boolean))].filter(n => !map.has(n.toLowerCase()));
        for (const n of missing) {
          const { data, error } = await supabase.from(table).insert({ name: n }).select("id").single();
          if (!error && data) map.set(n.toLowerCase(), (data as { id: string }).id);
        }
        return map;
      };
      const catMap = await ensureRefs("categories", cats, valid.map(r => r.category));
      const locMap = await ensureRefs("locations", locs, valid.map(r => r.location));
      const payload = valid.map(r => ({
        code: r.code,
        name: r.name,
        category_id: r.category ? catMap.get(r.category.toLowerCase()) ?? null : null,
        location_id: r.location ? locMap.get(r.location.toLowerCase()) ?? null : null,
        condition: r.condition,
        quantity: r.quantity,
        acquisition_date: r.acquisition_date,
        funding_source: r.funding_source,
        asset_value: r.asset_value,
        notes: r.notes,
      }));
      const { error } = await supabase.from("items").insert(payload);
      if (error) toast.error("Impor gagal: " + error.message);
      else {
        toast.success(`${payload.length} barang berhasil diimpor`);
        setImportRows([]);
        setImportOpen(false);
        load();
      }
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventaris Barang"
        description="Daftar semua barang sarana dan prasarana sekolah"
        action={isStaff && (
          <div className="flex flex-wrap gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Impor Excel</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Impor Barang dari Excel/CSV</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                    <FileDown className="mr-2 h-4 w-4" /> Unduh Template
                  </Button>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="max-w-xs"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Kolom: Kode, Nama Barang, Kategori, Lokasi, Kondisi, Jumlah, Tanggal Perolehan, Sumber Dana, Nilai Aset, Catatan.
                  Kategori dan lokasi dicocokkan berdasarkan nama — jika belum ada, otomatis dibuat.
                </p>
                {importRows.length > 0 && (
                  <>
                    <div className="max-h-64 overflow-y-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Kategori</TableHead>
                            <TableHead>Lokasi</TableHead><TableHead>Kondisi</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importRows.slice(0, 200).map((r, idx) => (
                            <TableRow key={idx} className={r.error ? "bg-destructive/10" : ""}>
                              <TableCell className="font-mono text-xs">{r.code || "—"}</TableCell>
                              <TableCell>{r.name || "—"}</TableCell>
                              <TableCell>{r.category || "—"}</TableCell>
                              <TableCell>{r.location || "—"}</TableCell>
                              <TableCell>{COND_LABEL[r.condition]}</TableCell>
                              <TableCell className="text-right">{r.quantity}</TableCell>
                              <TableCell>{r.error ? <span className="text-destructive text-xs">{r.error}</span> : <Badge variant="default">OK</Badge>}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">
                        {importValid} baris siap diimpor{importErrors > 0 ? `, ${importErrors} baris bermasalah (tidak diimpor)` : ""}
                      </span>
                      <Button onClick={runImport} disabled={importBusy || importValid === 0}>
                        {importBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Impor {importValid} Barang
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
          </div>
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
