import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-2">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: maio de 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">

        <section>
          <h2 className="text-lg font-semibold mb-2">1. Quem somos</h2>
          <p className="text-muted-foreground">
            O FaceGlow é um serviço de análise de pele com inteligência artificial que oferece rotinas de skincare
            personalizadas. Este documento explica como coletamos, usamos e protegemos seus dados pessoais, em
            conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Dados que coletamos</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Dados de conta:</strong> e-mail e nome fornecidos no cadastro.</li>
            <li>
              <strong>Imagens faciais:</strong> fotos enviadas para análise de pele. Vinculadas <strong>exclusivamente à sua conta</strong> e identificadas pelo seu ID de usuário.
              Permanecem armazenadas apenas enquanto sua conta estiver ativa.
              Ao excluir sua conta, todas as suas imagens são removidas permanentemente dos nossos servidores em até 30 dias (LGPD Art. 15–16).
              Não são acessíveis a outros usuários nem compartilhadas com terceiros para fins comerciais.
            </li>
            <li><strong>Resultados de análise:</strong> pontuações, tipo de pele, condições identificadas e recomendações geradas.</li>
            <li><strong>Dados de uso:</strong> histórico de análises, rotinas criadas e progresso registrado.</li>
            <li><strong>Dados de pagamento:</strong> processados pelo Stripe e MercadoPago — não armazenamos dados de cartão em nossos servidores.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Como usamos seus dados</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Fornecer e personalizar o serviço de análise de pele.</li>
            <li>Gerar e manter sua rotina de skincare.</li>
            <li>Processar pagamentos e gerenciar sua assinatura.</li>
            <li>Melhorar os modelos de IA e a experiência do serviço (dados anonimizados).</li>
            <li>Enviar comunicações relacionadas ao serviço (sem spam).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Compartilhamento de dados</h2>
          <p className="text-muted-foreground">
            Não vendemos seus dados pessoais. Compartilhamos apenas com prestadores essenciais para o funcionamento do serviço:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
            <li><strong>Supabase</strong> — armazenamento de dados e autenticação.</li>
            <li><strong>Google (Gemini)</strong> — processamento de imagens para análise de pele.</li>
            <li><strong>Stripe</strong> — processamento de pagamentos com cartão.</li>
            <li><strong>MercadoPago</strong> — processamento de pagamentos via PIX.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Armazenamento e segurança</h2>
          <p className="text-muted-foreground mb-2">
            Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso.
            Adotamos práticas de segurança para proteger contra acesso não autorizado.
          </p>
          <p className="text-muted-foreground font-medium mt-3 mb-1">Sobre suas imagens faciais:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>São armazenadas no Supabase Storage vinculadas exclusivamente ao seu identificador de usuário (UUID).</li>
            <li>Apenas você tem acesso às suas próprias imagens — nunca expostas a outros usuários.</li>
            <li>Permanecem no sistema <strong>somente enquanto sua conta estiver ativa</strong>.</li>
            <li>Ao excluir sua conta, todas as imagens são removidas permanentemente em até 30 dias, conforme exigido pela LGPD (Art. 15 e 16).</li>
            <li>Não utilizamos suas imagens para treinar modelos de inteligência artificial sem seu consentimento explícito e prévio.</li>
            <li>Não compartilhamos suas imagens com terceiros para fins publicitários ou comerciais.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Seus direitos (LGPD)</h2>
          <p className="text-muted-foreground mb-2">Conforme a LGPD, você tem direito a:</p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Acessar seus dados pessoais armazenados.</li>
            <li>Corrigir dados incompletos ou incorretos.</li>
            <li>Solicitar a exclusão de seus dados.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
            <li>Portabilidade dos dados.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Para exercer esses direitos, entre em contato: <strong>contato@faceglow-soora.me</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Cookies</h2>
          <p className="text-muted-foreground">
            Utilizamos armazenamento local (localStorage) para manter sua sessão e preferências. Não utilizamos
            cookies de rastreamento de terceiros para publicidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Menores de idade</h2>
          <p className="text-muted-foreground">
            O FaceGlow não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Alterações nesta política</h2>
          <p className="text-muted-foreground">
            Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas por e-mail
            ou aviso no aplicativo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Contato</h2>
          <p className="text-muted-foreground">
            Dúvidas sobre privacidade: <strong>contato@faceglow-soora.me</strong>
          </p>
        </section>

      </div>
    </div>
  );
}
