import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is set
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
}

interface Props {
  file: File;
  onClose: () => void;
}

export const PdfViewer: React.FC<Props> = ({ file, onClose }) => {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(loadedPdf);
        setPageNum(1);
        setLoading(false);
      } catch (error) {
        console.error("Error loading PDF for viewer:", error);
        setLoading(false);
      }
    };
    loadPdf();
  }, [file]);

  // Render Page
  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pageNum);
  }, [pdfDoc, pageNum, scale]);

  const renderPage = async (num: number) => {
    if (!canvasRef.current || !pdfDoc) return;

    // Cancel previous render if any
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdfDoc.getPage(num);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error("Render error:", error);
      }
    }
  };

  const changePage = (offset: number) => {
    if (!pdfDoc) return;
    const newPage = pageNum + offset;
    if (newPage >= 1 && newPage <= pdfDoc.numPages) {
      setPageNum(newPage);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white border-b border-gray-800">
        <div className="flex items-center space-x-4">
           <div className="bg-red-500 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">PDF</div>
           <h3 className="font-medium text-sm truncate max-w-md">{file.name}</h3>
           <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
             {pdfDoc ? `${pageNum} / ${pdfDoc.numPages}` : '...'}
           </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Reduir Zoom">
            <ZoomOut size={20} />
          </button>
          <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Augmentar Zoom">
            <ZoomIn size={20} />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2"></div>
          <button onClick={onClose} className="p-2 hover:bg-red-600 rounded transition-colors" title="Tancar">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center overflow-auto bg-gray-800 p-8 custom-scrollbar">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-10 h-10 animate-spin mb-3 text-indigo-500" />
            <p>Carregant document...</p>
          </div>
        )}
        
        <div className="shadow-2xl">
          <canvas ref={canvasRef} className="rounded-sm bg-white block" />
        </div>

        {/* Floating Nav Buttons */}
        {!loading && pdfDoc && (
          <>
            <button 
              onClick={() => changePage(-1)}
              disabled={pageNum <= 1}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-indigo-600 text-white rounded-full disabled:opacity-30 transition-all shadow-lg backdrop-blur-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => changePage(1)}
              disabled={pageNum >= pdfDoc.numPages}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/80 hover:bg-indigo-600 text-white rounded-full disabled:opacity-30 transition-all shadow-lg backdrop-blur-sm"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
