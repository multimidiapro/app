'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { getGoals, saveGoals } from '@/lib/db';

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadGoals = async () => {
      const savedGoals = await getGoals();
      setGoals(savedGoals);
    };
    loadGoals();
  }, []);

  const handleSave = async () => {
    await saveGoals(goals);
    
    // Clear today's verse so it regenerates with new goals
    const today = new Date().toISOString().split('T')[0];
    localStorage.removeItem(`biblia_ai_verse_${today}`);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8 relative z-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="p-2 hover:bg-secondary rounded-full transition-colors bg-card shadow-sm border border-border"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-outfit text-2xl font-bold text-foreground">Meus Objetivos</h1>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col gap-6">
        <div className="bg-card p-6 sm:p-8 rounded-3xl shadow-sm border border-border relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-lg font-medium text-foreground mb-2 relative z-10">O que você busca em seu estudo?</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed relative z-10">
            Descreva seus objetivos espirituais, lutas atuais ou áreas de interesse. 
            A Inteligência Artificial usará isso para personalizar seu &quot;Versículo do Dia&quot;.
          </p>
          
          <textarea
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="Ex: Quero aprender mais sobre a graça de Deus. Estou passando por um momento de ansiedade no trabalho e preciso de paz. Quero ser um pai melhor..."
            className="w-full h-48 p-4 bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-card transition-all resize-none mb-6 text-foreground placeholder:text-muted-foreground relative z-10"
          />
          
          <div className="flex justify-end relative z-10">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              {saved ? <Check size={18} /> : <Save size={18} />}
              {saved ? 'Salvo!' : 'Salvar Objetivos'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
