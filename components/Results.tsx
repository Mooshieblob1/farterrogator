import React, { useState, useMemo } from 'react';
import { Copy, Check, Hash, FileText, Tag as TagIcon, Sparkles, Loader2, User, Palette, Layers, Cpu, Shield } from 'lucide-react';
import { InterrogationResult, TaggingSettings, Tag, TagCategory } from '../types';

interface ResultsProps {
  result: InterrogationResult;
  settings: TaggingSettings;
  onGenerateCaption: () => void;
  isGeneratingCaption: boolean;
}

export const Results: React.FC<ResultsProps> = ({ 
  result, 
  settings,
  onGenerateCaption,
  isGeneratingCaption
}) => {
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedNatural, setCopiedNatural] = useState(false);
  const [activeTab, setActiveTab] = useState<'tags' | 'natural'>('tags');

  const processedTags = useMemo(() => {
    // 1. Filter by Category Thresholds
    let tags = result.tags.filter(tag => {
      const threshold = settings.thresholds[tag.category] || 0.5;
      return tag.score >= threshold;
    });

    // 2. Sort by Score (Descending) - Keep high confidence at top before slicing
    tags.sort((a, b) => b.score - a.score);

    // 3. Apply Top K
    tags = tags.slice(0, settings.topK);

    // 4. Randomize if enabled (for string output primarily, but affects visual order too)
    if (settings.randomize) {
      // Fisher-Yates shuffle
      for (let i = tags.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tags[i], tags[j]] = [tags[j], tags[i]];
      }
    }

    return tags;
  }, [result.tags, settings]);

  const formatTag = (name: string) => {
    return settings.removeUnderscores ? name.replace(/_/g, ' ') : name;
  };

  const tagString = useMemo(() => {
    return processedTags.map(t => formatTag(t.name)).join(', ');
  }, [processedTags, settings.removeUnderscores]);

  const handleCopyTags = () => {
    navigator.clipboard.writeText(tagString);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleCopyNatural = () => {
    if (result.naturalDescription) {
      navigator.clipboard.writeText(result.naturalDescription);
      setCopiedNatural(true);
      setTimeout(() => setCopiedNatural(false), 2000);
    }
  };

  const getCategoryColor = (category: TagCategory) => {
    switch (category) {
      case 'character': return 'text-pink-700 bg-pink-50 border-pink-200 dark:text-pink-300 dark:bg-pink-500/20 dark:border-pink-500/30';
      case 'style': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-500/30';
      case 'technical': return 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-700/40 dark:border-slate-600/50';
      case 'rating': return 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-500/20 dark:border-rose-500/30';
      case 'general': default: return 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/20 dark:border-blue-500/30';
    }
  };
  
  const getCategoryIcon = (category: TagCategory) => {
     switch (category) {
      case 'character': return <User className="w-3 h-3" />;
      case 'style': return <Palette className="w-3 h-3" />;
      case 'technical': return <Cpu className="w-3 h-3" />;
      case 'rating': return <Shield className="w-3 h-3" />;
      case 'general': default: return <Layers className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700 w-fit transition-colors duration-300">
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'tags' 
              ? 'bg-red-600 dark:bg-red-500 text-white shadow-lg' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <Hash className="w-4 h-4" />
          Danbooru Tags
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'tags' ? 'bg-black/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {processedTags.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('natural')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'natural' 
              ? 'bg-red-600 dark:bg-red-500 text-white shadow-lg' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Natural Prompt
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 relative bg-white dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-colors duration-300">
        {activeTab === 'tags' ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between transition-colors duration-300">
               <div className="flex items-center gap-2">
                 <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                   Generated Tags
                 </h3>
                 <div className="flex gap-1">
                   {settings.randomize && (
                     <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 text-[10px] font-medium border border-red-200 dark:border-red-500/30">
                       Randomized
                     </span>
                   )}
                   {settings.removeUnderscores && (
                     <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 text-[10px] font-medium border border-red-200 dark:border-red-500/30">
                       No Underscores
                     </span>
                   )}
                 </div>
               </div>
               <button
                 onClick={handleCopyTags}
                 className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:text-white bg-red-50 dark:bg-red-500/10 hover:bg-red-600 dark:hover:bg-red-500 rounded-md transition-all border border-red-200 dark:border-red-500/20"
               >
                 {copiedTags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                 {copiedTags ? 'Copied!' : 'Copy All'}
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
              <div className="flex flex-wrap gap-2">
                {processedTags.map((tag, idx) => (
                  <div 
                    key={`${tag.name}-${idx}`}
                    className={`
                      group flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-md border text-xs transition-all
                      ${getCategoryColor(tag.category)}
                    `}
                    title={`Category: ${tag.category} | Confidence: ${tag.score}`}
                  >
                    <span className="opacity-50">{getCategoryIcon(tag.category)}</span>
                    <span className="font-mono font-medium">{formatTag(tag.name)}</span>
                    <span className="ml-1 text-[10px] font-bold opacity-60 group-hover:opacity-100 bg-black/10 dark:bg-black/20 px-1.5 py-0.5 rounded">
                      {tag.score.toFixed(2)}
                    </span>
                  </div>
                ))}
                {processedTags.length === 0 && (
                   <div className="w-full text-center py-12 text-slate-400 dark:text-slate-500">
                     <TagIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>No tags meet the current criteria.</p>
                     <p className="text-xs mt-1">Try lowering thresholds or increasing Top K.</p>
                   </div>
                )}
              </div>
            </div>
            
            {/* Raw Text View for Tags */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
              <p className="text-xs text-slate-500 font-mono break-words line-clamp-3 opacity-70 hover:opacity-100 transition-opacity select-all">
                {tagString || "No tags..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between transition-colors duration-300">
               <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Natural Language Description</h3>
               {result.naturalDescription && (
                 <button
                   onClick={handleCopyNatural}
                   className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:text-white bg-red-50 dark:bg-red-500/10 hover:bg-red-600 dark:hover:bg-red-500 rounded-md transition-all border border-red-200 dark:border-red-500/20"
                 >
                   {copiedNatural ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                   {copiedNatural ? 'Copied!' : 'Copy Text'}
                 </button>
               )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {result.naturalDescription ? (
                <p className="text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-light text-lg">
                  {result.naturalDescription}
                </p>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                   <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-slate-800 flex items-center justify-center mb-2">
                     <Sparkles className="w-8 h-8 text-red-500 dark:text-red-400 opacity-80" />
                   </div>
                   <div>
                     <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200">Generate Detailed Caption?</h4>
                     <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
                       Create a rich, natural language description suitable for generative AI prompts.
                     </p>
                   </div>
                   <button
                     onClick={onGenerateCaption}
                     disabled={isGeneratingCaption}
                     className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-red-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                   >
                     {isGeneratingCaption ? (
                       <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         Generating...
                       </>
                     ) : (
                       <>
                         <Sparkles className="w-4 h-4" />
                         Generate Caption
                       </>
                     )}
                   </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};