# Liquid Glass Design Examples

This file contains practical code examples for implementing the liquid glass design across common page patterns in FaceGlow.

## Example 1: Auth Screen (Login/Signup)

```tsx
import { FGOrbMark, FGGradientText } from "@/components/shared";

export function AuthPage() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden"
         style={{ background: "var(--grad-aurora)" }}>
      {/* Aurora backdrop */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full 
                        blur-3xl opacity-60" 
             style={{ background: "radial-gradient(circle, #f6c8a8, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full 
                        blur-3xl opacity-50"
             style={{ background: "radial-gradient(circle, #f1a8c5, transparent 70%)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-12 max-w-md mx-auto min-h-screen 
                      flex flex-col justify-center">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <FGOrbMark size={32} />
            <span className="text-2xl font-bold">Face·Glow</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Entrar</h1>
          <p className="text-[var(--fg-ink-3)]">Continue sua jornada com a Face·Glow</p>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          {/* Email Input */}
          <div className="lg-surface px-4 py-3 rounded-2xl">
            <label className="fg-mono text-xs text-[var(--fg-ink-3)]">E-MAIL</label>
            <input 
              type="email"
              className="w-full bg-transparent border-none text-[var(--fg-ink)] 
                        focus:outline-none mt-1"
              placeholder="seu@email.com"
            />
          </div>

          {/* Password Input */}
          <div className="lg-surface px-4 py-3 rounded-2xl">
            <label className="fg-mono text-xs text-[var(--fg-ink-3)]">SENHA</label>
            <input 
              type="password"
              className="w-full bg-transparent border-none text-[var(--fg-ink)] 
                        focus:outline-none mt-1"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Links */}
        <div className="mb-6">
          <a href="#" className="text-sm text-[var(--fg-ink-2)] hover:text-[var(--fg-ink)] 
                              font-semibold">
            Esqueci minha senha
          </a>
        </div>

        {/* Buttons */}
        <button className="coral-button w-full py-3 rounded-2xl font-semibold mb-3">
          Entrar →
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-[rgba(80,40,60,0.12)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 fg-mono text-xs text-[var(--fg-ink-3)]">OU</span>
          </div>
        </div>

        <button className="liquiglass-button w-full py-3 rounded-2xl font-medium mb-4">
          Continuar com Apple
        </button>

        {/* Signup Link */}
        <p className="text-center text-sm text-[var(--fg-ink-3)]">
          Não tem conta?{" "}
          <a href="#" className="text-[var(--fg-ink-2)] font-semibold">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  );
}
```

## Example 2: Dashboard Score Card

```tsx
import { FGScoreOrb, FGMetricBar } from "@/components/shared";

export function DashboardScoreCard({ score = 87, metrics = {} }) {
  return (
    <div className="lg-surface-strong p-6 rounded-3xl mb-6">
      <div className="flex gap-4 items-start">
        {/* Score Orb - Compact */}
        <div className="flex-shrink-0">
          <FGScoreOrb score={score} size={120} variant="compact" />
        </div>

        {/* Score Info */}
        <div className="flex-1">
          <div className="fg-mono text-xs text-[var(--fg-ink-3)] mb-1">SCORE HOJE</div>
          <div className="text-3xl font-bold mb-1">{score}</div>
          <div className="text-sm text-green-500 font-semibold">+3 ↑</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 space-y-3 pt-4 border-t border-[rgba(255,255,255,0.2)]">
        <FGMetricBar label="Hidratação" value={75} max={100} accent="#ddb693" />
        <FGMetricBar label="Oleosidade" value={45} max={100} accent="#e8a9c2" />
        <FGMetricBar label="Sensibilidade" value={62} max={100} accent="#ef8fb8" />
      </div>
    </div>
  );
}
```

## Example 3: Routine Cards

```tsx
export function RoutineCardsSection({ routineItems = [] }) {
  return (
    <div className="space-y-3">
      {routineItems.map((item, idx) => (
        <div 
          key={idx}
          className="lg-surface p-4 rounded-2xl flex items-center gap-3 
                    cursor-pointer hover:lg-surface-strong transition-all"
        >
          {/* Checkbox */}
          <input 
            type="checkbox"
            className="w-6 h-6 rounded-full accent-[#ef8fb8] cursor-pointer"
            defaultChecked={item.completed}
          />

          {/* Content */}
          <div className="flex-1">
            <div className="font-semibold text-[var(--fg-ink)]">
              {item.name}
            </div>
            <div className="text-xs text-[var(--fg-ink-3)]">
              {item.benefit}
            </div>
          </div>

          {/* CTA */}
          <div className="text-[var(--fg-ink-3)]">→</div>
        </div>
      ))}
    </div>
  );
}
```

## Example 4: Results Screen Layout

```tsx
import { AuroraBackdrop, FGScoreOrb, FGGradientText } from "@/components/shared";

export function ResultsScreen({ analysis }) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden"
         style={{ background: "var(--grad-aurora)" }}>
      <AuroraBackdrop tone="warm" />

      <div className="relative z-10 px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <button className="liquiglass-button p-2 rounded-xl">←</button>
          <h1 className="text-2xl font-bold">Seu diagnóstico</h1>
        </div>

        {/* Score Section */}
        <div className="flex justify-center mb-8">
          <FGScoreOrb 
            score={analysis.score}
            size={280}
            label="Saúde da pele"
          />
        </div>

        {/* Key Insights */}
        <div className="space-y-3 mb-8">
          {analysis.insights.map((insight, idx) => (
            <div 
              key={idx}
              className="lg-surface p-4 rounded-2xl flex items-start gap-3"
            >
              <span className="text-2xl">💡</span>
              <div>
                <div className="font-semibold">{insight.title}</div>
                <div className="text-sm text-[var(--fg-ink-3)]">
                  {insight.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="coral-button w-full py-4 rounded-2xl font-bold mb-3">
          Ver minha rotina personalizada
        </button>
        
        <button className="liquiglass-button w-full py-3 rounded-2xl font-medium">
          Salvar relatório
        </button>
      </div>
    </div>
  );
}
```

## Example 5: Premium Paywall Card

```tsx
import { FGGradientText } from "@/components/shared";

export function PaywallCard({ plan }) {
  const isPrimary = plan.featured;

  return (
    <div 
      className={`rounded-3xl p-6 border transition-all ${
        isPrimary 
          ? "lg-surface-strong border-[var(--glass-border)]" 
          : "lg-surface border-[rgba(255,255,255,0.5)]"
      }`}
    >
      {/* Badge */}
      {isPrimary && (
        <div className="inline-block mb-4 px-3 py-1 rounded-full 
                       bg-gradient-to-r from-coral/30 to-pink/30 
                       border border-[var(--glass-border)]">
          <span className="fg-mono text-xs font-bold text-[var(--fg-ink-2)]">
            MELHOR VALOR
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

      {/* Price */}
      <div className="mb-4">
        <span className="text-3xl font-bold">{plan.price}</span>
        <span className="text-[var(--fg-ink-3)]"> {plan.period}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-[var(--fg-ink-3)] mb-6">
        {plan.description}
      </p>

      {/* Features */}
      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            <span className="text-green-500 font-bold">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isPrimary ? (
        <button className="coral-button w-full py-3 rounded-xl font-bold">
          Começar agora
        </button>
      ) : (
        <button className="liquiglass-button w-full py-3 rounded-xl font-medium">
          Escolher plano
        </button>
      )}

      {isPrimary && (
        <p className="text-center text-xs text-[var(--fg-ink-3)] mt-3">
          7 dias grátis · cancele quando quiser
        </p>
      )}
    </div>
  );
}
```

## Example 6: Navigation with Glass Effect

```tsx
import { FGOrbMark } from "@/components/shared";

export function GlassNavigation() {
  return (
    <nav className="sticky top-0 z-50 px-4 py-3">
      <div className="lg-surface px-6 py-3 rounded-3xl flex justify-between items-center 
                      max-w-4xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <FGOrbMark size={24} />
          <span className="font-bold">Face·Glow</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex gap-6">
          {["Análise", "Rotina", "Premium", "Perfil"].map((link) => (
            <a 
              key={link}
              href="#"
              className="text-sm font-medium text-[var(--fg-ink-2)] 
                        hover:text-[var(--fg-ink)] transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        {/* CTA Button */}
        <button className="coral-button px-5 py-2 rounded-2xl text-sm font-semibold">
          Analisar grátis
        </button>
      </div>
    </nav>
  );
}
```

## Example 7: Form Group with Glass Styling

```tsx
export function FormGroup({ label, type = "text", value, onChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-2">
        {label}
      </label>
      <div className="lg-surface px-4 py-3 rounded-2xl">
        <input 
          type={type}
          value={value}
          onChange={onChange}
          className="w-full bg-transparent border-none text-[var(--fg-ink)] 
                    focus:outline-none placeholder-[var(--fg-ink-4)]"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
}
```

## Example 8: Loading State with Glass

```tsx
export function LoadingStateWithGlass() {
  return (
    <div className="relative w-full min-h-screen flex items-center justify-center"
         style={{ background: "var(--grad-aurora)" }}>
      <div className="lg-surface-strong p-8 rounded-3xl">
        <div className="w-12 h-12 rounded-full animate-spin"
             style={{
               background: "conic-gradient(from 0deg, #ddb693, #ef8fb8, #ddb693)",
               margin: "0 auto"
             }} />
        <p className="text-center text-[var(--fg-ink-3)] mt-4">
          Analisando sua pele...
        </p>
      </div>
    </div>
  );
}
```

---

Use these examples as templates when updating existing pages. The key patterns are:
1. Aurora backdrop for full pages
2. Glass surfaces for cards/sections
3. Coral buttons for primary CTAs
4. Glass buttons for secondary actions
5. Score orbs for data visualization
6. Gradient text for emphasis
