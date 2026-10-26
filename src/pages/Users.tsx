import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

interface Profile { id: string; full_name: string; email: string | null; }
interface RoleRow { id: string; user_id: string; role: AppRole; }

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin", petugas: "Petugas Sarpras", guru: "Guru", kepala_sekolah: "Kepala Sekolah",
};

export default function Users() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  async function load() {
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("user_roles").select("*"),
    ]);
    setProfiles((p.data as Profile[]) ?? []);
    setRoles((r.data as RoleRow[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  if (!isAdmin) return <div className="text-muted-foreground">Hanya Admin yang dapat mengakses halaman ini.</div>;

  const rolesOf = (uid: string) => roles.filter(r => r.user_id === uid).map(r => r.role);

  async function setPrimaryRole(uid: string, role: AppRole) {
    // Remove existing roles for user, then add the new one
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", uid);
    if (delErr) return toast.error(delErr.message);
    const { error: insErr } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (insErr) return toast.error(insErr.message);
    toast.success("Peran diperbarui");
    load();
  }

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setAdding(true);
    try {
      const { error } = await supabase.functions.invoke("create-user", {
        body: {
          full_name: String(fd.get("full_name") || "").trim(),
          email: String(fd.get("email") || "").trim(),
          password: String(fd.get("password") || ""),
          role: String(fd.get("role") || "guru"),
        },
      });
      if (error) {
        let msg = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx) {
          try {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          } catch { /* ignore parse errors */ }
        }
        toast.error(msg);
      } else {
        toast.success("Pengguna berhasil ditambahkan");
        setAddOpen(false);
        load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah pengguna");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola pengguna dan peran akses sistem"
        action={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Tambah Pengguna</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Pengguna</DialogTitle></DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap *</Label>
                  <Input name="full_name" required placeholder="Nama lengkap pengguna" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input name="email" type="email" required placeholder="nama@sekolah.sch.id" />
                </div>
                <div className="space-y-2">
                  <Label>Kata Sandi *</Label>
                  <Input name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter" />
                </div>
                <div className="space-y-2">
                  <Label>Peran *</Label>
                  <Select name="role" defaultValue="guru">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABEL) as AppRole[]).map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Akun langsung aktif — pengguna dapat langsung masuk menggunakan email dan kata sandi di atas.
                </p>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={adding}>
                    {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Tambah
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Peran Saat Ini</TableHead><TableHead>Ubah Peran</TableHead></TableRow></TableHeader>
          <TableBody>
            {profiles.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Belum ada pengguna</TableCell></TableRow>
            ) : profiles.map(p => {
              const userRoles = rolesOf(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {userRoles.length === 0 ? <span className="text-muted-foreground text-sm">—</span> :
                        userRoles.map(r => <Badge key={r} variant="secondary">{ROLE_LABEL[r]}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select onValueChange={(v) => setPrimaryRole(p.id, v as AppRole)}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Pilih peran" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABEL) as AppRole[]).map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
