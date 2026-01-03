import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Globe, Send, Loader2, ExternalLink, Bot, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { searchWithGrounding, getChatSession, SearchResult } from '../services/geminiService';
import { Chat } from "@google/genai";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const AiAssistant: React.FC<Props> = ({ isOpen, onClose, initialQuery }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'search'>('chat');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Initialize Chat Session once
  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = getChatSession();
      // Add initial greeting
      setChatMessages([{
        role: 'model',
        text: "Hola! Sóc el teu tutor virtual de Cultura Audiovisual. En què et puc ajudar avui? Podem parlar sobre cinema, tècniques fotogràfiques, anàlisi d'imatge..."
      }]);
    }
  }, []);

  // Handle Initial Query (Contextual Search)
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim() !== '') {
      setActiveTab('search');
      setSearchInput(initialQuery);
      performSearch(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: userMsg });
      setChatMessages(prev => [...prev, { role: 'model', text: result.text || "No he pogut generar una resposta." }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Ho sento, hi ha hagut un error de connexió." }]);
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearchLoading(true);
    setSearchResult(null);

    try {
      const result = await searchWithGrounding(query);
      setSearchResult(result);
    } catch (error) {
      console.error(error);
      setSearchResult({ text: "Error realitzant la cerca. Si us plau, revisa la teva connexió o API key.", sources: [] });
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSearchClick = () => {
    performSearch(searchInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-indigo-900 text-white">
        <div className="flex items-center space-x-2">
          <Bot size={24} className="text-indigo-300" />
          <div>
            <h2 className="font-bold text-lg">Assistent IA</h2>
            <p className="text-xs text-indigo-200">Gemini 3 Pro & Google Search</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-indigo-800 rounded transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
            activeTab === 'chat' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <MessageSquare size={16} />
          <span>Xat Tutor</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
            activeTab === 'search' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Globe size={16} />
          <span>Cerca Web</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
        
        {/* --- CHAT TAB --- */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  }`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                   <div className="bg-white border border-gray-200 rounded-lg p-3 rounded-bl-none shadow-sm">
                     <Loader2 size={20} className="animate-spin text-indigo-500" />
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escriu el teu dubte..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isChatLoading}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* --- SEARCH TAB --- */}
        {activeTab === 'search' && (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-white border-b border-gray-200">
               <div className="relative">
                 <input
                   type="text"
                   value={searchInput}
                   onChange={(e) => setSearchInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                   placeholder="Ex: Què és el pla seqüència?"
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
                 <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
                 <button 
                   onClick={handleSearchClick}
                   disabled={isSearchLoading || !searchInput.trim()}
                   className="absolute right-2 top-1.5 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                 >
                   Cercar
                 </button>
               </div>
               <p className="text-xs text-gray-500 mt-2 flex items-center">
                 <Globe size={12} className="mr-1" />
                 Cerca en temps real amb Google Grounding
               </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isSearchLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                   <Loader2 size={32} className="animate-spin mb-2 text-indigo-500" />
                   <p className="text-sm">Connectant amb Google...</p>
                </div>
              ) : searchResult ? (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 prose prose-sm max-w-none">
                     <h3 className="text-gray-900 font-semibold mb-2 flex items-center">
                       <Bot size={18} className="mr-2 text-indigo-500" />
                       Resposta Generada
                     </h3>
                     <ReactMarkdown>{searchResult.text}</ReactMarkdown>
                  </div>

                  {searchResult.sources.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Fonts d'informació</h4>
                      <div className="space-y-2">
                        {searchResult.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all group"
                          >
                            <div className="bg-indigo-50 p-2 rounded text-indigo-600 mr-3 group-hover:bg-indigo-100">
                              <ExternalLink size={16} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium text-gray-800 truncate">{source.title}</p>
                              <p className="text-xs text-gray-500 truncate">{source.uri}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                 <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                    <Search size={48} className="mb-4" />
                    <p className="text-sm text-center max-w-xs">
                      Fes una cerca per obtenir informació actualitzada i fonts rellevants sobre el temari.
                    </p>
                 </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};