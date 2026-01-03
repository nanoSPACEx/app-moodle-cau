import React, { useState, useEffect } from 'react';
import { CourseItem, ItemType } from '../types';
import { ICON_MAP } from '../constants';
import { generateMoodleContent } from '../services/geminiService';
import { Sparkles, Loader2, Copy, Check, SlidersHorizontal, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  item: CourseItem | null;
}

export const CourseItemDetail: React.FC<Props> = ({ item }) => {
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showOptions, setShowOptions] = useState(true);

  // Reset content when item changes
  useEffect(() => {
    setGeneratedContent('');
    setIsLoading(false);
    setCustomInstructions('');
    setShowOptions(true);
  }, [item]);

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
    setGeneratedContent(''); // Clear previous
    
    await generateMoodleContent(
      item.title,
      item.promptContext,
      customInstructions,
      (chunk) => setGeneratedContent(chunk)
    );
    
    setIsLoading(false);
    setShowOptions(false); // Collapse options after generation to focus on content
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-start space-x-4">
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
            </div>
            <p className="mt-3 text-gray-600 leading-relaxed">{item.description}</p>
          </div>
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
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              title="Configuració de generació"
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {showOptions && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
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
            <div className="prose prose-indigo prose-sm max-w-none">
               <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};