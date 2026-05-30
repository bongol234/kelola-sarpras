import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Loader2 } from "lucide-react";

export default function Auth() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) nav("/", { replace: true });
    });
  }, [nav]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Berhasil masuk");
      nav("/", { replace: true });
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const full_name = String(fd.get("full_name"));
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Akun dibuat. Silakan masuk.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 text-primary-foreground">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-accent shadow-glow mb-4">
            <GraduationCap className="h-9 w-9 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold">SIM Sarpras Sekolah</h1>
          <p className="text-sm opacity-90 mt-2">Sistem Informasi Manajemen Sarana & Prasarana</p>
        </div>

        <Card className="p-6 shadow-elegant">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pass">Kata Sandi</Label>
                  <Input id="si-pass" name="password" type="password" required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Masuk
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Nama Lengkap</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">Kata Sandi</Label>
                  <Input id="su-pass" name="password" type="password" required minLength={6} />
                  <p className="text-xs text-muted-foreground">Minimal 6 karakter</p>
                </div>
                <Button type="submit" variant="default" className="w-full bg-gradient-accent text-accent-foreground hover:opacity-90" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Daftar Akun
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Pengguna pertama otomatis menjadi Admin
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
