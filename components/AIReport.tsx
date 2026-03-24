'use client';

import { X, Shield, Eye, EyeOff, Terminal, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIReportProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIReport({ isOpen, onClose }: AIReportProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Relatório de Acesso da IA</h2>
                  <p className="text-xs text-muted-foreground">Transparência e Privacidade</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Data Access */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Eye size={18} />
                  <h3 className="font-bold">O que a IA pode ver</h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Seu nome de exibição',
                    'Seus objetivos de estudo',
                    'Resumo de seus estudos anteriores',
                    'O histórico da conversa atual',
                    'Data e hora atual',
                    'Sua pergunta ou comando atual'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground bg-secondary/20 p-3 rounded-xl border border-border/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* No Access */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <EyeOff size={18} />
                  <h3 className="font-bold">O que a IA NÃO pode ver</h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Sua senha ou dados de login',
                    'Arquivos do seu dispositivo',
                    'Sua localização exata (GPS)',
                    'Dados de outros aplicativos',
                    'Informações financeiras privadas',
                    'Conversas de outros usuários'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-foreground bg-secondary/20 p-3 rounded-xl border border-border/50 opacity-70">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              {/* System Prompt */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-red-500">
                  <Terminal size={18} />
                  <h3 className="font-bold">Instruções do Sistema (Prompt)</h3>
                </div>
                <div className="bg-zinc-950 text-zinc-300 p-4 rounded-xl font-mono text-xs leading-relaxed border border-zinc-800 overflow-x-auto">
                  <p className="mb-2 text-zinc-500">{"// Resumo das diretrizes da IA:"}</p>
                  <p>1. Basear-se APENAS na Bíblia (&quot;A Bíblia explica a Bíblia&quot;).</p>
                  <p>2. Mantenha tom respeitoso e acolhedor.</p>
                  <p>3. Use o contexto de continuidade (não trate como 1º contato).</p>
                  <p>4. Sugira doações apenas em momentos oportunos.</p>
                  <p>5. Personalize saudações e use o nome do usuário.</p>
                  <p>6. Formate em Markdown com referências claras.</p>
                </div>
              </section>

              {/* Suggestions */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <Lightbulb size={18} />
                  <h3 className="font-bold">Sugestões de Melhoria</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">Memória de Longo Prazo</h4>
                    <p className="text-xs text-muted-foreground">Implementar um sistema de tags para que a IA possa agrupar seus estudos por temas recorrentes.</p>
                  </div>
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">Integração de Metas</h4>
                    <p className="text-xs text-muted-foreground">Permitir que a IA sugira planos de leitura específicos baseados nos objetivos que você definiu no perfil.</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-border bg-secondary/30">
              <button
                onClick={onClose}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
