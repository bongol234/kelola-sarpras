import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Profile { id: string; full_name: string; email: string | null; }
interface RoleRow { id: string; user_id: string; role: AppRole; }

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin", petugas: "Petugas Sarpras", guru: "Guru", kepala_sekolah: "Kepala Sekolah",
};

export default function Users() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);

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

  return (
    <div>
      <PageHeader title="Manajemen Pengguna" description="Kelola pengguna dan peran akses sistem" />
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
