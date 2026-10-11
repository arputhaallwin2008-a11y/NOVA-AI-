import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { GeneratedImage } from '../../types.ts';
import { api } from '../../services/api.ts';

const STYLES = [
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'photorealistic', label: 'Photorealistic' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'anime', label: 'Anime & Manga' },
  { id: 'minimalist', label: 'Minimalist Vector' },
  { id: '3d-render', label: '3D Octane Render' },
];

const RATIOS = [
  { id: '1:1', label: '1:1 Square' },
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Portrait' },
  { id: '4:3', label: '4:3 Classic' },
];

export const ImageStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [style, setStyle] = useState('cinematic');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const res = await api.getImages();
      setImages(res.images);
      if (res.images.length > 0 && !selectedImage) {
        setSelectedImage(res.images[0]);
      }
    } catch (err: any) {
      console.error('Failed to load images:', err);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await api.generateImage({
        prompt: prompt.trim(),
        aspectRatio,
        style,
      });

      setImages((prev) => [res.image, ...prev]);
      setSelectedImage(res.image);
    } catch (err: any) {
      setError(
        err.message || 'Image generation failed. Ensure your Gemini model capabilities are enabled.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      if (selectedImage?.id === id) {
        setSelectedImage(null);
      }
    } catch (err: any) {
      setError('Failed to delete image.');
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.base64Preview || img.image_reference;
    link.download = `nova-${img.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyPrompt = (img: GeneratedImage) => {
    navigator.clipboard.writeText(img.prompt);
    setCopiedId(img.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
      {/* Studio Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-300 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span>NOVA Visual Studio</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          AI Image Generator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Turn your imagination into high-fidelity visuals using Gemini visual intelligence.
        </p>
      </div>

      {/* Generation Composer Card */}
      <div className="rounded-2xl border border-slate-700/80 bg-[#111827]/80 p-4 sm:p-6 shadow-xl backdrop-blur-xl mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic observatory overlooking glowing nebula rings in deep space..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/90 p-3.5 text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
            />
          </div>

          {/* Style Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Aesthetic Style
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStyle(st.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    style === st.id
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-violet-400'
                      : 'border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    aspectRatio === r.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                      : 'border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                !prompt.trim() || isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30 hover:scale-102 active:scale-98'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Image...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Artwork</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-violet-400" />
          <span>Your Creation Gallery ({images.length})</span>
        </h2>

        {images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-slate-500">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40 text-violet-400" />
            <p className="text-sm">No artwork generated yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Enter a creative description above to generate your first visual asset.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] shadow-lg transition-all hover:border-violet-500/50 hover:shadow-violet-950/20"
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={img.base64Preview || img.image_reference}
                    alt={img.prompt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 justify-between">
                    <span className="text-[11px] font-medium text-slate-200 line-clamp-2">
                      {img.prompt}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-xs text-slate-300 line-clamp-1 font-medium mb-2">
                    {img.prompt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-2">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px]">
                      {img.aspect_ratio}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyPrompt(img)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        title="Copy prompt"
                      >
                        {copiedId === img.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPrompt(img.prompt);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-violet-300"
                        title="Reuse prompt"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownload(img)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300"
                        title="Download image"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                        title="Delete image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
