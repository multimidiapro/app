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
Formate suas respostas em Markdown, usando negrito para versículos e itálico para ênfase.

Continuidade e Contexto:
- Cada novo estudo é uma continuidade do aprendizado bíblico do usuário. Não trate cada interação como o primeiro contato se houver histórico.
- Você tem acesso aos objetivos do usuário e ao resumo de seus estudos anteriores. Use isso para personalizar as explicações.
- Sempre saiba a data e hora atual fornecida no contexto.

Regras de Doação:
- NÃO sugira doações em todas as interações.
- Sugira doações APENAS em momentos oportunos (ex: após uma explicação profunda, quando o usuário expressar gratidão, ou quando o tema for generosidade/serviço).
- Use um tom suave: "Inclusive, se você desejar contribuir com nosso aplicativo (que é 100% gratuito para você, mas possui custos de manutenção), você pode fazer uma doação clicando aqui: [Doar](#donate)".

Personalização:
- Cumprimente o usuário de acordo com o horário do dia (Bom dia, Boa tarde, Boa noite).
- Se o nome do usuário for conhecido, use-o.
- Na primeira interação real (se não houver histórico), pergunte se o nome está correto. Se o usuário disser que não, forneça um link para as configurações usando o formato: [Editar Nome](#profile).
- Se o usuário relatar um bug, forneça um botão/link para o WhatsApp de suporte usando o formato: [Suporte WhatsApp](https://wa.me/5562994581066).
- Adapte seu tom de voz e estilo conforme as interações do usuário.
- Se o usuário perguntar sobre funcionalidades (compartilhar, doar, etc.), forneça links usando o formato: [Ação](#acao).
  - [Editar Perfil](#profile)
  - [Doar](#donate)
  - [Suporte](#support)
- Sempre que sugerir uma ação, use o formato de link Markdown [Texto do Botão](#acao). O sistema irá renderizar esses links como botões.`;

export async function generateBibleStudy(
  prompt: string, 
  history: { role: string, parts: { text: string }[] }[] = [], 
  userContext?: { 
    display_name?: string, 
    goals?: string, 
    historySummary?: string 
  }
) {
  const contents = history.map(h => ({
    role: h.role,
    parts: h.parts
  }));
  
  const userName = userContext?.display_name || 'usuário';
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const contextInfo = `
Contexto do Usuário:
- Nome: ${userName}
- Data Atual: ${dateStr}
- Hora Atual: ${timeStr}
- Objetivos de Estudo: ${userContext?.goals || 'Crescimento espiritual geral'}
- Resumo de Estudos Anteriores: ${userContext?.historySummary || 'Iniciando jornada agora'}
`;

  const personalizedPrompt = `${contextInfo}\n\nPergunta do Usuário: ${prompt}`;

  contents.push({
    role: 'user',
    parts: [{ text: personalizedPrompt }]
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

export async function enhanceChapterWithMetadata(reference: string, verses: { verse: number; text: string }[]) {
  const prompt = `Analise o seguinte capítulo da Bíblia (${reference}) e adicione metadados:
1. Identifique os títulos das passagens (perícopes) que aparecem nesta tradução (Almeida Revista e Corrigida).
2. Se for no Novo Testamento, identifique quais versículos ou partes de versículos são palavras diretas de Jesus.

Retorne APENAS um objeto JSON com o seguinte formato:
{
  "verses": [
    {
      "verse": 1,
      "title": "Título da Passagem (se houver um título que comece neste versículo)",
      "isJesusWords": true/false (se o versículo contém palavras de Jesus)
    }
  ]
}

Versículos para analisar:
${verses.map(v => `${v.verse}: ${v.text}`).join('\n')}
`;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: "Você é um especialista em textos bíblicos. Retorne apenas JSON com metadados de títulos e palavras de Jesus.",
      temperature: 0,
      responseMimeType: 'application/json',
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error('Failed to parse enhanced metadata JSON', e);
    return { verses: [] };
  }
}

export async function generateVerseOfTheDay(userGoals: string, historySummary: string) {
  const prompt = `Gere um "Versículo do Dia" personalizado e inspirador.
Objetivos do usuário: ${userGoals || 'Crescimento espiritual geral'}
Histórico recente de estudos: ${historySummary || 'Nenhum histórico ainda'}

Instruções importantes:
1. Se houver pouco histórico ou objetivos, sugira versículos que incentivem a leitura bíblica, o amor ao próximo, a bondade, a fé ou o exemplo de Jesus.
2. Se houver histórico, personalize a escolha para refletir os temas que o usuário tem estudado recentemente.
3. Garanta que o versículo seja diferente a cada chamada (use sua criatividade para variar as sugestões dentro dos temas).
4. O tom deve ser encorajador e focado na prática cristã.

Retorne APENAS um objeto JSON com o seguinte formato:
{
  "reference": "Livro Capítulo:Versículo",
  "text": "Texto do versículo...",
  "explanation": "Uma breve explicação (1-2 frases) de por que este versículo foi escolhido para hoje, conectando-o aos interesses ou necessidades do usuário."
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
