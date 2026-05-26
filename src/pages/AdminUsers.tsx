import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNav } from "@/components/AdminNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { checkAdminAccess, enrichProductPreview } from "@/lib/admin-products";
import {
  fetchAdminUsers,
  addUserCredits,
  activateUserPremium,
  revokeUserPremium,
  fetchAdminUserRoutine,
  toggleRoutineStep,
  regenerateUserRoutine,
  fetchAdminUserProducts,
  type AdminUserRow,
  type AdminRoutineStep,
  type AdminRoutineResponse,
  type AdminUserProduct,
} from "@/lib/admin-users";

const PAGE_SIZE = 20;

const planLabel: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
  credits: "Avulso",
  test: "Teste",
};

const stepTypeLabel: Record<string, string> = {
  cleanser: "Limpeza",
  toner: "Tônico",
  serum: "Sérum",
  moisturizer: "Hidratante",
  sunscreen: "Protetor Solar",
  eye_cream: "Creme para Olhos",
  retinoid: "Retinol",
  acid: "Ácido",
  spot_treatment: "Tratamento Pontual",
  oil: "Óleo Facial",
  mask: "Máscara",
  exfoliant: "Esfoliante",
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
      {!isActive && expired ? " · expirado" : ""}
      {!isActive && subscriptionStatus !== "active" ? ` · ${subscriptionStatus}` : ""}
    </span>
  );
}

// ── Routine step row ─────────────────────────────────────────────────────────
function RoutineStepRow({
  step,
  userId,
  onToggle,
}: {
  step: AdminRoutineStep;
  userId: string;
  onToggle: (stepId: string, newActive: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await toggleRoutineStep(userId, step.stepId);
      onToggle(step.stepId, res.isActive);
    } catch {
      toast({ title: "Erro ao alterar step", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg border ${step.isActive ? "" : "opacity-50"}`}>
      {step.productImage ? (
        <img src={step.productImage} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-muted flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{step.productName ?? "—"}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {stepTypeLabel[step.stepTypeKey] ?? step.stepTypeKey}
          {step.productBrand ? ` · ${step.productBrand}` : ""}
        </p>
      </div>
      <Button
        size="sm"
        variant={step.isActive ? "outline" : "ghost"}
        className="text-xs h-7 flex-shrink-0"
        disabled={loading}
        onClick={handleToggle}
      >
        {step.isActive ? "Desativar" : "Ativar"}
      </Button>
    </div>
  );
}

// ── Product row with enrich ──────────────────────────────────────────────────
function UserProductRow({ product }: { product: AdminUserProduct }) {
  const [enrichResult, setEnrichResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleEnrich() {
    if (!product.name) return;
    setLoading(true);
    try {
      const result = await enrichProductPreview(product.name, product.brand ?? "");
      setEnrichResult(result as Record<string, unknown>);
    } catch {
      toast({ title: "Erro ao enriquecer produto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{product.name ?? "Sem nome"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {product.brand ?? "—"}
            {product.stepTypeKey ? ` · ${stepTypeLabel[product.stepTypeKey] ?? product.stepTypeKey}` : ""}
            {product.isCatalog ? " · catálogo" : " · personalizado"}
          </p>
        </div>
        {!product.isCatalog && (
          <Button size="sm" variant="outline" className="text-xs h-7 flex-shrink-0" disabled={loading} onClick={handleEnrich}>
            {loading ? "..." : "Enriquecer"}
          </Button>
        )}
      </div>
      {enrichResult && (
        <div className="bg-muted rounded p-2 text-xs space-y-1 font-mono">
          {Object.entries(enrichResult).map(([k, v]) =>
            v !== null && v !== undefined && v !== "" ? (
              <div key={k} className="flex gap-1">
                <span className="text-muted-foreground w-28 flex-shrink-0">{k}:</span>
                <span className="break-all">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
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

  // Detail sheet
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null);
  const [routine, setRoutine] = useState<AdminRoutineResponse | null>(null);
  const [userProducts, setUserProducts] = useState<AdminUserProduct[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    checkAdminAccess().then((result) => { if (!result.isAdmin) navigate("/dashboard"); });
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

  useEffect(() => {
    if (!detailUser) { setRoutine(null); setUserProducts([]); return; }
    setDetailLoading(true);
    Promise.all([
      fetchAdminUserRoutine(detailUser.id).catch(() => null),
      fetchAdminUserProducts(detailUser.id).catch(() => []),
    ]).then(([r, p]) => {
      setRoutine(r);
      setUserProducts(p as AdminUserProduct[]);
    }).finally(() => setDetailLoading(false));
  }, [detailUser]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleStepToggle(stepId: string, newActive: boolean) {
    setRoutine((prev) => {
      if (!prev) return prev;
      const updatePeriod = (period?: { routineId: string; steps: AdminRoutineStep[] }) =>
        period ? { ...period, steps: period.steps.map((s) => s.stepId === stepId ? { ...s, isActive: newActive } : s) } : period;
      return { ...prev, routine: { morning: updatePeriod(prev.routine.morning), night: updatePeriod(prev.routine.night) } };
    });
  }

  async function handleRegenerate() {
    if (!detailUser) return;
    setRegenerating(true);
    try {
      await regenerateUserRoutine(detailUser.id);
      toast({ title: "Rotina sendo regenerada. Aguarde ~30s e recarregue." });
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Erro", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  }

  async function handleAddCredits() {
    if (!creditsTarget) return;
    const amount = parseInt(creditsAmount, 10);
    if (!amount || amount < 1 || amount > 500) { toast({ title: "Quantidade inválida (1–500)", variant: "destructive" }); return; }
    setCreditsSaving(true);
    try {
      await addUserCredits(creditsTarget.id, amount);
      toast({ title: `${amount} crédito(s) adicionado(s)` });
      setCreditsTarget(null);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Erro", variant: "destructive" });
    } finally { setCreditsSaving(false); }
  }

  async function handleActivatePremium() {
    if (!premiumTarget) return;
    const days = parseInt(premiumDays, 10);
    if (!premiumPlanKey.trim() || !days || days < 1 || days > 3650) { toast({ title: "Dados inválidos", variant: "destructive" }); return; }
    setPremiumSaving(true);
    try {
      await activateUserPremium(premiumTarget.id, premiumPlanKey.trim(), days);
      toast({ title: `Premium ativado: ${premiumPlanKey} por ${days} dias` });
      setPremiumTarget(null);
      load();
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Erro", variant: "destructive" });
    } finally { setPremiumSaving(false); }
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
    } finally { setRevokeSaving(false); }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <AdminNav />

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={handleSearch}>Buscar</Button>
          {search && (
            <Button variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>Limpar</Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {loading ? "Carregando..." : `${total} usuário(s)`}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
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
                <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailUser(u)}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {u.displayName || u.email.split("@")[0]}
                        {u.isAdmin && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            admin
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(u)}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.creditsRemaining}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => { setCreditsTarget(u); setCreditsAmount("5"); }}>
                        + Créditos
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPremiumTarget(u); setPremiumPlanKey("monthly"); setPremiumDays("30"); }}>
                        Premium
                      </Button>
                      {u.subscriptionStatus === "active" && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRevokeTarget(u)}>
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        )}
      </div>

      {/* ── Detail Sheet ───────────────────────────────────────────────────── */}
      <Sheet open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {detailUser && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="truncate">
                  {detailUser.displayName || detailUser.email.split("@")[0]}
                </SheetTitle>
                <p className="text-xs text-muted-foreground font-mono truncate">{detailUser.email}</p>
                <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                  <span>{statusBadge(detailUser)}</span>
                  <span>· {detailUser.creditsRemaining} crédito(s)</span>
                </div>
              </SheetHeader>

              <Tabs defaultValue="routine">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="routine" className="flex-1">Rotina</TabsTrigger>
                  <TabsTrigger value="products" className="flex-1">Produtos</TabsTrigger>
                </TabsList>

                {/* ── Rotina tab ────────────────────────────────────────────── */}
                <TabsContent value="routine" className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" disabled={regenerating} onClick={handleRegenerate}>
                      {regenerating ? "Regenerando..." : "Regenerar rotina"}
                    </Button>
                  </div>

                  {detailLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}

                  {!detailLoading && !routine?.routine.morning && !routine?.routine.night && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma rotina ativa</p>
                  )}

                  {routine?.routine.morning && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Manhã</h3>
                      <div className="space-y-2">
                        {routine.routine.morning.steps.map((s) => (
                          <RoutineStepRow key={s.stepId} step={s} userId={detailUser.id} onToggle={handleStepToggle} />
                        ))}
                      </div>
                    </div>
                  )}

                  {routine?.routine.night && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Noite</h3>
                      <div className="space-y-2">
                        {routine.routine.night.steps.map((s) => (
                          <RoutineStepRow key={s.stepId} step={s} userId={detailUser.id} onToggle={handleStepToggle} />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ── Produtos tab ──────────────────────────────────────────── */}
                <TabsContent value="products" className="space-y-3">
                  {detailLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
                  {!detailLoading && userProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto adicionado</p>
                  )}
                  {userProducts.map((p) => <UserProductRow key={p.id} product={p} />)}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Credits modal ─────────────────────────────────────────────────── */}
      <Dialog open={!!creditsTarget} onOpenChange={(o) => !o && setCreditsTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar créditos</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{creditsTarget?.email}</p>
          <div className="flex gap-2 items-center mt-2">
            <Input type="number" min={1} max={500} value={creditsAmount} onChange={(e) => setCreditsAmount(e.target.value)} className="w-28" />
            <span className="text-sm text-muted-foreground">crédito(s)</span>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setCreditsTarget(null)}>Cancelar</Button>
            <Button onClick={handleAddCredits} disabled={creditsSaving}>{creditsSaving ? "Salvando..." : "Confirmar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Premium modal ─────────────────────────────────────────────────── */}
      <Dialog open={!!premiumTarget} onOpenChange={(o) => !o && setPremiumTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ativar premium</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground truncate">{premiumTarget?.email}</p>
          <div className="grid gap-3 mt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">planKey</label>
              <Input placeholder="monthly, annual, credits..." value={premiumPlanKey} onChange={(e) => setPremiumPlanKey(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dias de acesso</label>
              <Input type="number" min={1} max={3650} value={premiumDays} onChange={(e) => setPremiumDays(e.target.value)} className="w-28" />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setPremiumTarget(null)}>Cancelar</Button>
            <Button onClick={handleActivatePremium} disabled={premiumSaving}>{premiumSaving ? "Salvando..." : "Ativar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Revoke confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar premium?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as assinaturas ativas de <strong>{revokeTarget?.email}</strong> serão revogadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={revokeSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {revokeSaving ? "Revogando..." : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
