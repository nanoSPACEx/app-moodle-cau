import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Save, Trash2, AlertCircle, Book, Loader2, ScanEye } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Define the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  globalContext: string;
  setGlobalContext: (context: string) => void;
}

export const SourceManager: React.FC<Props> = ({ isOpen, onClose, globalContext, setGlobalContext }) => {
  const [localText, setLocalText] = useState(globalContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sync local state when prop changes
  React.useEffect(() => {
    setLocalText(globalContext);
  }, [globalContext]);

  if (!isOpen) return null;

  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readPdfFile = async (file: File): Promise<string> => {
    let tesseractWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        // Update progress UI
        const percentage = Math.round((i / pdf.numPages) * 100);
        setProgress(percentage);
        setStatusMsg(`Processant pàgina ${i} de ${pdf.numPages} (${file.name})...`);

        // Yield to main thread to prevent UI freezing on large files
        await new Promise(resolve => setTimeout(resolve, 0));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract embedded text
        let pageText = textContent.items
          // @ts-ignore
          .map((item: any) => item.str)
          .join(' ');

        // HEURISTIC: If page has very little text (< 50 chars), assume it's an image/scan and try OCR
        // Increased threshold to catch pages with just page numbers or noise
        if (pageText.trim().length < 50) {
           setStatusMsg(`OCR: Analitzant imatge a pàgina ${i} de ${pdf.numPages}...`);
           
           // Initialize worker lazily and only once per file
           if (!tesseractWorker) {
             tesseractWorker = await createWorker(['cat', 'spa', 'eng']);
           }

           const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR accuracy
           const canvas = document.createElement('canvas');
           const context = canvas.getContext('2d');
           
           if (context) {
             canvas.height = viewport.height;
             canvas.width = viewport.width;

             await page.render({
                canvasContext: context,
                viewport: viewport
             }).promise;
            
             const { data: { text } } = await tesseractWorker.recognize(canvas);
             
             if (text.trim().length > 0) {
                pageText = `[OCR RESULT] ${text}`;
             }
           }
        }
        
        fullText += `\n--- Pàgina ${i} ---\n${pageText}`;
      }
      return fullText;
    } catch (error) {
      console.error("Error reading PDF:", error);
      throw new Error("No s'ha pogut llegir el PDF (Error de format o protecció).");
    } finally {
      // Clean up worker to free memory
      if (tesseractWorker) {
        await tesseractWorker.terminate();
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    
    let newText = '';
    let processedCount = 0;
    let errorCount = 0;

    const fileList = Array.from(files);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        let text = '';
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          text = await readPdfFile(file);
        } else {
          setStatusMsg(`Llegint ${file.name}...`);
          text = await readTextFile(file);
        }

        const separator = (localText || newText) ? '\n\n-------------------\n\n' : '';
        newText += `${separator}--- FITXER: ${file.name} ---\n${text}`;
        processedCount++;
      } catch (e) {
        console.error(e);
        errorCount++;
      }
    }

    setLocalText(prev => prev + newText);
    setIsProcessing(false);
    setProgress(0);
    
    if (errorCount > 0) {
      setStatusMsg(`${processedCount} fitxers afegits. ${errorCount} errors.`);
    } else {
      setStatusMsg(`${processedCount} fitxers afegits correctament.`);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    setGlobalContext(localText);
    setStatusMsg('Context guardat correctament.');
    setTimeout(() => {
      onClose();
      setStatusMsg('');
    }, 1000);
  };

  const handleClear = () => {
    if (confirm("Estàs segur que vols esborrar tot el context bibliogràfic?")) {
      setLocalText('');
      setGlobalContext('');
      setStatusMsg('Context esborrat.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
              <Book size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Fonts i Bibliografia</h2>
              <p className="text-sm text-gray-500">Afegeix documents (PDF, Text) per personalitzar la IA</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col space-y-2 text-sm text-blue-800">
            <div className="flex items-start space-x-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p>
                El text que afegeixis aquí serà utilitzat com a <strong>font prioritària</strong>. 
              </p>
            </div>
            <div className="flex items-start space-x-3 ml-1">
              <ScanEye size={16} className="flex-shrink-0 mt-0.5 opacity-70" />
              <p className="text-xs opacity-80">
                S'aplica OCR automàticament a pàgines escanejades (pot trigar una mica més).
              </p>
            </div>
          </div>

          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group relative overflow-hidden ${isProcessing ? 'pointer-events-none' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {isProcessing && (
              <div className="absolute inset-0 bg-white bg-opacity-80 z-10 flex flex-col items-center justify-center">
                 <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                 <p className="text-sm font-semibold text-indigo-700">{statusMsg}</p>
                 <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                   <div 
                     className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                     style={{ width: `${progress}%` }}
                   />
                 </div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".txt,.md,.csv,.json,.xml,.pdf" 
              multiple 
              onChange={handleFileUpload}
            />
            <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              Clica per pujar fitxers
            </p>
            <p className="text-xs text-gray-400 mt-1">Accepta PDF (amb OCR), TXT, MD, CSV</p>
          </div>

          {/* Text Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700 flex items-center">
                <FileText size={16} className="mr-2" />
                Contingut del Context
              </label>
              <span className="text-xs text-gray-400">
                {localText.length} caràcters
              </span>
            </div>
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              placeholder="El contingut dels fitxers apareixerà aquí. També pots escriure manualment."
              className="w-full h-64 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono custom-scrollbar resize-none"
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-between">
          <div className={`text-sm font-medium truncate max-w-[50%] ${statusMsg.includes('errors') || statusMsg.includes('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
            {!isProcessing && statusMsg}
          </div>
          <div className="flex space-x-3">
            {localText && (
              <button 
                onClick={handleClear}
                disabled={isProcessing}
                className="flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={18} className="mr-2" />
                Esborrar
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isProcessing}
              className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} className="mr-2" />
              Guardar i Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};