'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Info, AlertCircle, ShieldAlert } from 'lucide-react';
import { MensajeDev } from './zod';

const NIVEL_CONFIG: Record<string, { icon: typeof AlertTriangle; bg: string; border: string; text: string; accent: string }> = {
  Bajo: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    accent: 'text-blue-500',
  },
  Medio: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    accent: 'text-amber-500',
  },
  Alto: {
    icon: AlertCircle,
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-800 dark:text-orange-200',
    accent: 'text-orange-500',
  },
  Critico: {
    icon: ShieldAlert,
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    accent: 'text-red-500',
  },
};

const DEFAULT_CONFIG = NIVEL_CONFIG.Bajo;

export default function DevBanner({ initialMensajes = [] }: { initialMensajes?: MensajeDev[] }) {
  const [mensajes, setMensajes] = useState<MensajeDev[]>(initialMensajes);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());

  const visibles = mensajes.filter((m) => !cerrados.has(m.id));

  if (visibles.length === 0) return null;

  return (
    <div className="w-full space-y-0">
      <AnimatePresence>
        {visibles.map((m) => {
          const cfg = NIVEL_CONFIG[m.estado] || DEFAULT_CONFIG;
          const Icon = cfg.icon;

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className={`${cfg.bg} ${cfg.border} border-b`}
            >
              <div className="w-full flex items-center gap-3 px-4 py-2.5">
                <Icon className={`w-4 h-4 flex-shrink-0 ${cfg.accent}`} />
                <div className={`flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm ${cfg.text}`}>
                  <span className="font-bold">{m.titulo}</span>
                  <span className="hidden sm:inline opacity-40">—</span>
                  <div 
                    className="opacity-80 text-xs sm:text-sm [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:underline [&_a]:font-bold [&_a]:text-blue-800 dark:[&_a]:text-blue-400 inline-block [&_p]:inline" 
                    dangerouslySetInnerHTML={{ __html: m.mensaje?.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') || '' }} 
                  />
                </div>
                <button
                  onClick={() => setCerrados((prev) => new Set(prev).add(m.id))}
                  className={`p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0 ${cfg.accent}`}
                  aria-label="Cerrar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
