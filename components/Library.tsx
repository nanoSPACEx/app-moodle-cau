import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Download, Trash2, FileText, Search, Database, RefreshCw, Check, Filter, CheckCircle2, ChevronDown, FileJson } from 'lucide-react';
import { COURSE_DATA } from '../constants';
import { ItemType } from '../types';
import { CourseItem } from '../types';
import ReactMarkdown from 'react-markdown';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportContext?: (context: string) => void;
}

interface LibraryItem {
  id: string;
  title: string;
  type: ItemType | 'unknown';
  content: string;
  timestamp: number;
}

const TYPE_LABELS: Record<string, string> = {
  [ItemType.FORUM]: 'Fòrum',
  [ItemType.PAGE]: 'Pàgina',
  [ItemType.GLOSSARY]: 'Glossari',
  [ItemType.FOLDER]: 'Carpeta',
  [ItemType.QUIZ]: 'Qüestionari',
  [ItemType.ASSIGNMENT]: 'Tasca',
  [ItemType.URL]: 'Enllaç / URL',
  [ItemType.FILE]: 'Fitxer / Recurs',
  'unknown': 'Desconegut'
};

export const Library: React.FC<Props> = ({ isOpen, onClose, onImportContext }) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [importStatus, setImportStatus] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Helper to find title and type based on ID
  const findItemMetadata = (id: string): { title: string; type: ItemType | 'unknown' } => {
    // Check General
    const genItem = COURSE_DATA.general.items.find(i => i.id === id);
    if (genItem) return { title: genItem.title, type: genItem.type };

    // Check Units
    for (const unit of COURSE_DATA.units) {
      const uItem = unit.items.find(i => i.id === id);
      if (uItem) return { title: uItem.title, type: uItem.type };
    }
    return { title: "Element Desconegut (ID antic)", type: 'unknown' };
  };

  // Load items from COURSE_DATA and LocalStorage
  const loadItems = () => {
    const allItems: LibraryItem[] = [];
    const processedIds = new Set<string>();

    const addItem = (id: string, title: string, type: ItemType | 'unknown', content: string) => {
       allItems.push({
          id,
          title,
          type,
          content,
          timestamp: Date.now()
       });
       processedIds.add(id);
    };

    // 1. Load from Course Structure
    COURSE_DATA.general.items.forEach(i => {
       const content = localStorage.getItem(`moodle_content_${i.id}`) || '';
       addItem(i.id, i.title, i.type, content);
    });

    COURSE_DATA.units.forEach(u => {
       u.items.forEach(i => {
          const content = localStorage.getItem(`moodle_content_${i.id}`) || '';
          addItem(i.id, i.title, i.type, content);
       });
    });

    // 2. Check for orphans in LocalStorage (items generated but removed from structure, or from backups)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('moodle_content_')) {
        const id = key.replace('moodle_content_', '');
        if (!processedIds.has(id)) {
          const content = localStorage.getItem(key) || '';
          const metadata = findItemMetadata(id);
          addItem(id, metadata.title, metadata.type, content);
        }
      }
    }
    
    setItems(allItems);
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
      setSelectedItem(null);
      setImportStatus('');
      setFilterType('all');
      setIsExportMenuOpen(false);
    }
  }, [isOpen]);

  // Click outside listener for export menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (typeFilter: string = 'all') => {
    let itemsToExport = items.filter(i => i.content && i.content.trim().length > 0);
    
    if (typeFilter !== 'all') {
      itemsToExport = itemsToExport.filter(i => i.type === typeFilter);
    }

    if (itemsToExport.length === 0) {
      alert("No hi ha contingut generat per exportar amb aquest criteri.");
      return;
    }

    const dataToExport = {
      version: 1,
      date: new Date().toISOString(),
      type: typeFilter,
      globalContext: localStorage.getItem('moodle_global_context') || undefined,
      items: itemsToExport.map(i => ({ id: i.id, content: i.content }))
    };

    const suffix = typeFilter === 'all' ? 'full' : typeFilter;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moodle_library_${suffix}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExportMenuOpen(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.items && Array.isArray(json.items)) {
          let count = 0;
          json.items.forEach((item: any) => {
            if (item.id && item.content) {
              localStorage.setItem(`moodle_content_${item.id}`, item.content);
              count++;
            }
          });
          
          let contextMsg = "";
          if (json.globalContext && typeof json.globalContext === 'string') {
             localStorage.setItem('moodle_global_context', json.globalContext);
             if (onImportContext) onImportContext(json.globalContext);
             contextMsg = " + Context global restaurat.";
          }

          setImportStatus(`${count} elements importats correctament.${contextMsg}`);
          loadItems(); // Refresh list to show new content
        } else {
          setImportStatus("Format de fitxer invàlid.");
        }
      } catch (err) {
        console.error(err);
        setImportStatus("Error en llegir el fitxer JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    if (confirm("Estàs segur? S'esborrarà el contingut generat per a aquest element.")) {
      localStorage.removeItem(`moodle_content_${id}`);
      loadItems(); // Reloads list; item remains but content is empty
      if (selectedItem?.id === id) {
        setSelectedItem(prev => prev ? { ...prev, content: '' } : null);
      }
    }
  };

  const filteredItems = items.filter(i => {
    const matchesText = i.title.toLowerCase().includes(filterText.toLowerCase()) || 
                        i.content.toLowerCase().includes(filterText.toLowerCase());
    const matchesType = filterType === 'all' || i.type === filterType;
    return matchesText && matchesType;
  });

  const generatedCount = items.filter(i => i.content && i.content.length > 0).length;

  // Get types that actually have content to show in export menu
  const typesWithContent = Array.from(new Set(
    items.filter(i => i.content && i.content.length > 0).map(i => i.type)
  ));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-300">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Biblioteca de Continguts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Gestiona el progrés: {generatedCount} de {items.length} elements generats.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 gap-4">
          
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Filtrar per text..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 dark:text-white outline-none transition-colors"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>

            {/* Type Filter Dropdown */}
            <div className="relative w-full sm:w-48">
              <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
                 <Filter size={16} />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 dark:text-white outline-none appearance-none cursor-pointer transition-colors"
              >
                <option value="all">Tots els tipus</option>
                <option disabled>──────────</option>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                   key !== 'unknown' && <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-3 text-gray-400 pointer-events-none text-[10px]">
                ▼
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full xl:w-auto justify-end">
            <div className="text-sm text-gray-500 dark:text-gray-400 mr-2 whitespace-nowrap hidden sm:block">
              {filteredItems.length} elements
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleFileChange} 
            />
            
            <button 
              onClick={handleImportClick}
              className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
              title="Carregar còpia de seguretat"
            >
              <Upload size={16} className="mr-2" />
              Importar JSON
            </button>
            
            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
                title="Opcions d'exportació"
              >
                <Download size={16} className="mr-2" />
                Exportar
                <ChevronDown size={14} className="ml-1 opacity-80" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                   <div className="p-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                     <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Format JSON</span>
                   </div>
                   
                   <button 
                     onClick={() => handleExport('all')}
                     className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex items-center"
                   >
                     <Database size={14} className="mr-2 opacity-70" />
                     Tot el contingut (Backup)
                   </button>

                   {typesWithContent.length > 0 && (
                     <>
                       <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                       <div className="px-4 py-1 text-[10px] text-gray-400 dark:text-gray-500 uppercase">Per Tipus</div>
                       {typesWithContent.map(type => (
                         <button 
                           key={type}
                           onClick={() => handleExport(type)}
                           className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
                         >
                           <FileJson size={14} className="mr-2 opacity-50" />
                           Només {TYPE_LABELS[type]}s
                         </button>
                       ))}
                     </>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Import Status Message */}
        {importStatus && (
           <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm flex items-center justify-center">
             <Check size={16} className="mr-2" /> {importStatus}
           </div>
        )}

        {/* Main Content: Split View */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sidebar List */}
          <div className="w-full sm:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-gray-900/50">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                <Database size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No s'han trobat elements.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredItems.map(item => {
                  const hasContent = item.content && item.content.trim().length > 0;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-white dark:hover:bg-gray-800 ${
                        selectedItem?.id === item.id 
                          ? 'bg-white dark:bg-gray-800 border-l-4 border-purple-500 shadow-sm' 
                          : 'border-l-4 border-transparent'
                      } ${!hasContent ? 'opacity-75' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-start overflow-hidden pr-2" title={hasContent ? "Contingut generat i guardat" : "Sense contingut"}>
                          {hasContent ? (
                             <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                          ) : (
                             <div className="w-4 h-4 mr-2 flex-shrink-0" /> 
                          )}
                          <h3 className={`font-medium text-sm truncate ${selectedItem?.id === item.id ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {item.title}
                          </h3>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap flex-shrink-0">
                          {TYPE_LABELS[item.type] || item.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 pl-6">
                         {hasContent ? item.content.slice(0, 80).replace(/[#*_]/g, '') + '...' : <span className="italic opacity-50">Sense contingut generat</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Pane */}
          <div className="hidden sm:flex flex-1 flex-col bg-white dark:bg-gray-900 overflow-hidden">
            {selectedItem ? (
              <>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center space-x-2 overflow-hidden pr-4">
                     <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex-shrink-0">
                        {TYPE_LABELS[selectedItem.type]}
                     </span>
                     <h3 className="font-bold text-gray-800 dark:text-white truncate">{selectedItem.title}</h3>
                  </div>
                  {selectedItem.content && (
                    <button 
                      onClick={() => handleDelete(selectedItem.id)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors flex-shrink-0"
                      title="Esborrar contingut"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                   {selectedItem.content ? (
                     <div className="prose prose-purple prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{selectedItem.content}</ReactMarkdown>
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-60">
                        <FileText size={48} className="mb-4" />
                        <p>No hi ha contingut generat per a aquest element.</p>
                        <p className="text-xs mt-2">Ves a l'editor principal per generar-lo amb IA.</p>
                     </div>
                   )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 p-8">
                <FileText size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecciona un element per veure'l</p>
                <p className="text-sm mt-2 max-w-xs text-center">
                  Aquí pots revisar tot el material que has generat sense haver d'anar unitat per unitat.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};