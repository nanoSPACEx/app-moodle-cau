import React, { useState, useEffect, useRef } from 'react';
import { CourseItem, ItemType } from '../types';
import { ICON_MAP } from '../constants';
import { generateMoodleContent } from '../services/geminiService';
import { Sparkles, Loader2, Copy, Check, SlidersHorizontal, Info, Trash2, BookOpen, Globe, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  item: CourseItem | null;
  globalContext?: string;
  onSearchRequest?: (query: string) => void;
}

export const CourseItemDetail: React.FC<Props> = ({ item, globalContext = '', onSearchRequest }) => {
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showOptions, setShowOptions] = useState(true);
  
  // Load content from localStorage or reset when item changes
  useEffect(() => {
    if (item) {
      const savedContent = localStorage.getItem(`moodle_content_${item.id}`);
      setGeneratedContent(savedContent || '');
      setIsLoading(false);
      setCustomInstructions('');
      setShowOptions(!savedContent);
    }
  }, [item?.id]);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8 text-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <Sparkles className="w-16 h-16 mb-4 text-blue-200 dark:text-blue-900/50" />
        <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300">Selecciona un recurs</h3>
        <p>Clica sobre qualsevol element de l'arbre del curs per obrir l'Autocreador de continguts amb IA.</p>
      </div>
    );
  }

  const Icon = ICON_MAP[item.type];

  const handleGenerate = async () => {
    if (!item.promptContext) return;
    
    setIsLoading(true);
    setGeneratedContent(''); // Clear previous visual state
    
    try {
      const fullText = await generateMoodleContent(
        item.title,
        item.promptContext,
        customInstructions,
        globalContext,
        (chunk) => setGeneratedContent(chunk)
      );
      
      // Save to localStorage when complete
      if (fullText) {
        localStorage.setItem(`moodle_content_${item.id}`, fullText);
      }
      setShowOptions(false); // Collapse options after generation to focus on content
    } catch (error) {
      console.error("Failed to generate content", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchClick = () => {
    if (!onSearchRequest) return;
    
    const baseInfo = `Tema: "${item.title}". Descripció: "${item.description}".`;
    let finalQuery = '';

    if (globalContext && globalContext.trim().length > 0) {
      // Smart prompt combining item info + global context suggestion
      finalQuery = `
      Actua com a investigador docent expert.
      
      OBJECTIU DE LA CERCA:
      Trobar informació actualitzada, exemples reals i recursos educatius sobre:
      ${baseInfo}
      
      CONTEXT GLOBAL DEL CURS (Per a referència):
      "${globalContext.slice(0, 2500)}..."
      
      TASCA:
      Utilitza Google Search per trobar contingut que enriqueixi aquest tema, tenint en compte el context global proporcionat si és rellevant.
      `;
    } else {
      // Standard prompt
      finalQuery = `Cerca a Google informació detallada i recursos educatius sobre: "${item.title}". Context específic: ${item.description}`;
    }

    onSearchRequest(finalQuery);
  };

  const handleDeleteSaved = () => {
    if (window.confirm("Estàs segur que vols esborrar el contingut guardat?")) {
      localStorage.removeItem(`moodle_content_${item.id}`);
      setGeneratedContent('');
      setShowOptions(true);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const hasGlobalContext = globalContext && globalContext.length > 0;

  // Determine badge color classes dynamically for dark mode
  const getBadgeClasses = (type: ItemType) => {
    switch (type) {
      case ItemType.QUIZ: return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300';
      case ItemType.ASSIGNMENT: return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300';
      case ItemType.FORUM: return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`p-3 rounded-lg ${getBadgeClasses(item.type)}`}>
              <Icon size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{item.title}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {item.type}
                </span>
                {generatedContent && (
                   <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded flex items-center">
                     <Check size={10} className="mr-1" /> Guardat
                   </span>
                )}
              </div>
              <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">{item.description}</p>
            </div>
          </div>
          
          {/* Action Button: Google Search Grounding */}
          {onSearchRequest && (
            <div className="ml-4">
              <button
                onClick={handleSearchClick}
                className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm font-medium text-sm rounded-lg border border-transparent ${hasGlobalContext ? 'ring-2 ring-orange-400 ring-offset-1 dark:ring-offset-gray-800' : ''}`}
                title={hasGlobalContext ? "Cerca intel·ligent utilitzant el Context Global" : "Cerca a Google informació sobre aquest element"}
              >
                <Globe size={18} />
                <span className="hidden sm:inline">Investigar</span>
                {hasGlobalContext && <span className="text-[10px] bg-white/20 px-1.5 rounded-sm ml-1">+Context</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Section */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span className="font-semibold text-gray-700 dark:text-gray-200">Autocreador de Continguts (Gemini)</span>
            </div>
            <div className="flex items-center space-x-2">
              {generatedContent && !isLoading && (
                <button 
                  onClick={handleDeleteSaved}
                  className="flex items-center space-x-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors mr-2 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                  title="Esborrar contingut guardat"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-medium">Esborrar</span>
                </button>
              )}
              <button 
                onClick={() => setShowOptions(!showOptions)}
                className={`transition-colors ${showOptions ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                title="Configuració de generació"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          {showOptions && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Context Info Banner */}
              {globalContext && (
                <div className="flex items-start p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 rounded-md mb-3 text-xs text-orange-800 dark:text-orange-300">
                   <BookOpen size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                   <span>
                     <strong>Bibliografia Activada:</strong> S'utilitzarà la documentació externa proporcionada ({globalContext.length} caràcters) com a font principal.
                   </span>
                </div>
              )}

              <div>
                <label className="flex items-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  <Info size={12} className="mr-1" />
                  Context Base (Automàtic)
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-100 dark:border-gray-700 italic">
                  "{item.promptContext}"
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Instruccions de personalització (Opcional)
                </label>
                <textarea 
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500" 
                  rows={2}
                  placeholder="Ex: Fes-ho més breu, afegeix exemples de pel·lícules actuals, utilitza un to més formal..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
             <div className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
               Potenciat per Gemini 3 Flash Preview
             </div>
             <div className="flex space-x-2 w-full sm:w-auto justify-end">
                {generatedContent && !isLoading && (
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>Copiar Text</span>
                  </button>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !item.promptContext}
                  className={`flex items-center justify-center space-x-2 px-5 py-2 rounded-md text-sm font-semibold transition-all shadow-sm w-full sm:w-auto ${
                    isLoading 
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-400 dark:text-indigo-300 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-md'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generant...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{generatedContent ? 'Regenerar' : 'Crear Contingut'}</span>
                    </>
                  )}
                </button>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800 relative transition-colors custom-scrollbar">
          {!generatedContent && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-3 opacity-60">
              <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600" />
              <p className="text-center max-w-sm text-sm">
                Configura les instruccions a dalt i prem "Crear Contingut" per generar el material didàctic automàticament.
              </p>
            </div>
          )}
          
          {generatedContent && (
            <div className="prose prose-indigo prose-sm max-w-none text-gray-800 dark:text-gray-200 dark:prose-invert">
               <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};