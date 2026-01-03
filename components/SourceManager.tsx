import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Save, Trash2, AlertCircle, Book, Loader2, ScanEye, Eye, File as FileIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { PdfViewer } from './PdfViewer';

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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileToView, setFileToView] = useState<File | null>(null);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  
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

  /**
   * Pre-process image data to improve OCR accuracy.
   */
  const preprocessCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 160; 

    for (let i = 0; i < data.length; i += 4) {
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = avg > threshold ? 255 : 0;
      data[i] = val; 
      data[i + 1] = val; 
      data[i + 2] = val; 
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const readPdfFile = async (file: File): Promise<string> => {
    let tesseractWorker: Awaited<ReturnType<typeof createWorker>> | null = null;
    let fullText = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const percentage = Math.round((i / pdf.numPages) * 100);
        setProgress(percentage);
        
        // Wrap specific page processing in try/catch to ensure continuity
        try {
            setStatusMsg(`Processant pàgina ${i} de ${pdf.numPages} (${file.name})...`);
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageText = textContent.items
              // @ts-ignore
              .map((item: any) => item.str)
              .join(' ');

            if (pageText.trim().length < 50) {
              setStatusMsg(`OCR: Millorant imatge i analitzant pàgina ${i}...`);
              
              try {
                if (!tesseractWorker) {
                  tesseractWorker = await createWorker(['cat', 'spa', 'eng']);
                }

                const viewport = page.getViewport({ scale: 2.5 }); 
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { willReadFrequently: true });
                
                if (context) {
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;

                  await page.render({
                      canvasContext: context,
                      viewport: viewport
                  }).promise;
                  
                  preprocessCanvas(canvas, context);
                  setOcrPreviewUrl(canvas.toDataURL('image/jpeg', 0.8));

                  const { data: { text } } = await tesseractWorker.recognize(canvas);
                  
                  if (text.trim().length > 0) {
                      pageText = `[OCR RESULT] ${text}`;
                  } else {
                      pageText = `[Pàgina ${i}: Sense text detectat]`;
                  }
                }
              } catch (ocrError: any) {
                console.error(`Error OCR a la pàgina ${i}:`, ocrError);
                const errorMsg = ocrError?.message || "Error desconegut";
                setStatusMsg(`⚠️ Error OCR Pàgina ${i}: ${errorMsg.slice(0, 30)}... Continuant.`);
                pageText = `[ERROR OCR PÀGINA ${i}: No s'ha pogut processar la imatge. Motiu: ${errorMsg}]`;
              }
            }
            
            fullText += `\n--- Pàgina ${i} ---\n${pageText}`;

        } catch (pageError: any) {
            console.error(`Error general a la pàgina ${i}:`, pageError);
            setStatusMsg(`⚠️ Error llegint Pàgina ${i}. Saltant...`);
            fullText += `\n--- Pàgina ${i} ---\n[ERROR CRÍTIC: No s'ha pogut llegir aquesta pàgina. Motiu: ${pageError?.message || 'Desconegut'}]`;
        }
      }
      return fullText;

    } catch (error) {
      console.error("Error global reading PDF:", error);
      throw new Error("No s'ha pogut inicialitzar la lectura del PDF. El fitxer podria estar malmès.");
    } finally {
      setOcrPreviewUrl(null);
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
    setOcrPreviewUrl(null);
    
    let newText = '';
    let processedCount = 0;
    let errorCount = 0;
    const newFiles: File[] = [];

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
        newFiles.push(file);
        processedCount++;
      } catch (e) {
        console.error(e);
        errorCount++;
      }
    }

    setLocalText(prev => prev + newText);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsProcessing(false);
    setProgress(0);
    setOcrPreviewUrl(null);
    
    if (errorCount > 0) {
      setStatusMsg(`${processedCount} fitxers afegits. ${errorCount} errors globals.`);
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
      setUploadedFiles([]);
      setStatusMsg('Context esborrat.');
    }
  };

  return (
    <>
      {fileToView && (
        <PdfViewer file={fileToView} onClose={() => setFileToView(null)} />
      )}
      
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 transition-colors">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                <Book size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Fonts i Bibliografia</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Afegeix documents (PDF, Text) per personalitzar la IA</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-lg p-4 flex flex-col space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <div className="flex items-start space-x-3">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <p>
                  El text que afegeixis aquí serà utilitzat com a <strong>font prioritària</strong>. 
                </p>
              </div>
              <div className="flex items-start space-x-3 ml-1">
                <ScanEye size={16} className="flex-shrink-0 mt-0.5 opacity-70" />
                <p className="text-xs opacity-80">
                  S'aplica OCR automàticament a pàgines escanejades. Es millora la imatge per llegir text petit.
                </p>
              </div>
            </div>

            {/* Upload Area */}
            <div 
              className={`border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group relative overflow-hidden ${isProcessing ? 'pointer-events-none' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-95 z-10 flex flex-col items-center justify-center p-6 text-center">
                   
                   {ocrPreviewUrl ? (
                     <div className="mb-3 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
                       <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1 tracking-wider">Escanejant document (B&N)</span>
                       <div className="p-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-lg rounded max-w-[150px]">
                        <img src={ocrPreviewUrl} alt="OCR Preview" className="h-24 w-auto object-contain rounded-sm opacity-90" />
                       </div>
                     </div>
                   ) : (
                     <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-2" />
                   )}

                   <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 animate-pulse">{statusMsg}</p>
                   
                   <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
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
              <div className="bg-white dark:bg-gray-700 p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Clica per pujar fitxers
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Accepta PDF (amb OCR), TXT, MD, CSV</p>
            </div>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                 <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Fitxers carregats ({uploadedFiles.length})</h4>
                 <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                   {uploadedFiles.map((f, idx) => (
                     <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                       <div className="flex items-center truncate flex-1 mr-2">
                         <FileIcon size={14} className="text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
                         <span className="truncate text-gray-700 dark:text-gray-300" title={f.name}>{f.name}</span>
                       </div>
                       {f.type === 'application/pdf' && (
                         <button 
                           onClick={() => setFileToView(f)}
                           className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2 py-1 rounded transition-colors flex-shrink-0"
                           title="Obrir visor PDF"
                         >
                           <Eye size={14} />
                           <span className="hidden sm:inline">Veure</span>
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            )}

            {/* Text Area */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                  <FileText size={16} className="mr-2" />
                  Contingut del Context (Extret)
                </label>
                <span className="text-xs text-gray-400">
                  {localText.length} caràcters
                </span>
              </div>
              <textarea
                value={localText}
                onChange={(e) => setLocalText(e.target.value)}
                placeholder="El contingut dels fitxers apareixerà aquí. També pots escriure manualment."
                className="w-full h-64 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono custom-scrollbar resize-none placeholder-gray-400 dark:placeholder-gray-500"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex items-center justify-between">
            <div className={`text-sm font-medium truncate max-w-[50%] ${statusMsg.includes('errors') || statusMsg.includes('Error') ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {!isProcessing && statusMsg}
            </div>
            <div className="flex space-x-3">
              {localText && (
                <button 
                  onClick={handleClear}
                  disabled={isProcessing}
                  className="flex items-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={18} className="mr-2" />
                  Esborrar
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={isProcessing}
                className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} className="mr-2" />
                Guardar i Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};