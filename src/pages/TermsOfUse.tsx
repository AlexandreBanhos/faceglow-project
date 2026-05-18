import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfUse() {
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

      <h1 className="text-2xl font-bold text-foreground mb-2">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: maio de 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-foreground">

        <section>
          <h2 className="text-lg font-semibold mb-2">1. Aceitação dos termos</h2>
          <p className="text-muted-foreground">
            Ao criar uma conta ou utilizar o FaceGlow, você concorda com estes Termos de Uso. Se não concordar
            com qualquer parte, não utilize o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Descrição do serviço</h2>
          <p className="text-muted-foreground">
            O FaceGlow é uma plataforma de análise de pele baseada em inteligência artificial que fornece:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-2">
            <li>Análise de imagens faciais com geração de pontuações e diagnóstico de condições.</li>
            <li>Rotinas de skincare personalizadas com recomendações de produtos.</li>
            <li>Histórico de evolução e acompanhamento do progresso.</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            <strong>O FaceGlow não substitui consultas dermatológicas.</strong> Recomendamos consultar um
            profissional de saúde para diagnósticos e tratamentos médicos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Conta e responsabilidades</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Você é responsável por manter a confidencialidade de sua conta.</li>
            <li>As informações de cadastro devem ser verdadeiras e precisas.</li>
            <li>Você deve ter 18 anos ou mais para usar o serviço.</li>
            <li>É proibido compartilhar sua conta com terceiros.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Créditos e planos</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Plano Free:</strong> 1 análise gratuita vitalícia, sem cartão de crédito.</li>
            <li><strong>Análise Avulsa:</strong> R$ 4,90 por análise (PIX via MercadoPago ou cartão).</li>
            <li><strong>Premium Mensal:</strong> R$ 24,90/mês com 8 análises mensais e acesso completo (cartão via Stripe ou PIX).</li>
            <li><strong>Premium Anual:</strong> R$ 197,90/ano (equivalente a R$ 16,49/mês) — 2 meses grátis em relação ao plano mensal.</li>
            <li>Créditos avulsos não utilizados não expiram enquanto a conta estiver ativa.</li>
            <li>Não há reembolso de créditos já utilizados em análises concluídas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Cancelamento e reembolso</h2>
          <p className="text-muted-foreground">
            Você pode cancelar o plano mensal a qualquer momento. O acesso continua até o final do período pago.
            Reembolsos são concedidos apenas para cobranças duplicadas ou falhas técnicas comprovadas.
            Solicite por e-mail: <strong>suporte@faceglow.com.br</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Imagens e conteúdo</h2>
          <p className="text-muted-foreground">
            Ao enviar imagens para análise, você nos concede licença limitada para processá-las com o objetivo
            exclusivo de fornecer o serviço. Não utilizaremos suas imagens para treinamento de IA sem consentimento
            explícito. Você mantém todos os direitos sobre suas imagens.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Limitação de responsabilidade</h2>
          <p className="text-muted-foreground">
            O FaceGlow fornece análises baseadas em IA para fins informativos e educativos. Não nos
            responsabilizamos por decisões tomadas com base nas análises fornecidas. A precisão das análises
            pode variar conforme a qualidade da imagem enviada.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Uso proibido</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Usar o serviço para fins ilegais ou prejudiciais.</li>
            <li>Tentar contornar limites de créditos ou sistemas de pagamento.</li>
            <li>Fazer engenharia reversa ou copiar o serviço.</li>
            <li>Enviar imagens de terceiros sem consentimento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Encerramento de conta</h2>
          <p className="text-muted-foreground">
            Você pode excluir sua conta a qualquer momento pelo perfil. Nos reservamos o direito de encerrar
            contas que violem estes termos. Dados serão excluídos conforme nossa Política de Privacidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Lei aplicável</h2>
          <p className="text-muted-foreground">
            Estes termos são regidos pelas leis brasileiras. Foro eleito: comarca de São Paulo, SP.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">11. Contato</h2>
          <p className="text-muted-foreground">
            Dúvidas: <strong>suporte@faceglow.com.br</strong>
          </p>
        </section>

      </div>
    </div>
  );
}
