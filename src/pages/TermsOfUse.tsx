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
          <h2 className="text-lg font-semibold mb-2">4. Planos e funcionalidades</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Plano Gratuito:</strong> análise de pele completa com rotina de skincare (passos diários). Gratuito para todos os usuários cadastrados, sem cartão de crédito.</li>
            <li><strong>Plano Premium:</strong> inclui tudo do plano gratuito, mais rotina personalizada com recomendações de produtos curados por IA, histórico avançado e funcionalidades exclusivas.</li>
            <li>Os valores dos planos premium estão disponíveis na página de preços e podem ser atualizados mediante aviso prévio.</li>
            <li>Créditos avulsos adquiridos não expiram enquanto a conta estiver ativa.</li>
            <li>Não há reembolso de créditos já consumidos em análises concluídas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Cancelamento e reembolso</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Direito de arrependimento (CDC Art. 49):</strong> para compras realizadas online, você tem direito ao cancelamento e reembolso integral em até 7 dias corridos da contratação, sem necessidade de justificativa. Solicite por e-mail: <strong>suporte@faceglow.com.br</strong></li>
            <li>Após 7 dias, o cancelamento da assinatura encerra a renovação automática, mas o acesso continua até o fim do período já pago.</li>
            <li>Reembolsos após 7 dias são concedidos apenas para cobranças duplicadas ou falhas técnicas comprovadas.</li>
            <li>Para solicitar cancelamento ou reembolso: <strong>suporte@faceglow.com.br</strong></li>
          </ul>
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
