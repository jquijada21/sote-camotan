'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MensajeDev } from './zod';
import { getMensajesDev, eliminarMensajeDev } from './actions/mensajes';
import MensajeDevModal from './modals/MensajeDevModal';

const ESTADO_CONFIG = {
  Bajo: {
    label: 'Bajo',
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  Medio: {
    label: 'Medio',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  Alto: {
    label: 'Alto',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  Critico: {
    label: 'Crítico',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
} as const;

type NivelKey = keyof typeof ESTADO_CONFIG;

function formatFecha(fechaStr: string) {
  if (!fechaStr) return '—';
  return new Date(fechaStr).toLocaleString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IndexDev() {
  const [mensajes, setMensajes] = useState<MensajeDev[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MensajeDev | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cargarMensajes = useCallback(async () => {
    setLoading(true);
    const data = await getMensajesDev();
    setMensajes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarMensajes();
  }, [cargarMensajes]);

  const handleEliminar = (id: string) => {
    setEliminandoId(id);
    startTransition(async () => {
      await eliminarMensajeDev(id);
      await cargarMensajes();
      setEliminandoId(null);
    });
  };

  const handleEditar = (mensaje: MensajeDev) => {
    setEditando(mensaje);
    setModalOpen(true);
  };

  const handleNuevo = () => {
    setEditando(null);
    setModalOpen(true);
  };

  return (
    <div className="w-full mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
            Mensajes del Sistema
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestione avisos y notificaciones que se mostrarán en el sistema.
          </p>
        </div>
        <Button
          onClick={handleNuevo}
          className="gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo mensaje
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin mr-3" />
          <span className="text-sm">Cargando mensajes...</span>
        </div>
      ) : mensajes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"
        >
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-300 font-semibold">Sin mensajes configurados</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Crea el primer aviso del sistema.
            </p>
          </div>
          <Button onClick={handleNuevo} variant="outline" className="gap-2 mt-2">
            <Plus className="w-4 h-4" /> Crear mensaje
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {mensajes.map((m, i) => {
              const nivel = (m.estado as NivelKey) in ESTADO_CONFIG ? (m.estado as NivelKey) : 'Bajo';
              const cfg = ESTADO_CONFIG[nivel];
              const Icon = cfg.icon;
              const esEliminando = eliminandoId === m.id;

              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: esEliminando ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={`group relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border transition-all ${cfg.bg}`}
                >
                  {/* Icono de estado */}
                  <div className="flex-shrink-0">
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">
                        {m.titulo}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:font-bold [&_a]:text-blue-800 dark:[&_a]:text-blue-400 [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: m.mensaje?.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') || '' }}
                    />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Inicio: {formatFecha(m.fecha_inicio)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Fin: {formatFecha(m.fecha_fin)}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditar(m)}
                      disabled={esEliminando}
                      className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(m.id)}
                      disabled={esEliminando}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                      aria-label="Eliminar"
                    >
                      {esEliminando
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <MensajeDevModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={cargarMensajes}
        mensajeEditar={editando}
      />
    </div>
  );
}