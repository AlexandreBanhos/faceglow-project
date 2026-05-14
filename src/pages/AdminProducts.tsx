import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinnerFullScreen } from "@/components/LoadingSpinner";
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  checkAdminAccess,
  AdminProduct,
  CreateAdminProductPayload,
} from "@/lib/admin-products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus, Search, Upload } from "lucide-react";
import { uploadProductImage } from "@/lib/storage";

export function AdminProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [formData, setFormData] = useState<CreateAdminProductPayload>({
    name: "",
    description: "",
    brand: "",
    category: "",
    skinTypes: [],
    concerns: [],
    actives: [],
    strengthLevel: "leve",
    period: [],
    priceRange: "medium",
    priceAvg: undefined,
    priority: 100,
    isActive: true,
    imageUrl: "",
  });

  // Check admin access on component mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Add timeout to prevent indefinite hanging (increased to 30s for remote DB)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const result = await checkAdminAccess(controller.signal);
        clearTimeout(timeoutId);
        
        if (!result.isAdmin) {
          console.warn("User is not admin - redirecting to dashboard");
          navigate("/dashboard");
          return;
        }
        
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Admin check failed:", errorMsg);
        
        // On any error, redirect to dashboard
        navigate("/dashboard");
      }
    };
    checkAdmin();
  }, [navigate]);

  // Filter and paginate products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) =>
        filterStatus === "active" ? p.isActive : !p.isActive
      );
    }

    return filtered;
  }, [products, searchQuery, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminProducts();
      setProducts(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar produtos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      loadProducts();
    }
  }, [isAdmin, loadProducts]);

  async function handleSubmit() {
    try {
      
      if (!formData.name.trim()) {
        toast({
          title: "ValidaÃ§Ã£o",
          description: "Nome Ã© obrigatÃ³rio",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);
      
      if (editingId) {
        await updateAdminProduct(editingId, formData);
        toast({ title: "Sucesso", description: "Produto atualizado" });
      } else {
        await createAdminProduct(formData);
        toast({ title: "Sucesso", description: "Produto criado" });
      }

      setIsFormOpen(false);
      resetForm();
      
      await loadProducts();
    } catch (error) {
      console.error("[handleSubmit] Error caught:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "OperaÃ§Ã£o falhou",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setIsSaving(true);
      
      await deleteAdminProduct(id);
      
      toast({ title: "Sucesso", description: "Produto deletado" });
      await loadProducts();
    } catch (error) {
      console.error("[handleDelete] Error caught:", error);
      toast({
        title: "Erro",
        description: "Falha ao deletar produto",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(product: AdminProduct) {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      skinTypes: product.skinTypes,
      concerns: product.concerns,
      actives: product.actives,
      strengthLevel: product.strengthLevel,
      period: product.period,
      priceRange: product.priceRange,
      priceAvg: product.priceAvg,
      priority: product.priority,
      isActive: product.isActive,
      imageUrl: product.imageUrl || "",
    });
    setImagePreview(product.imageUrl || "");
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      brand: "",
      category: "",
      skinTypes: [],
      concerns: [],
      actives: [],
      strengthLevel: "leve",
      period: [],
      priceRange: "medium",
      priceAvg: undefined,
      priority: 100,
      isActive: true,
      imageUrl: "",
    });
    setImagePreview("");
  }

  function handleImageUrlChange(url: string) {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    setImagePreview(url);
  }

  async function handleImageFileUpload(file: File) {
    try {
      setIsUploadingImage(true);
      const url = await uploadProductImage(file);
      handleImageUrlChange(url);
      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar imagem",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  }

  if (loading) {
    return <LoadingSpinnerFullScreen message="Carregando produtos..." />;
  }

  if (error || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-50 to-slate-100 gap-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-2">Acesso Negado</h1>
          <p className="text-slate-600 mb-6 max-w-md">{error || "VocÃª nÃ£o tem permissÃ£o para acessar esta pÃ¡gina."}</p>
          <Button onClick={() => navigate("/dashboard")} variant="default">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isSaving) {
    return <LoadingSpinnerFullScreen message="Salvando alteraÃ§Ãµes..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      <div className="container mx-auto px-4 md:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900">CatÃ¡logo de Produtos</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">Gerencie todos os produtos da plataforma</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="gap-2 w-full md:w-auto"
              >
                <Plus size={20} />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl">
                  {editingId ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* FormulÃ¡rio */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">Nome *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Nome do produto"
                      className="bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">
                      DescriÃ§Ã£o
                    </label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="DescriÃ§Ã£o"
                      className="bg-white text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">Brand</label>
                      <Input
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, brand: e.target.value }))
                        }
                        placeholder="Brand"
                        className="bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">
                        Categoria
                      </label>
                      <Input
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="Categoria"
                        className="bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">
                        PreÃ§o MÃ©dio
                      </label>
                      <Input
                        type="number"
                        value={formData.priceAvg || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            priceAvg: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          }))
                        }
                        placeholder="0.00"
                        step="0.01"
                        className="bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">
                        Prioridade
                      </label>
                      <Input
                        type="number"
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            priority: parseInt(e.target.value) || 100,
                          }))
                        }
                        className="bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">
                      Imagem do Produto
                    </label>
                    <div className="space-y-3">
                      {/* File Upload */}
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.currentTarget.files?.[0];
                            if (file) {
                              handleImageFileUpload(file);
                            }
                          }}
                          disabled={isUploadingImage}
                          className="hidden"
                          id="image-file-input"
                        />
                        <label
                          htmlFor="image-file-input"
                          className="flex items-center justify-center gap-2 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload size={18} className="text-slate-600" />
                          <span className="text-xs md:text-sm text-slate-600">
                            {isUploadingImage ? "Enviando..." : "Clique para enviar arquivo"}
                          </span>
                        </label>
                      </div>

                      {/* URL Input */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Ou cole uma URL</label>
                        <Input
                          value={formData.imageUrl}
                          onChange={(e) => handleImageUrlChange(e.target.value)}
                          placeholder="https://..."
                          className="bg-white text-xs md:text-sm"
                          disabled={isUploadingImage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg">
                    <Checkbox
                      id="active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          isActive: checked === true,
                        }))
                      }
                    />
                    <label htmlFor="active" className="text-sm font-medium">
                      Ativo
                    </label>
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    {editingId ? "Atualizar" : "Criar"} Produto
                  </Button>
                </div>

                {/* Preview Card */}
                <div className="lg:col-span-1">
                  <div className="sticky top-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="space-y-0">
                      {/* Header */}
                      <div className="p-4 pb-3 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-900">PrÃ©via do Produto</h3>
                      </div>

                      {/* Imagem - Aspect ratio 16/10 como padrÃ£o de produtos */}
                      <div className="px-4 pt-3 pb-0">
                        <div className="rounded-lg overflow-hidden bg-white border border-slate-100 aspect-[16/10] flex items-center justify-center">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-full object-contain bg-white p-2"
                              onError={() => setImagePreview("")}
                            />
                          ) : (
                            <div className="text-center">
                              <Search size={32} className="text-slate-300 mx-auto mb-1" />
                              <p className="text-xs text-slate-400">Sem imagem</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* InformaÃ§Ãµes */}
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Categoria</p>
                          <p className="text-xs text-slate-600 mt-0.5">{formData.category || "â€”"}</p>
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-2">{formData.name || "â€”"}</p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 font-medium">{formData.brand || "â€”"}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="bg-slate-50 p-2 rounded">
                            <p className="text-xs text-slate-500">PreÃ§o</p>
                            <p className="font-semibold text-slate-900 text-sm">
                              {formData.priceAvg ? `R$ ${formData.priceAvg.toFixed(2)}` : "â€”"}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded">
                            <p className="text-xs text-slate-500">Prioridade</p>
                            <p className="font-semibold text-slate-900 text-sm">{formData.priority}</p>
                          </div>
                        </div>

                        <div className="pt-1">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              formData.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {formData.isActive ? "âœ“ Ativo" : "â—‹ Inativo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3 md:space-y-4 bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
        <div>
          <label className="block text-xs md:text-sm font-medium text-slate-700 mb-2">
            <Search size={16} className="inline mr-2" />
            Buscar produtos
          </label>
          <Input
            placeholder="Buscar por nome, brand ou categoria..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border-slate-300 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 md:gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => {
              setFilterStatus("all");
              setCurrentPage(1);
            }}
            size="sm"
            className="text-xs md:text-sm"
          >
            Todos ({products.length})
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            onClick={() => {
              setFilterStatus("active");
              setCurrentPage(1);
            }}
            size="sm"
          >
            Ativos ({products.filter((p) => p.isActive).length})
          </Button>
          <Button
            variant={filterStatus === "inactive" ? "default" : "outline"}
            onClick={() => {
              setFilterStatus("inactive");
              setCurrentPage(1);
            }}
            size="sm"
          >
            Inativos ({products.filter((p) => !p.isActive).length})
          </Button>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Nome</th>
              <th className="hidden sm:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Brand</th>
              <th className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">PreÃ§o</th>
              <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Status</th>
              <th className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-900">Imagem</th>
              <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-900">
                AÃ§Ãµes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 md:px-6 py-8 md:py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Search size={40} className="text-slate-300 mb-2" />
                    <p className="text-sm md:text-base text-slate-500 font-medium">
                      {products.length === 0
                        ? "Nenhum produto encontrado"
                        : "Nenhum produto atende aos critÃ©rios de busca"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-xs md:text-sm text-slate-900">{product.name}</td>
                  <td className="hidden sm:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-600">{product.brand}</td>
                  <td className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-slate-600">
                    {product.priceAvg ? `R$ ${product.priceAvg.toFixed(2)}` : "â€”"}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {product.isActive ? "âœ“ Ativo" : "â—‹ Inativo"}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-lg object-cover border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                    <div className="flex justify-end items-center gap-1 md:gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="h-8 w-8 md:h-9 md:w-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                        title="Editar produto"
                      >
                        <Edit size={16} className="md:w-[18px] md:h-[18px]" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 md:h-9 md:w-9 text-slate-600 hover:text-red-600 hover:bg-red-50"
                            title="Deletar produto"
                          >
                            <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Confirmar exclusÃ£o</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar <strong>"{product.name}"</strong>? Esta aÃ§Ã£o nÃ£o pode ser desfeita.
                          </AlertDialogDescription>
                          <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Deletar
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Products Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-8">
            <Search size={40} className="text-slate-300 mb-2 mx-auto" />
            <p className="text-sm text-slate-500 font-medium">
              {products.length === 0
                ? "Nenhum produto encontrado"
                : "Nenhum produto atende aos critÃ©rios de busca"}
            </p>
          </div>
        ) : (
          paginatedProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex gap-3">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-16 w-16 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">{product.name}</h3>
                  <p className="text-xs text-slate-600">{product.brand}</p>
                  <p className="text-xs text-slate-600">
                    {product.priceAvg ? `R$ ${product.priceAvg.toFixed(2)}` : "â€”"}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-full mt-1 ${
                      product.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {product.isActive ? "âœ“ Ativo" : "â—‹ Inativo"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(product)}
                  className="flex-1 text-xs gap-1"
                >
                  <Edit size={14} />
                  Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Deletar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogTitle>Confirmar exclusÃ£o</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar <strong>"{product.name}"</strong>? Esta aÃ§Ã£o nÃ£o pode ser desfeita.
                    </AlertDialogDescription>
                    <div className="flex justify-end gap-2">
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(product.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Deletar
                      </AlertDialogAction>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 md:mt-6 flex flex-col md:flex-row md:items-center md:justify-center gap-3 md:gap-2">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            size="sm"
            className="text-xs md:text-sm w-full md:w-auto"
          >
            â† Anterior
          </Button>

          <div className="flex gap-1 mx-0 md:mx-2 justify-center flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="min-w-8 md:min-w-10 text-xs md:text-sm h-8 md:h-9"
                >
                  {page}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            size="sm"
            className="text-xs md:text-sm w-full md:w-auto"
          >
            PrÃ³ximo â†’
          </Button>

          <span className="ml-0 md:ml-4 text-xs md:text-sm font-medium text-slate-600 text-center md:text-left">
            PÃ¡gina <span className="font-bold text-slate-900">{currentPage}</span> de {totalPages}
          </span>
        </div>
      )}

      {/* Results info */}
      <div className="mt-3 md:mt-4 text-xs md:text-sm text-slate-600 text-center">
        Exibindo <span className="font-semibold text-slate-900">{paginatedProducts.length}</span> de <span className="font-semibold text-slate-900">{filteredProducts.length}</span> produtos
      </div>
    </div>
    </div>
  );
}
