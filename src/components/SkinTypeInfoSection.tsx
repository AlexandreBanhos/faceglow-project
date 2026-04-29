import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SkinTypeInfoCard from "./SkinTypeInfoCard";

interface SkinTypeInfoSectionProps {
  currentSkinType?: string;
  showAllTypes?: boolean;
  delay?: number;
  onReopenPhoto?: () => void;
}

const SKIN_TYPES = ["normal", "seca", "oleosa", "sensivel", "mista"];

export default function SkinTypeInfoSection({
  currentSkinType = "normal",
  showAllTypes = false,
  delay = 0,
  onReopenPhoto,
}: SkinTypeInfoSectionProps) {
  const normalizedType = (currentSkinType || "normal").toLowerCase().trim();
  const activeTab = SKIN_TYPES.includes(normalizedType) ? normalizedType : "normal";

  if (showAllTypes) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="w-full"
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground mb-2">Tipos de Pele</h2>
          <p className="text-sm text-muted-foreground">Conheça melhor sua pele e como cuidar dela</p>
        </div>

        <Tabs defaultValue={activeTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 gap-1">
            {SKIN_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="text-xs font-semibold capitalize">
                {type === "seca"
                  ? "Seca"
                  : type === "oleosa"
                    ? "Oleosa"
                    : type === "sensivel"
                      ? "Sensível"
                      : type === "mista"
                        ? "Mista"
                        : "Normal"}
              </TabsTrigger>
            ))}
          </TabsList>

          {SKIN_TYPES.map((type) => (
            <TabsContent key={type} value={type} className="mt-4">
              <SkinTypeInfoCard skinType={type} />
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    );
  }

  // Show only current skin type
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="w-full relative"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-1">Seu Tipo de Pele</h2>
          <p className="text-sm text-muted-foreground">Conheça melhor como cuidar</p>
        </div>
        {onReopenPhoto && (
          <button
            onClick={onReopenPhoto}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors text-primary"
            title="Reabrir foto"
          >
            <Eye size={20} />
          </button>
        )}
      </div>
      <SkinTypeInfoCard skinType={currentSkinType} delay={0.1} />
    </motion.div>
  );
}
