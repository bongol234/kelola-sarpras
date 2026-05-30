import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, MapPin, ArrowLeftRight, AlertTriangle, Wrench, FolderTree, TrendingUp, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  items: number; totalQty: number; categories: number; locations: number;
  activeLoans: number; pendingLoans: number; damaged: number; maintenance: number;
}

const COND_COLORS: Record<string, string> = {
  baik: "hsl(var(--success))",
  rusak_ringan: "hsl(var(--warning))",
  rusak_berat: "hsl(var(--destructive))",
};
const COND_LABEL: Record<string, string> = {
  baik: "Baik", rusak_ringan: "Rusak Ringan", rusak_berat: "Rusak Berat",
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [condData, setCondData] = useState<{ name: string; value: number; raw: string }[]>([]);
  const [catData, setCatData] = useState<{ name: string; jumlah: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [items, cats, locs, loans, maint] = await Promise.all([
        supabase.from("items").select("id, quantity, condition, category_id"),
        supabase.from("categories").select("id, name"),
        supabase.from("locations").select("id"),
        supabase.from("loans").select("id, status"),
        supabase.from("maintenance_records").select("id, status"),
      ]);

      const itemsData = items.data ?? [];
      const totalQty = itemsData.reduce((a, b: any) => a + (b.quantity ?? 0), 0);
      const damaged = itemsData.filter((i: any) => i.condition !== "baik").length;
      const loansData = loans.data ?? [];
      const maintData = maint.data ?? [];

      setStats({
        items: itemsData.length,
        totalQty,
        categories: (cats.data ?? []).length,
        locations: (locs.data ?? []).length,
        activeLoans: loansData.filter((l: any) => l.status === "dipinjam").length,
        pendingLoans: loansData.filter((l: any) => l.status === "diajukan").length,
        damaged,
        maintenance: maintData.filter((m: any) => m.status !== "selesai").length,
      });

      // Condition breakdown
      const condMap: Record<string, number> = {};
      itemsData.forEach((i: any) => { condMap[i.condition] = (condMap[i.condition] ?? 0) + 1; });
      setCondData(Object.entries(condMap).map(([k, v]) => ({ name: COND_LABEL[k] ?? k, value: v, raw: k })));

      // Category breakdown
      const catMap = new Map((cats.data ?? []).map((c: any) => [c.id, c.name]));
      const cMap: Record<string, number> = {};
      itemsData.forEach((i: any) => {
        const n = catMap.get(i.category_id) ?? "Tanpa Kategori";
        cMap[n as string] = (cMap[n as string] ?? 0) + 1;
      });
      setCatData(Object.entries(cMap).map(([name, jumlah]) => ({ name, jumlah })));
    })();
  }, []);

  const cards = [
    { label: "Total Barang", value: stats?.items ?? 0, icon: Package, color: "bg-gradient-primary", text: "text-primary-foreground" },
    { label: "Jumlah Unit", value: stats?.totalQty ?? 0, icon: TrendingUp, color: "bg-gradient-accent", text: "text-accent-foreground" },
    { label: "Kategori", value: stats?.categories ?? 0, icon: FolderTree },
    { label: "Ruang/Lokasi", value: stats?.locations ?? 0, icon: MapPin },
    { label: "Sedang Dipinjam", value: stats?.activeLoans ?? 0, icon: ArrowLeftRight },
    { label: "Pengajuan Pinjam", value: stats?.pendingLoans ?? 0, icon: CheckCircle2 },
    { label: "Barang Rusak", value: stats?.damaged ?? 0, icon: AlertTriangle, accent: "destructive" as const },
    { label: "Perawatan Aktif", value: stats?.maintenance ?? 0, icon: Wrench },
  ];

  return (
    <div>
      <PageHeader
        title={`Selamat datang, ${profile?.full_name?.split(" ")[0] || "Pengguna"}`}
        description="Ringkasan kondisi sarana dan prasarana sekolah hari ini."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c, i) => (
          <Card key={i} className={`p-5 ${c.color ?? "bg-gradient-card"} ${c.text ?? ""} shadow-md hover:shadow-elegant transition-shadow`}>
            <div className="flex items-start justify-between mb-3">
              <c.icon className={`h-5 w-5 ${c.text ? "opacity-90" : c.accent === "destructive" ? "text-destructive" : "text-primary"}`} />
            </div>
            <div className={`text-3xl font-bold ${c.text ?? "text-foreground"}`}>{c.value}</div>
            <div className={`text-xs mt-1 ${c.text ? "opacity-80" : "text-muted-foreground"}`}>{c.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Kondisi Barang</h3>
          {condData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={condData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {condData.map((d, i) => <Cell key={i} fill={COND_COLORS[d.raw] ?? "hsl(var(--muted))"} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Jumlah Barang per Kategori</h3>
          {catData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={catData}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="jumlah" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
