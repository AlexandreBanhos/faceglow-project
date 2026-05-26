import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/AdminNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { checkAdminAccess } from "@/lib/admin-products";
import {
  fetchAdminUsers,
  addUserCredits,
  activateUserPremium,
  revokeUserPremium,
  type AdminUserRow,
} from "@/lib/admin-users";

const PAGE_SIZE = 20;

const planLabel: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
  credits: "Avulso",
  test: "Teste",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function statusBadge(row: AdminUserRow) {
  const { planKey, subscriptionStatus, expiresAtUtc } = row;
  if (!planKey || !subscriptionStatus) return <span className="text-muted-foreground text-xs">Free</span>;

  const expired = expiresAtUtc ? new Date(expiresAtUtc) < new Date() : false;
  const isActive = subscriptionStatus === "active" && !expired;

  const color = isActive
    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {planLabel[planKey] ?? planKey}
      {isActive && expiresAtUtc ? ` · até ${fmtDate(expiresAtUtc)}` : ""}
      {!isActive && subscriptionStatus !== "active" ? ` · ${subscriptionStatus}` : ""}
      {!isActive && expired ? " · expirado" : ""}
    </span>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Credits modal
  const [creditsTarget, setCreditsTarget] = useState<AdminUserRow | null>(null);
  const [creditsAmount, setCreditsAmount] = useState("5");
  const [creditsSaving, setCreditsSaving] = useState(false);

  // Premium modal
  const [premiumTarget, setPremiumTarget] = useState<AdminUserRow | null>(null);
  const [premiumPlanKey, setPremiumPlanKey] = useState("monthly");
  const [premiumDays, setPremiumDays] = useState("30");
  const [premiumSaving, setPremiumSaving] = useState(false);

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<AdminUserRow | null>(null);
  const [revokeSaving, setRevokeSaving] = useState(false);

  useEffect(() => {
    checkAdminAccess().then((ok) => { if (!ok) navigate("/dashboard"); });
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers(page, PAGE_SIZE, search || undefined);
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  async function handleAddCredits() {
    if (!creditsTarget) return;
    const amount = parseInt(creditsAmount, 10);
    if (!amount || amount < 1 || amount > 500) {
      toast({ title: "Quantidade inválida (1–500)", variant: "destructive" });
      return;
    }
    setCreditsSaving(true);
    try {
      await addUserCredits(creditsTarget.id, amount);
      toast({ title: `${amount} crédito(s) adicionado(s)` });
      setCreditsTarget(null);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Erro", variant: "destructive" });
    } finally {
      setCreditsSaving(false);
    }
  }

  async function handleActivatePremium() {
    if (!premiumTarget) return;
    const days = parseInt(premiumDays, 10);
    if (!premiumPlanKey.trim() || !days || days < 1 || days > 3650) {
      toast({ title: "Dados inválidos", variant: "destructive" });
      return;
    }
    setPremiumSaving(true);
    try {
      await activateUserPremium(premiumTarget.id, premiumPlanKey.trim(), days);
      toast({ title: `Premium ativado: ${premiumPlanKey} por ${days} dias` });
      setPremiumTarget(null);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Erro", variant: "destructive" });
    } finally {
      setPremiumSaving(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevokeSaving(true);
    try {
      await revokeUserPremium(revokeTarget.id);
      toast({ title: "Premium revogado" });
      setRevokeTarget(null);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Erro", variant: "destructive" });
    } finally {
      setRevokeSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <AdminNav />

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input
            placeholder="Buscar por email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={handleSearch}>Buscar</Button>
          {search && (
            <Button variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
              Limpar
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {loading ? "Carregando..." : `${total} usuário(s)`}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Créditos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">
                    {u.email}
                    {u.isAdmin && (
                      <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        admin
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{statusBadge(u)}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.creditsRemaining}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setCreditsTarget(u); setCreditsAmount("5"); }}
                      >
                        + Créditos
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setPremiumTarget(u); setPremiumPlanKey("monthly"); setPremiumDays("30"); }}
                      >
                        Premium
                      </Button>
                      {u.subscriptionStatus === "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokeTarget(u)}
                        >
                          Revogar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </div>

      {/* Modal: adicionar créditos */}
      <Dialog open={!!creditsTarget} onOpenChange={(o) => !o && setCreditsTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar créditos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{creditsTarget?.email}</p>
          <div className="flex gap-2 items-center mt-2">
            <Input
              type="number"
              min={1}
              max={500}
              value={creditsAmount}
              onChange={(e) => setCreditsAmount(e.target.value)}
              className="w-28"
            />
            <span className="text-sm text-muted-foreground">crédito(s)</span>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setCreditsTarget(null)}>Cancelar</Button>
            <Button onClick={handleAddCredits} disabled={creditsSaving}>
              {creditsSaving ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: ativar premium */}
      <Dialog open={!!premiumTarget} onOpenChange={(o) => !o && setPremiumTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar premium</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{premiumTarget?.email}</p>
          <div className="grid gap-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">planKey</label>
              <Input
                placeholder="monthly, annual, credits..."
                value={premiumPlanKey}
                onChange={(e) => setPremiumPlanKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dias de acesso</label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={premiumDays}
                onChange={(e) => setPremiumDays(e.target.value)}
                className="w-28"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setPremiumTarget(null)}>Cancelar</Button>
            <Button onClick={handleActivatePremium} disabled={premiumSaving}>
              {premiumSaving ? "Salvando..." : "Ativar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm: revogar premium */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar premium?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as assinaturas ativas de <strong>{revokeTarget?.email}</strong> serão revogadas.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeSaving ? "Revogando..." : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
