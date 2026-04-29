import { motion } from 'framer-motion';
import type { BillingGateway, BillingGatewayKey } from '../types/billing.types';

interface GatewaySelectorProps {
  gateways: BillingGateway[];
  selectedGateway: BillingGatewayKey;
  onGatewayChange: (key: BillingGatewayKey) => void;
}

/**
 * Componente para seleção de gateway de pagamento
 * Responsabilidade única: apresentar e permitir seleção de gateways
 */
export const GatewaySelector = ({ gateways, selectedGateway, onGatewayChange }: GatewaySelectorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <p className="text-sm font-bold text-foreground mb-3">Forma de pagamento</p>
      <div className="grid grid-cols-2 gap-3">
        {gateways.map((gateway) => {
          const active = gateway.key === selectedGateway;
          return (
            <button
              key={gateway.key}
              onClick={() => onGatewayChange(gateway.key)}
              className={`flex flex-col items-center gap-2.5 rounded-[1.5rem] border p-4 text-center transition-all active:scale-[0.97] ${
                active
                  ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]'
                  : 'border-border/70 bg-card'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                {/* Ícone será renderizado via gateway.icon */}
              </div>
              <p className="text-sm font-extrabold text-foreground leading-tight">{gateway.title}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{gateway.description}</p>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
