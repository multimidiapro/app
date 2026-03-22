import { useState, useEffect } from 'react';
import { Share2, Loader2, Image as ImageIcon, Type, X } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { saveGeneratedImage, getGeneratedImages } from '@/lib/db';

interface ShareVerseProps {
  text: string;
  reference: string;
  bookId?: string;
  chapter?: number;
  verse?: number;
  className?: string;
}

export function ShareVerse({ text, reference, bookId, chapter, verse, className = '' }: ShareVerseProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<{ url: string; id: string } | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    // Check if image already exists in DB
    const checkExistingImage = async () => {
      if (bookId && chapter && verse) {
        const images = await getGeneratedImages(bookId, chapter, verse);
        if (images && images.length > 0) {
          setBackgroundImage({ url: images[0].image_url, id: images[0].id });
        }
      }
    };
    checkExistingImage();
  }, [bookId, chapter, verse]);

  const generateContextualImage = async () => {
    if (!bookId || !chapter || !verse) return null;
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
          const imageUrl = `data:image/png;base64,${base64Data}`;
          // Save to DB for future use and get ID
          const imageId = await saveGeneratedImage(bookId, chapter, verse, imageUrl, prompt);
          if (imageId) {
            setBackgroundImage({ url: imageUrl, id: imageId });
            return { url: imageUrl, id: imageId };
          }
        }
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
    return null;
  };

  const handleShareWithImage = async () => {
    if (!bookId || !chapter || !verse) return;
    if (isSharing) return;
    setIsSharing(true);

    try {
      let currentImage = backgroundImage;
      if (!currentImage) {
        currentImage = await generateContextualImage();
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const shareUrl = `${baseUrl}/bible/${bookId}/${chapter}?v=${verse}${currentImage ? `&img_id=${currentImage.id}` : ''}`;
      
      const shareText = `"${text}" - ${reference}\n\nVeja este versículo com uma imagem inspiradora no IA Bíblia: ${shareUrl}\n\nCadastre-se para progredir na sua jornada bíblica!`;

      if (navigator.share) {
        await navigator.share({
          title: reference,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Link de compartilhamento copiado!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
      setShowOptions(false);
    }
  };

  const shareAsText = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = bookId && chapter && verse 
      ? `${baseUrl}/bible/${bookId}/${chapter}?v=${verse}`
      : baseUrl;
    const shareText = `"${text}"\n\n- ${reference}\n\nVeja este versículo no IA Bíblia: ${shareUrl}\n\nCadastre-se agora para iniciar seus próprios estudos e acompanhar seu progresso bíblico! ✨`;
    
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
          {bookId && chapter && verse && (
            <button
              onClick={handleShareWithImage}
              disabled={isSharing || isGeneratingImage}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left disabled:opacity-50"
            >
              {isSharing || isGeneratingImage ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <ImageIcon size={16} className="text-primary" />
              )}
              <span>Com Imagem</span>
            </button>
          )}
          <button
            onClick={() => setShowOptions(false)}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors text-left border-t border-border"
          >
            <X size={14} />
            <span>Cancelar</span>
          </button>
        </div>
      )}
    </div>
  );
}
