import { motion } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import GuidelinesImage from "@/assets/imagem_tela_inicial.png";

type SelfieGuidelinesProps = {
  onStartCamera: () => void;
  onBack: () => void;
};

const SelfieGuidelines = ({ onStartCamera, onBack }: SelfieGuidelinesProps) => {
  const guidelines = [
    {
      icon: "✓",
      title: "Sem maquiagem e óculos",
      description: "Remova para análise mais precisa",
    },
    {
      icon: "✓",
      title: "Cabelo preso",
      description: "Deixando o rosto totalmente visível",
    },
    {
      icon: "✓",
      title: "Expressão neutra",
      description: "Olhe diretamente para a câmera",
    },
    {
      icon: "✓",
      title: "Boa iluminação",
      description: "Iluminação natural e bem visível",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Content */}
      <div className="flex flex-col h-full px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="h-10 w-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <h1 className="text-2xl font-bold text-gray-900 flex-1 text-center">Dicas para a Selfie</h1>
          <div className="h-10 w-10" />
        </div>

        {/* Image */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7 rounded-xl overflow-hidden bg-gray-50 border border-gray-200"
        >
          <img
            src={GuidelinesImage}
            alt="Dicas para tirar a selfie"
            className="w-full h-auto object-cover"
          />
        </motion.div>

        {/* Guidelines List */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3 mb-8 flex-1"
        >
          {guidelines.map((guideline, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.08 }}
              className="flex gap-4 p-3 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="text-lg font-semibold text-gray-400 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {guideline.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold text-gray-900">{guideline.title}</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">{guideline.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <button
            onClick={onStartCamera}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-pink-400 to-rose-500 text-white font-semibold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:from-pink-500 hover:to-rose-600 transition-all"
          >
            <Camera size={18} />
            Tirar Foto
          </button>
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-base hover:bg-gray-50 transition-colors"
          >
            Voltar
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default SelfieGuidelines;
