import { useState, useEffect, useRef, useCallback } from 'react';
import { Share2, Loader2, Image as ImageIcon, Type, X, Download, Upload } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getBackgroundTemplates, type BackgroundTemplate } from '@/lib/db';

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
  const [showOptions, setShowOptions] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [templates, setTemplates] = useState<BackgroundTemplate[]>([]);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const loadTemplates = useCallback(async () => {
    const data = await getBackgroundTemplates();
    setTemplates(data);
    if (data.length > 0 && !selectedBg && !customBg) {
      setSelectedBg(data[0].url);
    }
  }, [selectedBg, customBg]);

  useEffect(() => {
    if (showGallery) {
      loadTemplates();
    }
  }, [showGallery, loadTemplates]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setCustomBg(url);
        setSelectedBg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        width: 1080,
        height: 1080,
      });
      const link = document.createElement('a');
      link.download = `ia-biblia-${reference.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const bgUrl = customBg || selectedBg || '';
      
      // We share a link that includes the background as a parameter
      // The target page should handle this parameter to show the preview
      const shareUrl = bookId && chapter && verse 
        ? `${baseUrl}/bible/${bookId}/${chapter}?v=${verse}${bgUrl ? `&bg=${encodeURIComponent(bgUrl)}` : ''}`
        : baseUrl;
        
      const shareText = `"${text}" - ${reference}\n\nVeja este versículo no IA Bíblia: ${shareUrl}`;

      if (navigator.share) {
        await navigator.share({
          title: reference,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Link copiado!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
      setShowOptions(false);
      setShowGallery(false);
    }
  };

  const shareAsText = async () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = bookId && chapter && verse 
      ? `${baseUrl}/bible/${bookId}/${chapter}?v=${verse}`
      : baseUrl;
    const shareText = `"${text}"\n\n- ${reference}\n\nEstude a Palavra no IA Bíblia: ${shareUrl}`;
    
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
      alert('Texto copiado!');
    }
    setShowOptions(false);
  };

  const currentBg = customBg || selectedBg;

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${className}`}
      >
        <Share2 size={16} />
        <span>Compartilhar</span>
      </button>

      {showOptions && !showGallery && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={shareAsText}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <Type size={16} className="text-primary" />
            <span>Apenas Texto</span>
          </button>
          <button
            onClick={() => setShowGallery(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left"
          >
            <ImageIcon size={16} className="text-primary" />
            <span>Com Imagem</span>
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

      {showGallery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ImageIcon size={20} className="text-primary" />
                Personalizar Imagem
              </h3>
              <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Preview Area (Hidden from DOM but used for generation) */}
              <div className="flex justify-center">
                <div 
                  ref={cardRef}
                  className="w-[300px] h-[300px] relative overflow-hidden rounded-2xl shadow-lg bg-zinc-900 flex items-center justify-center p-8 text-center"
                  style={{
                    backgroundImage: currentBg ? `url(${currentBg})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Overlay for readability */}
                  <div className="absolute inset-0 bg-black/30" />
                  
                  <div className="relative z-10 flex flex-col gap-4">
                    <p className="font-serif text-lg md:text-xl text-white leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      &ldquo;{text}&rdquo;
                    </p>
                    <p className="font-outfit text-sm font-bold text-white/90 uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {reference}
                    </p>
                    <div className="mt-2 text-[10px] text-white/60 font-medium tracking-tighter uppercase">
                      IA Bíblia • A Bíblia explica a Bíblia
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery Selection */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Templates</span>
                  <label className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <Upload size={12} />
                    Usar Minha Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedBg(t.url);
                        setCustomBg(null);
                      }}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        selectedBg === t.url ? 'border-primary scale-95' : 'border-transparent hover:border-primary/50'
                      }`}
                    >
                      <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {customBg && (
                    <button
                      onClick={() => setSelectedBg(null)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 border-primary scale-95`}
                    >
                      <img src={customBg} alt="Custom" className="w-full h-full object-cover" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-secondary/20 grid grid-cols-2 gap-4">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center justify-center gap-2 py-3 bg-secondary text-foreground rounded-2xl font-bold hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Baixar
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
