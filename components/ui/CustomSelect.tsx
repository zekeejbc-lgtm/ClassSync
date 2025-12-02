
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Plus } from 'lucide-react';

export interface Option {
  value: string;
  label: string;
  color?: string; // Optional hex or tailwind class for badges
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ReactNode;
  allowCreate?: boolean; // If true, allows adding new items
  searchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  icon,
  allowCreate = false,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreate = () => {
    if (searchTerm.trim()) {
      onChange(searchTerm.trim()); // Pass the custom value
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {label && <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all duration-200
          ${isOpen 
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-white dark:bg-stone-800' 
            : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400'}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-stone-400">{icon}</span>}
          {selectedOption ? (
             <span className="text-stone-800 dark:text-stone-100 font-medium">{selectedOption.label}</span>
          ) : value && allowCreate ? (
             <span className="text-stone-800 dark:text-stone-100 font-medium">{value}</span>
          ) : (
             <span className="text-stone-400 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-xl overflow-hidden animate-in">
          {(searchable || allowCreate) && (
            <div className="p-2 border-b border-stone-100 dark:border-stone-800">
               <div className="relative">
                 <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
                 <input
                    type="text"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm outline-none text-stone-800 dark:text-stone-200"
                    placeholder={allowCreate ? "Search or create..." : "Search..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
            </div>
          )}
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`
                    px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between text-sm transition-colors
                    ${value === opt.value 
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium' 
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}
                  `}
                >
                  <span className="flex items-center gap-2">
                      {opt.color && <span className={`w-2 h-2 rounded-full ${opt.color}`}></span>}
                      {opt.label}
                  </span>
                  {value === opt.value && <Check size={14} />}
                </div>
              ))
            ) : (
                !allowCreate && <div className="p-3 text-center text-xs text-stone-400">No options found.</div>
            )}

            {allowCreate && searchTerm && !filteredOptions.find(o => o.label.toLowerCase() === searchTerm.toLowerCase()) && (
              <div 
                onClick={handleCreate}
                className="px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                 <Plus size={14} />
                 <span>Create "{searchTerm}"</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
