import React, { useState, useEffect, useRef } from 'react';
import { CourseItem, ItemType } from '../types';
import { ICON_MAP } from '../constants';
import { generateMoodleContent } from '../services/geminiService';
import { Sparkles, Loader2, Copy, Check, SlidersHorizontal, Info, Trash2, BookOpen, Globe, ChevronDown, FileText } from 'lucide-react';
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
  
  // Search Menu State
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
  const searchMenuRef = useRef<HTMLDivElement>(null);

  // Load content from localStorage or reset when item changes
  useEffect(() => {
    if (item) {
      const savedContent = localStorage.getItem(`moodle_content_${item.id}`);
      setGeneratedContent(savedContent || '');
      setIsLoading(false);
      setCustomInstructions('');
      setShowOptions(!savedContent);
      setIsSearchMenuOpen(false); // Close menu on item change
    }
  }, [item?.id]);

  // Click outside to close search menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchMenuRef.current && !searchMenuRef.current.contains(event.target as Node)) {
        setIsSearchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <Sparkles className="w-16 h-16 mb-4 text-blue-200" />
        <h3 className="text-xl font-semibold text-gray-600">Selecciona un recurs</h3>
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

  const handleSearchClick = (mode: 'item' | 'global') => {
    if (!onSearchRequest) return;
    
    setIsSearchMenuOpen(false);
    
    const basePrompt = `Tema: "${item.title}". Descripció: "${item.description}".`;
    
    let finalQuery = '';

    if (mode === 'global' && globalContext) {
      // Create a focused prompt utilizing the global context
      // We truncate slightly to ensure we don't hit hard prompt limits if context is massive, 
      // though Gemini 3 handles large contexts well.
      finalQuery = `
      Actua com a investigador expert. Tinc la següent documentació de referència del curs (CONTEXT GLOBAL):
      "${globalContext.slice(0, 4000)}..."
      
      TASCA: Utilitzant Google Search, busca informació externa, exemples i recursos que siguin RELLEVANTS i COMPLEMENTARIS a aquest context global, específicament sobre el tema:
      ${basePrompt}
      `;
    } else {
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

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`p-3 rounded-lg ${
              item.type === ItemType.QUIZ ? 'bg-pink-100 text-pink-600' :
              item.type === ItemType.ASSIGNMENT ? 'bg-purple-100 text-purple-600' :
              item.type === ItemType.FORUM ? 'bg-yellow-100 text-yellow-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              <Icon size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{item.title}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {item.type}
                </span>
                {generatedContent && (
                   <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center">
                     <Check size={10} className="mr-1" /> Guardat
                   </span>
                )}
              </div>
              <p className="mt-3 text-gray-600 leading-relaxed">{item.description}</p>
            </div>
          </div>
          
          {/* Action Button: Google Search Grounding with Split Button */}
          {onSearchRequest && (
            <div className="flex ml-4 relative" ref={searchMenuRef}>
              <button
                onClick={() => handleSearchClick('item')}
                className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm ${hasGlobalContext ? 'rounded-l-lg border-r border-blue-800' : 'rounded-lg'}`}
                title="Cerca informació sobre aquest element a Google"
              >
                <Globe size={18} />
                <span className="hidden sm:inline">Investigar</span>
              </button>
              
              {hasGlobalContext && (
                <button
                  onClick={() => setIsSearchMenuOpen(!isSearchMenuOpen)}
                  className="px-2 bg-blue-600 text-white hover:bg-blue-700 rounded-r-lg transition-colors shadow-sm flex items-center justify-center"
                  title="Opcions de cerca avançada"
                >
                  <ChevronDown size={16} />
                </button>
              )}

              {/* Dropdown Menu */}
              {isSearchMenuOpen && hasGlobalContext && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                   <div className="p-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                     Àmbit de la cerca
                   </div>
                   <button 
                     onClick={() => handleSearchClick('item')}
                     className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center"
                   >
                     <Globe size={16} className="mr-3 text-gray-400" />
                     <div>
                       <span className="font-medium block">Només l'element actual</span>
                       <span className="text-xs text-gray-500">Cerca informació general sobre el títol</span>
                     </div>
                   </button>
                   <button 
                     onClick={() => handleSearchClick('global')}
                     className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center border-t border-gray-100"
                   >
                     <BookOpen size={16} className="mr-3 text-orange-500" />
                     <div>
                       <span className="font-medium block">Integrar Context Global</span>
                       <span className="text-xs text-gray-500">Creua la cerca amb la bibliografia del curs</span>
                     </div>
                   </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Section */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-700">Autocreador de Continguts (Gemini)</span>
            </div>
            <div className="flex items-center space-x-2">
              {generatedContent && !isLoading && (
                <button 
                  onClick={handleDeleteSaved}
                  className="flex items-center space-x-1 text-gray-400 hover:text-red-500 transition-colors mr-2 px-2 py-1 rounded hover:bg-red-50"
                  title="Esborrar contingut guardat"
                >
                  <Trash2 size={16} />
                  <span className="text-xs font-medium">Esborrar</span>
                </button>
              )}
              <button 
                onClick={() => setShowOptions(!showOptions)}
                className={`transition-colors ${showOptions ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'}`}
                title="Configuració de generació"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          {showOptions && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Context Info Banner */}
              {globalContext && (
                <div className="flex items-start p-3 bg-orange-50 border border-orange-100 rounded-md mb-3 text-xs text-orange-800">
                   <BookOpen size={14} className="mr-2 mt-0.5 flex-shrink-0" />
                   <span>
                     <strong>Bibliografia Activada:</strong> S'utilitzarà la documentació externa proporcionada ({globalContext.length} caràcters) com a font principal.
                   </span>
                </div>
              )}

              <div>
                <label className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <Info size={12} className="mr-1" />
                  Context Base (Automàtic)
                </label>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 italic">
                  "{item.promptContext}"
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instruccions de personalització (Opcional)
                </label>
                <textarea 
                  className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                  rows={2}
                  placeholder="Ex: Fes-ho més breu, afegeix exemples de pel·lícules actuals, utilitza un to més formal..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
             <div className="text-xs text-gray-400 hidden sm:block">
               Potenciat per Gemini 3 Flash Preview
             </div>
             <div className="flex space-x-2 w-full sm:w-auto justify-end">
                {generatedContent && !isLoading && (
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
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
                      ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
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

        <div className="flex-1 overflow-y-auto p-6 bg-white relative">
          {!generatedContent && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 opacity-60">
              <Sparkles className="w-12 h-12 text-gray-300" />
              <p className="text-center max-w-sm text-sm">
                Configura les instruccions a dalt i prem "Crear Contingut" per generar el material didàctic automàticament.
              </p>
            </div>
          )}
          
          {generatedContent && (
            <div className="prose prose-indigo prose-sm max-w-none text-gray-800">
               <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};