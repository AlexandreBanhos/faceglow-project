import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Mail, MessageCircle, FileText, Sparkles } from "lucide-react";

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: "Como a análise de pele funciona?",
    a: "Você tira uma selfie com boa iluminação e nossa IA analisa mais de 10 parâmetros da sua pele — acne, oleosidade, manchas, hidratação, sensibilidade e outros. Em segundos você recebe um score detalhado e uma rotina personalizada.",
  },
  {
    q: "Minhas fotos são armazenadas?",
    a: "Suas fotos ficam vinculadas à sua conta para exibição no histórico. Você pode excluí-las a qualquer momento. As imagens NÃO são usadas para treinar modelos de IA ou compartilhadas com terceiros.",
  },
  {
    q: "O que são créditos?",
    a: "Cada análise de pele consome 1 crédito. Novos usuários recebem 5 créditos gratuitamente. Você pode comprar pacotes de créditos ou assinar o plano mensal para análises ilimitadas.",
  },
  {
    q: "Posso cancelar minha assinatura?",
    a: "Sim, a qualquer momento. Vá em Perfil → Plano → Cancelar assinatura. Você continua com acesso até o fim do período pago.",
  },
  {
    q: "A rotina gerada é personalizada de verdade?",
    a: "Sim. A rotina leva em conta seu tipo de pele, condições detectadas, orçamento, uso de maquiagem e outros fatores. Os produtos recomendados são selecionados do nosso catálogo curado.",
  },
  {
    q: "Como altero meu e-mail ou senha?",
    a: "Vá em Perfil → Alterar e-mail (ou Alterar senha). Para e-mail, você receberá um link de confirmação no novo endereço.",
  },
  {
    q: "Como solicito a exclusão dos meus dados?",
    a: "Vá em Perfil → Excluir Conta. Conforme a LGPD, sua solicitação será processada em até 15 dias úteis. Todos os seus dados pessoais serão removidos permanentemente.",
  },
  {
    q: "O FaceGlow substitui consulta dermatológica?",
    a: "Não. O FaceGlow é uma ferramenta de apoio ao cuidado diário com a pele. Para diagnósticos médicos ou tratamentos, sempre consulte um dermatologista.",
  },
];

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-white/60">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-4 text-left active:bg-muted/30 transition-colors gap-3"
      >
        <span className="text-sm font-semibold text-foreground leading-tight flex-1">{faq.q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
          <ChevronDown size={16} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="h-px bg-border/40 mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Support = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col pb-10" style={{ background: "var(--grad-aurora)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full liquiglass-button flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Ajuda e Suporte</h1>
      </div>

      <div className="px-5 space-y-6">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl text-center"
          style={{ background: "var(--grad-coral)" }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles size={26} className="text-white" />
          </div>
          <p className="text-base font-extrabold text-white">Como podemos ajudar?</p>
          <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
            Encontre respostas rápidas abaixo ou entre em contato com nossa equipe.
          </p>
        </motion.div>

        {/* Contato */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Falar com a equipe</p>
          <div className="space-y-2">
            <a
              href="mailto:suporte@faceglow.com.br"
              className="flex items-center gap-4 px-4 py-4 rounded-2xl lg-surface active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">E-mail de suporte</p>
                <p className="text-xs text-muted-foreground">suporte@faceglow.com.br</p>
              </div>
            </a>
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1,%20preciso%20de%20ajuda%20com%20o%20FaceGlow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-4 py-4 rounded-2xl lg-surface active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Resposta em até 24h</p>
              </div>
            </a>
            <button
              onClick={() => navigate("/termos")}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl lg-surface active:scale-[0.98] transition-transform text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Termos e Privacidade</p>
                <p className="text-xs text-muted-foreground">Política de uso e LGPD</p>
              </div>
            </button>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Perguntas frequentes</p>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} faq={faq} />
            ))}
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground pb-2">
          FaceGlow © {new Date().getFullYear()} · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default Support;
