import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERRO: NEXT_PUBLIC_GEMINI_API_KEY não está configurada nas Variáveis de Ambiente.');
      throw new Error('Configuração da API Gemini ausente. Por favor, configure NEXT_PUBLIC_GEMINI_API_KEY.');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `Você é um assistente de estudo bíblico online (Bíblia AI).
Sua missão é explicar os textos bíblicos usando APENAS outros textos bíblicos como base.
Siga o princípio: "A Bíblia explica a Bíblia".
Sempre forneça o contexto bíblico.
Sempre cite o livro, capítulo e versículo de suas referências.
NÃO use teologia externa, filosofia, opiniões pessoais ou fontes históricas fora do próprio texto bíblico, a menos que seja estritamente necessário para o contexto de tradução (ex: significado de uma palavra no original hebraico/grego).
Mantenha um tom respeitoso, acolhedor e focado no texto sagrado.
Formate suas respostas em Markdown, usando negrito para versículos e itálico para ênfase.`;

export async function generateBibleStudy(prompt: string, history: { role: string, parts: { text: string }[] }[] = []) {
  const contents = history.map(h => ({
    role: h.role,
    parts: h.parts
  }));
  
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
    }
  });

  return response.text || 'Desculpe, não consegui gerar uma resposta.';
}

export async function generateVerseExplanation(reference: string, text: string) {
  const prompt = `Explique o seguinte versículo bíblico:
Referência: ${reference}
Texto: "${text}"

Sua missão é explicar este texto usando APENAS outros textos bíblicos como base.
Siga o princípio: "A Bíblia explica a Bíblia".
Forneça o contexto bíblico.
NÃO use teologia externa, filosofia, opiniões pessoais ou fontes históricas fora do próprio texto bíblico.
Liste versículos complementares ou relacionados que ajudam a entender este texto.

Retorne APENAS um objeto JSON com o seguinte formato:
{
  "explanation": "Explicação do versículo baseada apenas na Bíblia...",
  "relatedVerses": [
    {
      "reference": "Livro Capítulo:Versículo",
      "text": "Texto do versículo relacionado...",
      "reason": "Por que este versículo se relaciona com o texto principal"
    }
  ]
}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.3,
      responseMimeType: 'application/json',
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error('Failed to parse explanation JSON', e);
    return {
      explanation: "Não foi possível gerar a explicação no momento.",
      relatedVerses: []
    };
  }
}

export async function generateBibleText(reference: string) {
  const prompt = `Forneça o texto bíblico completo para a seguinte referência: ${reference}.
Use a tradução Almeida (ou equivalente em português).
Retorne APENAS um objeto JSON com o seguinte formato:
{
  "reference": "Livro Capítulo",
  "verses": [
    {
      "verse": 1,
      "text": "Texto do versículo..."
    }
  ]
}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview', // Use flash for faster text retrieval
    contents: prompt,
    config: {
      systemInstruction: "Você é um servidor de textos bíblicos. Retorne apenas JSON.",
      temperature: 0,
      responseMimeType: 'application/json',
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error('Failed to parse AI Bible text JSON', e);
    return null;
  }
}

export async function generateVerseOfTheDay(userGoals: string, historySummary: string) {
  const prompt = `Gere um "Versículo do Dia" personalizado.
Objetivos do usuário: ${userGoals || 'Crescimento espiritual geral'}
Histórico recente: ${historySummary || 'Nenhum histórico ainda'}

Com base nisso, escolha UM versículo bíblico encorajador ou pertinente.
Retorne APENAS um objeto JSON com o seguinte formato:
{
  "reference": "Livro Capítulo:Versículo",
  "text": "Texto do versículo...",
  "explanation": "Uma breve explicação (1-2 frases) de por que este versículo se aplica aos objetivos do usuário, usando apenas a Bíblia como base."
}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      responseMimeType: 'application/json',
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      reference: "Salmos 119:105",
      text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.",
      explanation: "A Palavra de Deus nos guia em todas as decisões."
    };
  }
}
