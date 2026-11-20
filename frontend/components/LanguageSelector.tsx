"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Globe, MagnifyingGlass, Check, X } from '@phosphor-icons/react';
import { INDIAN_LANGUAGES, getLanguage, type LanguageInfo } from '@/lib/languages';
import { useLanguage } from '@/context/LanguageContext';

interface LanguageSelectorProps {
  currentCode?: string;
  onSelect?: (lang: LanguageInfo) => void;
  variant?: 'pill' | 'expanded' | 'minimal';
  className?: string;
}

export default function LanguageSelector({
  currentCode,
  onSelect,
  variant = 'pill',
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const selectedCode = currentCode || language;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedLang = getLanguage(selectedCode);

  const filteredLanguages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return INDIAN_LANGUAGES;
    return INDIAN_LANGUAGES.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.bcp47.toLowerCase().includes(q) ||
        l.script.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelectLanguage = async (lang: LanguageInfo) => {
    setIsOpen(false);
    setSearch('');
    await setLanguage(lang.code);
    onSelect?.(lang);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      {variant === 'pill' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-plum-900 border border-plum-900/10 hover:border-pink-300 shadow-sm transition-all text-xs sm:text-sm font-medium backdrop-blur-sm"
          title="Change language"
        >
          <Globe className="text-pink-600 w-4 h-4 shrink-0" weight="duotone" />
          <span className="font-semibold text-pink-700">{selectedLang.nativeName.split(' ')[0]}</span>
          <span className="text-plum-900/50 hidden sm:inline text-xs">({selectedLang.name})</span>
        </button>
      )}

      {variant === 'minimal' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 p-1.5 rounded-lg text-plum-900/70 hover:text-pink-600 hover:bg-pink-50 transition-colors text-xs"
          title={`Language: ${selectedLang.nativeName} (${selectedLang.name})`}
        >
          <Globe className="w-4 h-4 text-pink-500" />
          <span className="font-medium">{selectedLang.nativeName}</span>
        </button>
      )}

      {variant === 'expanded' && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-plum-900 flex items-center gap-1.5">
              <Globe className="text-pink-500 w-4 h-4" /> Active Language
            </span>
            <span className="text-xs text-pink-600 font-semibold px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200">
              {selectedLang.nativeName} ({selectedLang.name})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-black/10 bg-white hover:border-pink-300 transition-colors text-left text-sm"
          >
            <div>
              <p className="font-medium text-plum-900">{selectedLang.nativeName} — {selectedLang.name}</p>
            </div>
            <span className="text-xs text-pink-600 font-medium">Change</span>
          </button>
        </div>
      )}

      {/* Searchable Dropdown Overlay */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-72 sm:w-80 max-w-[90vw] right-0 sm:right-auto sm:left-0 rounded-2xl bg-white/95 backdrop-blur-xl border border-pink-100 shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header & Search */}
          <div className="relative mb-2">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-plum-900/40 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search languages…"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-plum-50/50 border border-plum-900/10 focus:border-pink-400 focus:bg-white text-xs sm:text-sm text-plum-900 placeholder:text-plum-900/40 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-plum-900/40 hover:text-plum-900 p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-plum-900/50 border-b border-black/5 mb-1">
            <span>8 Supported Languages</span>
            <span className="text-pink-600 font-medium">{filteredLanguages.length} available</span>
          </div>

          {/* Languages List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5 pr-1">
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-plum-900/50">
                No matching language found.
              </div>
            ) : (
              filteredLanguages.map(lang => {
                const isSelected = lang.code === selectedCode;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-pink-500 text-white font-medium shadow-sm'
                        : 'hover:bg-pink-50/80 text-plum-900'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{lang.nativeName}</span>
                        <span className={`text-xs ${isSelected ? 'text-pink-100' : 'text-plum-900/50'}`}>
                          ({lang.name})
                        </span>
                        {lang.direction === 'rtl' && (
                          <span className={`text-[9px] px-1 py-0.2 rounded uppercase ${isSelected ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            RTL
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check weight="bold" className="w-4 h-4 text-white shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

