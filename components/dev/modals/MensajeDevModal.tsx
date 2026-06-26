'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertTriangle, Loader2, CheckCircle2, Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MensajeDev, MensajeDevFormData } from '../zod';
import { crearMensajeDev, editarMensajeDev } from '../actions/mensajes';

interface MensajeDevModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mensajeEditar?: MensajeDev | null;
}

const NIVELES = [
  { value: 'Bajo', label: 'Bajo', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'Medio', label: 'Medio', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'Alto', label: 'Alto', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'Critico', label: 'Crítico', color: 'bg-red-100 text-red-700 border-red-300' },
] as const;

type Nivel = typeof NIVELES[number]['value'];

const EMPTY_FORM: MensajeDevFormData = {
  titulo: '',
  mensaje: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'Bajo',
  activo: true,
};

// Helper para formatear fechas de la DB (ISO) al formato requerido por <input type="datetime-local" /> (YYYY-MM-DDTHH:mm)
// respetando la zona horaria local (Guatemala)
const formatForInput = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  // Ajustamos el desfase horario para obtener la fecha local en formato ISO
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localIso = new Date(d.getTime() - tzOffset).toISOString();
  return localIso.slice(0, 16); // Retorna YYYY-MM-DDTHH:mm
};

const RichTextEditor = ({ value, onChange, placeholder }: { value: string; onChange: (val: string) => void; placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState({ bold: false, italic: false, list: false, orderedList: false });

  const checkActive = () => {
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      list: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    onChange(editorRef.current?.innerHTML || '');
    checkActive();
  };

  const btnClass = (isActive: boolean) => 
    `p-1.5 rounded transition-colors ${isActive ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`;

  return (
    <div className="w-full flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus-within:ring-2 focus-within:ring-gray-500 transition-all text-sm overflow-hidden">
      <div className="flex items-center gap-1 p-1 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
        <button type="button" onClick={() => exec('bold')} className={btnClass(active.bold)} title="Negrita"><Bold className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec('italic')} className={btnClass(active.italic)} title="Cursiva"><Italic className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onClick={() => exec('insertUnorderedList')} className={btnClass(active.list)} title="Viñetas"><List className="w-4 h-4" /></button>
        <button type="button" onClick={() => exec('insertOrderedList')} className={btnClass(active.orderedList)} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></button>
      </div>
      <div
        ref={editorRef}
        className="rich-editor p-4 min-h-[120px] focus:outline-none max-h-[300px] overflow-y-auto [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-800 dark:[&_a]:text-blue-400 [&_a]:font-bold [&_a]:underline"
        contentEditable
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        onInput={(e) => { onChange(e.currentTarget.innerHTML); checkActive(); }}
        onKeyUp={checkActive}
        onMouseUp={checkActive}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text/plain').trim();
          if (/^https?:\/\/[^\s]+$/.test(text)) {
            e.preventDefault();
            document.execCommand('insertHTML', false, `<a href="${text}">${text}</a>`);
          }
        }}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default function MensajeDevModal({
  isOpen,
  onClose,
  onSuccess,
  mensajeEditar,
}: MensajeDevModalProps) {
  const [form, setForm] = useState<MensajeDevFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    if (mensajeEditar) {
      setForm({
        titulo: mensajeEditar.titulo,
        mensaje: mensajeEditar.mensaje,
        fecha_inicio: formatForInput(mensajeEditar.fecha_inicio),
        fecha_fin: formatForInput(mensajeEditar.fecha_fin),
        estado: mensajeEditar.estado,
        activo: mensajeEditar.activo,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
    setSuccess(false);
  }, [isOpen, mensajeEditar]);

  const handleSubmit = () => {
    setError(null);

    startTransition(async () => {
      // Convertimos las fechas locales del input a ISO strings con zona horaria real antes de enviar
      const payload: MensajeDevFormData = {
        ...form,
        fecha_inicio: new Date(form.fecha_inicio).toISOString(),
        fecha_fin: new Date(form.fecha_fin).toISOString(),
      };

      const result = mensajeEditar
        ? await editarMensajeDev(mensajeEditar.id, payload)
        : await crearMensajeDev(payload);

      if (!result.ok) {
        setError(result.error || 'Ocurrió un error.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    });
  };

  const set = (key: keyof MensajeDevFormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggle = (key: keyof MensajeDevFormData) =>
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full h-full md:h-auto max-h-[100dvh] md:max-h-[90vh] md:max-w-2xl md:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {mensajeEditar ? 'Editar mensaje' : 'Nuevo mensaje del sistema'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Se mostrará en el sistema según las fechas configuradas
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Título */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  placeholder="Ej: Sistema en mantenimiento"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all text-sm"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Mensaje <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={form.mensaje}
                  onChange={(val) => set('mensaje', val)}
                  placeholder="Ej: El sistema estará en mantenimiento..."
                />
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                    Fecha inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_inicio}
                    onChange={(e) => set('fecha_inicio', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                    Fecha fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_fin}
                    onChange={(e) => set('fecha_fin', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Nivel de Importancia */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Nivel de Importancia <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {NIVELES.map((n) => (
                    <button
                      key={n.value}
                      type="button"
                      onClick={() => set('estado', n.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.estado === n.value
                          ? `${n.color} scale-105 shadow-sm`
                          : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
            </div>
              </div>

              {/* Activo */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Activo</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Si está desactivado, el mensaje no se mostrará aunque esté dentro del rango de fechas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle('activo')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    form.activo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={form.activo}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      form.activo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isPending}
                className="text-gray-600 dark:text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || success}
                className={`gap-2 min-w-[120px] transition-all ${
                  success
                    ? 'bg-emerald-500 hover:bg-emerald-500'
                    : 'bg-gray-900 dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700'
                }`}
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : success ? (
                  <><CheckCircle2 className="w-4 h-4" /> Guardado</>
                ) : (
                  <><Save className="w-4 h-4" /> {mensajeEditar ? 'Actualizar' : 'Guardar'}</>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
