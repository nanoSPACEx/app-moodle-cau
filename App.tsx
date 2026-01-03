import React, { useState } from 'react';
import { COURSE_DATA } from './constants';
import { CourseItem, CourseUnit, ItemType } from './types';
import { ICON_MAP } from './constants';
import { CourseItemDetail } from './components/CourseItemDetail';
import { ChevronRight, ChevronDown, GraduationCap, LayoutGrid } from 'lucide-react';

const UnitBlock: React.FC<{
  unit: CourseUnit;
  isActive: boolean;
  onToggle: () => void;
  selectedItemId: string | null;
  onSelectItem: (item: CourseItem) => void;
  colorClass: string;
}> = ({ unit, isActive, onToggle, selectedItemId, onSelectItem, colorClass }) => {
  return (
    <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 transition-colors ${isActive ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center space-x-3 text-left">
          <div className={`p-2 rounded-md ${colorClass} bg-opacity-20 text-gray-700`}>
             {isActive ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-gray-800">{unit.title}</h3>
            {isActive && <p className="text-xs text-gray-500 mt-1">{unit.description}</p>}
          </div>
        </div>
      </button>

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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
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
        <div className="hidden md:flex items-center space-x-4 text-sm text-gray-500">
           <span className="flex items-center"><LayoutGrid size={16} className="mr-1"/> 8 Blocs</span>
           <span className="px-2">|</span>
           <span>React 18 + Gemini 2.0</span>
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
            <CourseItemDetail item={selectedItem} />
          </div>
        </section>

      </main>
    </div>
  );
}