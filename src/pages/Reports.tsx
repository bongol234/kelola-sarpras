import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface Item { id: string; code: string; name: string; condition: string; quantity: number; asset_value: number | null; category_id: string | null; location_id: string | null; }
interface Loan { id: string; item_id: string; borrower_id: string; status: string; loan_date: string; actual_return_date: string | null; quantity: number; }
interface Ref { id: string; name: string; }
interface Profile { id: string; full_name: string; }

const COND_LABEL: Record<string, string> = { baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat" };

function toCSV(rows: (string | number)[][]) {
  return rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}

function downloadCSV(name: string, rows: (string | number)[][]) {
  const blob = new Blob(["\uFEFF" + toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [items, setItems] = useState<Item[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [cats, setCats] = useState<Ref[]>([]);
  const [locs, setLocs] = useState<Ref[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    (async () => {
      const [i, l, c, lo, p] = await Promise.all([
        supabase.from("items").select("*"),
        supabase.from("loans").select("*").order("loan_date", { ascending: false }),
        supabase.from("categories").select("id, name"),
        supabase.from("locations").select("id, name"),
        supabase.from("profiles").select("id, full_name"),
      ]);
      setItems((i.data as Item[]) ?? []);
      setLoans((l.data as Loan[]) ?? []);
      setCats((c.data as Ref[]) ?? []);
      setLocs((lo.data as Ref[]) ?? []);
      setProfiles((p.data as Profile[]) ?? []);
    })();
  }, []);

  const catName = (id: string | null) => cats.find(c => c.id === id)?.name ?? "—";
  const locName = (id: string | null) => locs.find(l => l.id === id)?.name ?? "—";
  const userName = (id: string) => profiles.find(p => p.id === id)?.full_name ?? "—";
  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? "—";

  const damaged = items.filter(i => i.condition !== "baik");
  const totalValue = items.reduce((s, i) => s + (i.asset_value ?? 0) * (i.quantity ?? 0), 0);

  function exportInventory() {
    const rows: (string | number)[][] = [["Kode", "Nama", "Kategori", "Lokasi", "Kondisi", "Jumlah", "Nilai (Rp)"]];
    items.forEach(i => rows.push([i.code, i.name, catName(i.category_id), locName(i.location_id), COND_LABEL[i.condition], i.quantity, i.asset_value ?? 0]));
    downloadCSV(`inventaris_${Date.now()}.csv`, rows);
    toast.success("Diekspor");
  }
  function exportDamaged() {
    const rows: (string | number)[][] = [["Kode", "Nama", "Lokasi", "Kondisi", "Jumlah"]];
    damaged.forEach(i => rows.push([i.code, i.name, locName(i.location_id), COND_LABEL[i.condition], i.quantity]));
    downloadCSV(`barang_rusak_${Date.now()}.csv`, rows);
    toast.success("Diekspor");
  }
  function exportLoans() {
    const rows: (string | number)[][] = [["Barang", "Peminjam", "Jumlah", "Tgl Pinjam", "Tgl Kembali", "Status"]];
    loans.forEach(l => rows.push([itemName(l.item_id), userName(l.borrower_id), l.quantity, l.loan_date, l.actual_return_date ?? "—", l.status]));
    downloadCSV(`peminjaman_${Date.now()}.csv`, rows);
    toast.success("Diekspor");
  }
  function printReport() {
    window.print();
  }

  return (
    <div>
      <PageHeader title="Laporan" description="Ringkasan laporan inventaris, kondisi barang, dan peminjaman"
        action={<Button variant="outline" onClick={printReport}><Download className="mr-2 h-4 w-4" /> Cetak PDF</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-gradient-card">
          <div className="text-xs text-muted-foreground mb-1">Total Aset</div>
          <div className="text-2xl font-bold">{items.length}</div>
          <div className="text-xs text-muted-foreground mt-1">jenis barang</div>
        </Card>
        <Card className="p-5 bg-gradient-card">
          <div className="text-xs text-muted-foreground mb-1">Nilai Total Aset</div>
          <div className="text-2xl font-bold">Rp {totalValue.toLocaleString("id-ID")}</div>
        </Card>
        <Card className="p-5 bg-gradient-card">
          <div className="text-xs text-muted-foreground mb-1">Barang Bermasalah</div>
          <div className="text-2xl font-bold text-destructive">{damaged.length}</div>
          <div className="text-xs text-muted-foreground mt-1">perlu perhatian</div>
        </Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventaris</TabsTrigger>
          <TabsTrigger value="damaged">Barang Rusak</TabsTrigger>
          <TabsTrigger value="loans">Peminjaman</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <div className="flex justify-end p-3 border-b">
              <Button size="sm" variant="outline" onClick={exportInventory}><FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Excel/CSV</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Kategori</TableHead><TableHead>Lokasi</TableHead><TableHead>Kondisi</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="text-right">Nilai</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.code}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{catName(i.category_id)}</TableCell>
                    <TableCell>{locName(i.location_id)}</TableCell>
                    <TableCell><Badge variant={i.condition === "baik" ? "default" : i.condition === "rusak_ringan" ? "secondary" : "destructive"}>{COND_LABEL[i.condition]}</Badge></TableCell>
                    <TableCell className="text-right">{i.quantity}</TableCell>
                    <TableCell className="text-right">{(i.asset_value ?? 0).toLocaleString("id-ID")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="damaged">
          <Card>
            <div className="flex justify-end p-3 border-b">
              <Button size="sm" variant="outline" onClick={exportDamaged}><FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Lokasi</TableHead><TableHead>Kondisi</TableHead><TableHead className="text-right">Jumlah</TableHead></TableRow></TableHeader>
              <TableBody>
                {damaged.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada barang rusak 🎉</TableCell></TableRow>
                ) : damaged.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.code}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{locName(i.location_id)}</TableCell>
                    <TableCell><Badge variant={i.condition === "rusak_ringan" ? "secondary" : "destructive"}>{COND_LABEL[i.condition]}</Badge></TableCell>
                    <TableCell className="text-right">{i.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card>
            <div className="flex justify-end p-3 border-b">
              <Button size="sm" variant="outline" onClick={exportLoans}><FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Barang</TableHead><TableHead>Peminjam</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Tgl Pinjam</TableHead><TableHead>Tgl Kembali</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {loans.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{itemName(l.item_id)}</TableCell>
                    <TableCell>{userName(l.borrower_id)}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell>{l.loan_date}</TableCell>
                    <TableCell>{l.actual_return_date ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
