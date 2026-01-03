import React, { useState, useEffect } from 'react';
import { COURSE_DATA } from './constants';
import { CourseItem, CourseUnit, ItemType } from './types';
import { ICON_MAP } from './constants';
import { CourseItemDetail } from './components/CourseItemDetail';
import { SourceManager } from './components/SourceManager';
import { AiAssistant } from './components/AiAssistant';
import { Library } from './components/Library';
import { generateCoursePDF, generateUnitPDF } from './services/pdfExporter';
import { ChevronRight, ChevronDown, GraduationCap, LayoutGrid, Book, Database, Download, Loader2, FileDown, Bot, Moon, Sun } from 'lucide-react';

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
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      <div 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 transition-colors cursor-pointer ${
          isActive 
            ? 'bg-gray-50 dark:bg-gray-700/50' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
        }`}
      >
        <div className="flex items-center space-x-3 text-left overflow-hidden">
          <div className={`p-2 rounded-md ${colorClass} bg-opacity-20 dark:bg-opacity-20 text-gray-700 dark:text-gray-200 flex-shrink-0`}>
             {isActive ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
          <div className="truncate">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{unit.title}</h3>
            {isActive && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{unit.description}</p>}
          </div>
        </div>
        
        <button 
          onClick={handleUnitDownload}
          className="ml-2 p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all"
          title={`Descarregar PDF de: ${unit.title}`}
        >
          <FileDown size={18} />
        </button>
      </div>

      {isActive && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          {unit.items.map((item) => {
            const Icon = ICON_MAP[item.type];
            const isSelected = selectedItemId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`w-full flex items-center space-x-3 px-6 py-3 text-sm transition-all border-l-4 ${
                  isSelected 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200' 
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'} />
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
  // Initialize with all units expanded by default
  const [expandedUnits, setExpandedUnits] = useState<string[]>(() => {
    return ['general', ...COURSE_DATA.units.map(u => u.id)];
  });
  
  const [selectedItem, setSelectedItem] = useState<CourseItem | null>(null);
  
  // Global Context State (Bibliography/Sources)
  // Initialized from localStorage to persist across refreshes
  const [globalContext, setGlobalContext] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moodle_global_context') || '';
    }
    return '';
  });
  
  // Persist global context whenever it changes
  useEffect(() => {
    localStorage.setItem('moodle_global_context', globalContext);
  }, [globalContext]);

  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => 
      prev.includes(unitId) 
        ? prev.filter(id => id !== unitId) 
        : [...prev, unitId]
    );
  };

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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300 relative text-gray-900 dark:text-gray-100">
      <SourceManager 
        isOpen={isSourceManagerOpen} 
        onClose={() => setIsSourceManagerOpen(false)}
        globalContext={globalContext}
        setGlobalContext={setGlobalContext}
      />

      <Library 
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onImportContext={setGlobalContext}
      />

      <AiAssistant 
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        initialQuery={assistantQuery}
      />

      {/* Navbar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 shadow-sm transition-colors">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Moodle Architect</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Disseny de Curs: Cultura Audiovisual</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
           {/* Dark Mode Toggle */}
           <button
             onClick={toggleTheme}
             className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mr-2"
             title={isDarkMode ? "Canviar a mode clar" : "Canviar a mode fosc"}
           >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>

           <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

           {/* Export PDF Button */}
           <button 
             onClick={handleDownloadPdf}
             disabled={isGeneratingPdf}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
               isGeneratingPdf 
                 ? 'bg-gray-700 text-gray-300 cursor-not-allowed' 
                 : 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white'
             }`}
             title="Descarregar tot el curs com a llibre PDF"
           >
             {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
             <span className="hidden lg:inline">
               {isGeneratingPdf ? 'Generant...' : 'eBook'}
             </span>
           </button>

           <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
           
           {/* Library Button (New) */}
           <button 
             onClick={() => setIsLibraryOpen(true)}
             className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 border hover:border-purple-300 dark:hover:border-purple-700"
             title="Biblioteca i Còpies de Seguretat"
           >
             <Database size={18} />
             <span className="hidden sm:inline">Biblioteca</span>
           </button>

           {/* AI Assistant Button */}
           <button 
             onClick={() => setIsAssistantOpen(true)}
             className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
               isAssistantOpen
                 ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:border-indigo-700 dark:text-indigo-300'
                 : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600'
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
                ? 'bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-orange-900/60' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
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
        <aside className="w-full md:w-96 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 overflow-y-auto custom-scrollbar p-4 flex-shrink-0 transition-colors">
          <div className="mb-6 px-2">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Estructura del Curs</h2>
            
            {/* General Section */}
            <UnitBlock 
              unit={COURSE_DATA.general}
              isActive={expandedUnits.includes('general')}
              onToggle={() => toggleUnit('general')}
              selectedItemId={selectedItem?.id || null}
              onSelectItem={setSelectedItem}
              colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
            />

            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            {/* Units */}
            {COURSE_DATA.units.map((unit) => (
              <UnitBlock 
                key={unit.id}
                unit={unit}
                isActive={expandedUnits.includes(unit.id)}
                onToggle={() => toggleUnit(unit.id)}
                selectedItemId={selectedItem?.id || null}
                onSelectItem={setSelectedItem}
                colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
              />
            ))}
          </div>
        </aside>

        {/* Right Content: Details & AI */}
        <section className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-gray-950 p-4 md:p-8 transition-colors">
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