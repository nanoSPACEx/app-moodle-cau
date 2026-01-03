import React, { useState } from 'react';
import { COURSE_DATA } from './constants';
import { CourseItem, CourseUnit, ItemType } from './types';
import { ICON_MAP } from './constants';
import { CourseItemDetail } from './components/CourseItemDetail';
import { SourceManager } from './components/SourceManager';
import { AiAssistant } from './components/AiAssistant';
import { generateCoursePDF, generateUnitPDF } from './services/pdfExporter';
import { ChevronRight, ChevronDown, GraduationCap, LayoutGrid, Book, Database, Download, Loader2, FileDown, Bot } from 'lucide-react';

const UnitBlock: React.FC<{
  unit: CourseUnit;
  isActive: boolean;
  onToggle: () => void;
  selectedItemId: string | null;
  onSelectItem: (item: CourseItem) => void;
  colorClass: string;
}> = ({ unit, isActive, onToggle, selectedItemId, onSelectItem, colorClass }) => {
  
  const handleUnitDownload = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling the accordion
    generateUnitPDF(unit);
  };

  return (
    <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 transition-colors cursor-pointer ${isActive ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center space-x-3 text-left overflow-hidden">
          <div className={`p-2 rounded-md ${colorClass} bg-opacity-20 text-gray-700 flex-shrink-0`}>
             {isActive ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
          <div className="truncate">
            <h3 className="font-bold text-gray-800 truncate">{unit.title}</h3>
            {isActive && <p className="text-xs text-gray-500 mt-1 truncate">{unit.description}</p>}
          </div>
        </div>
        
        <button 
          onClick={handleUnitDownload}
          className="ml-2 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
          title={`Descarregar PDF de: ${unit.title}`}
        >
          <FileDown size={18} />
        </button>
      </div>

      {isActive && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {unit.items.map((item) => {
            const Icon = ICON_MAP[item.type];
            const isSelected = selectedItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-sm transition-all border-l-4 ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900' 
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-indigo-600' : 'text-gray-400'} />
                <span className="font-medium truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeUnitId, setActiveUnitId] = useState<string>('general');
  const [selectedItem, setSelectedItem] = useState<CourseItem | null>(null);
  
  // Global Context State (Bibliography/Sources)
  const [globalContext, setGlobalContext] = useState<string>('');
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    // Use timeout to allow UI to render loading state before sync heavy task
    setTimeout(() => {
      try {
        generateCoursePDF();
      } catch (e) {
        console.error("Error generating PDF", e);
        alert("Hi ha hagut un error generant el PDF.");
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 100);
  };

  const handleContextualSearch = (query: string) => {
    setAssistantQuery(query);
    setIsAssistantOpen(true);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 relative">
      <SourceManager 
        isOpen={isSourceManagerOpen} 
        onClose={() => setIsSourceManagerOpen(false)}
        globalContext={globalContext}
        setGlobalContext={setGlobalContext}
      />

      <AiAssistant 
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        initialQuery={assistantQuery}
      />

      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Moodle Architect</h1>
            <p className="text-xs text-gray-500">Disseny de Curs: Cultura Audiovisual</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
           {/* Export PDF Button */}
           <button 
             onClick={handleDownloadPdf}
             disabled={isGeneratingPdf}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
               isGeneratingPdf 
                 ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                 : 'bg-gray-800 hover:bg-gray-900 text-white'
             }`}
             title="Descarregar tot el curs com a llibre PDF"
           >
             {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
             <span className="hidden lg:inline">
               {isGeneratingPdf ? 'Generant...' : 'eBook'}
             </span>
           </button>

           <div className="h-6 w-px bg-gray-200 mx-1"></div>

           {/* AI Assistant Button */}
           <button 
             onClick={() => setIsAssistantOpen(true)}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
               isAssistantOpen
                 ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                 : 'bg-white border-gray-300 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
             }`}
           >
             <Bot size={18} />
             <span className="hidden sm:inline">Assistent IA</span>
           </button>

           {/* Source Manager Button */}
           <button 
             onClick={() => setIsSourceManagerOpen(true)}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
               globalContext.length > 0 
                ? 'bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200' 
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
             }`}
           >
             <Book size={18} />
             <span className="hidden lg:inline">Fonts</span>
             {globalContext.length > 0 && (
               <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                 ON
               </span>
             )}
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Course Tree */}
        <aside className="w-full md:w-96 bg-gray-100 border-r border-gray-200 overflow-y-auto custom-scrollbar p-4 flex-shrink-0">
          <div className="mb-6 px-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Estructura del Curs</h2>
            
            {/* General Section */}
            <UnitBlock 
              unit={COURSE_DATA.general}
              isActive={activeUnitId === 'general'}
              onToggle={() => setActiveUnitId(activeUnitId === 'general' ? '' : 'general')}
              selectedItemId={selectedItem?.id || null}
              onSelectItem={setSelectedItem}
              colorClass="bg-emerald-100 text-emerald-700"
            />

            <div className="my-4 border-t border-gray-200"></div>

            {/* Units */}
            {COURSE_DATA.units.map((unit) => (
              <UnitBlock 
                key={unit.id}
                unit={unit}
                isActive={activeUnitId === unit.id}
                onToggle={() => setActiveUnitId(activeUnitId === unit.id ? '' : unit.id)}
                selectedItemId={selectedItem?.id || null}
                onSelectItem={setSelectedItem}
                colorClass="bg-blue-100 text-blue-700"
              />
            ))}
          </div>
        </aside>

        {/* Right Content: Details & AI */}
        <section className="flex-1 overflow-hidden relative bg-slate-50 p-4 md:p-8">
          <div className="max-w-4xl mx-auto h-full">
            <CourseItemDetail 
              item={selectedItem} 
              globalContext={globalContext}
              onSearchRequest={handleContextualSearch}
            />
          </div>
        </section>

      </main>
    </div>
  );
}