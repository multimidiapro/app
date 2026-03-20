import { useState, useRef } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

interface ShareVerseProps {
  text: string;
  reference: string;
  className?: string;
}

export function ShareVerse({ text, reference, className = '' }: ShareVerseProps) {
  const [isSharing, setIsSharing] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      // If text is too long, just share as text
      if (text.length > 500) {
        await shareAsText();
        return;
      }

      // Try to generate image
      if (nodeRef.current) {
        // Temporarily make it visible for rendering
        nodeRef.current.style.display = 'flex';
        
        const dataUrl = await htmlToImage.toPng(nodeRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }
        });
        
        nodeRef.current.style.display = 'none';

        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'versiculo.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          await navigator.share({
            title: reference,
            text: `"${text}" - ${reference}\n\nGerado por IA Bíblia - ${baseUrl}`,
            files: [file],
          });
        } else {
          // Fallback to text sharing if file sharing is not supported
          await shareAsText();
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to text
      await shareAsText();
    } finally {
      setIsSharing(false);
    }
  };

  const shareAsText = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareText = `"${text}"\n\n- ${reference}\n\nGerado por IA Bíblia - ${baseUrl}`;
    
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
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Texto copiado para a área de transferência!');
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${className}`}
      >
        {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
        <span>Compartilhar</span>
      </button>

      {/* Hidden container for image generation */}
      <div 
        ref={nodeRef}
        className="fixed top-[-9999px] left-[-9999px] w-[1080px] h-[1920px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-20 text-white"
        style={{ display: 'none', fontFamily: 'serif' }}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-12 max-w-[800px]">
          <div className="text-6xl text-primary/60 font-serif">&quot;</div>
          <p className="text-5xl leading-relaxed font-medium">
            {text}
          </p>
          <div className="w-24 h-1 bg-primary/50 rounded-full"></div>
          <p className="text-4xl font-bold text-primary tracking-wide font-sans">
            {reference}
          </p>
        </div>

        <div className="absolute bottom-16 left-0 right-0 text-center text-2xl text-white/50 font-sans tracking-widest uppercase">
          IA Bíblia
        </div>
      </div>
    </>
  );
}
