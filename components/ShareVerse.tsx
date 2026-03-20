import { useState, useRef } from 'react';
import { Share2, Loader2, Image as ImageIcon, Type, X } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { GoogleGenAI } from "@google/genai";

interface ShareVerseProps {
  text: string;
  reference: string;
  className?: string;
}

export function ShareVerse({ text, reference, className = '' }: ShareVerseProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const generateContextualImage = async () => {
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      const prompt = `Gere uma imagem de fundo inspiradora, pacífica e cinematográfica que represente o contexto deste versículo bíblico: "${text}". A imagem deve ser abstrata ou paisagística, sem rostos humanos detalhados, focando em luz, natureza ou elementos simbólicos.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          setBackgroundImage(`data:image/png;base64,${base64Data}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleShareImage = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      if (!backgroundImage) {
        await generateContextualImage();
      }

      // Wait a bit for image to render in the hidden div
      await new Promise(resolve => setTimeout(resolve, 500));

      if (nodeRef.current) {
        nodeRef.current.style.display = 'flex';
        
        const dataUrl = await htmlToImage.toPng(nodeRef.current, {
          quality: 0.95,
          pixelRatio: 2,
        });
        
        nodeRef.current.style.display = 'none';

        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'versiculo.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const whatsappMsg = `"${text}" - ${reference}\n\nVeja mais no IA Bíblia e comece seus estudos: ${baseUrl}\n\nCadastre-se para progredir na sua jornada bíblica!`;
          
          await navigator.share({
            title: reference,
            text: whatsappMsg,
            files: [file],
          });
        } else {
          const link = document.createElement('a');
          link.download = `versiculo-${reference.replace(/\s+/g, '-')}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    } finally {
      setIsSharing(false);
      setShowOptions(false);
    }
  };

  const shareAsText = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareText = `"${text}"\n\n- ${reference}\n\nVeja este versículo no IA Bíblia: ${baseUrl}\n\nCadastre-se agora para iniciar seus próprios estudos e acompanhar seu progresso bíblico! ✨`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: reference,
          text: shareText,
        });
      } catch (err) {
        console.error('Error sharing text:', err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Texto copiado para a área de transferência!');
    }
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${className}`}
      >
        <Share2 size={16} />
        <span>Compartilhar</span>
      </button>

      {showOptions && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={shareAsText}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <Type size={16} className="text-primary" />
            <span>Apenas Texto</span>
          </button>
          <button
            onClick={handleShareImage}
            disabled={isSharing || isGeneratingImage}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left disabled:opacity-50"
          >
            {isSharing || isGeneratingImage ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : (
              <ImageIcon size={16} className="text-primary" />
            )}
            <span>Gerar Imagem</span>
          </button>
          <button
            onClick={() => setShowOptions(false)}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors text-left border-t border-border"
          >
            <X size={14} />
            <span>Cancelar</span>
          </button>
        </div>
      )}

      {/* Hidden container for image generation */}
      <div 
        ref={nodeRef}
        className="fixed top-[-9999px] left-[-9999px] w-[1080px] h-[1920px] bg-slate-900 flex flex-col items-center justify-center p-20 text-white overflow-hidden"
        style={{ display: 'none', fontFamily: 'serif' }}
      >
        {backgroundImage && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={backgroundImage} 
              alt="Background" 
              className="w-full h-full object-cover blur-md scale-110 opacity-60"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        )}
        
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent z-1"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-12 max-w-[850px]">
          <div className="text-7xl text-primary/80 font-serif">&quot;</div>
          <p className="text-6xl leading-tight font-medium drop-shadow-lg">
            {text}
          </p>
          <div className="w-32 h-1.5 bg-primary/60 rounded-full shadow-lg"></div>
          <p className="text-4xl font-bold text-primary tracking-wide font-sans drop-shadow-md">
            {reference}
          </p>
        </div>

        <div className="absolute bottom-16 left-0 right-0 text-center text-3xl text-white/70 font-sans tracking-[0.2em] uppercase font-bold drop-shadow-md">
          IA Bíblia
        </div>
      </div>
    </div>
  );
}
