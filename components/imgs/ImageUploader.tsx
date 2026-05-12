"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Loader2, Upload, RefreshCw, Trash2, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

import { createClient } from "@/utils/supabase/client";

import ImageEditorModal from "./ImageEditorModal";

interface Props {
  bucketName: string;
  currentImagePath: string | null;
  onUploadSuccess: (newPath: string) => void | Promise<void>;
  onDeleteSuccess: () => void | Promise<void>;
  disabled?: boolean;
  signedUrlExpiresIn?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const COMPRESSION_OPTS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
} as const;

export default function ImageUploader({
  bucketName,
  currentImagePath,
  onUploadSuccess,
  onDeleteSuccess,
  disabled = false,
  signedUrlExpiresIn = 60 * 60,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchSignedUrl = async () => {
      if (!currentImagePath) {
        setPreviewUrl(null);
        return;
      }
      setPreviewLoading(true);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(currentImagePath, signedUrlExpiresIn);
      if (cancelled) return;
      if (error) {
        console.warn("No se pudo crear signed URL:", error.message);
        setPreviewUrl(null);
      } else {
        setPreviewUrl(data.signedUrl);
      }
      setPreviewLoading(false);
    };
    fetchSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [currentImagePath, bucketName, supabase, signedUrlExpiresIn]);

  const isLocked = disabled || isProcessing;

  const buildUniqueName = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const rand = Math.random().toString(36).slice(2, 10);
    return `${Date.now()}-${rand}.${ext}`;
  };

  const removeFromStorage = async (path: string) => {
    const { error } = await supabase.storage.from(bucketName).remove([path]);
    if (error) {
      console.warn("No se pudo eliminar el archivo previo:", error.message);
    }
  };

  const triggerSelect = () => {
    if (isLocked) return;
    inputRef.current?.click();
  };

  const triggerCamera = () => {
    if (isLocked) return;
    cameraRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      toast.error("Formato no permitido. Use JPG, PNG o WEBP.");
      return;
    }

    setEditingFile(file);
  };

  const uploadEditedFile = async (edited: File) => {
    setIsProcessing(true);
    let uploadedPath: string | null = null;

    try {
      const compressed = await imageCompression(edited, {
        ...COMPRESSION_OPTS,
        fileType: edited.type,
      });

      const newPath = buildUniqueName(
        compressed instanceof File ? compressed : edited,
      );

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(newPath, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: edited.type,
        });

      if (uploadError) throw uploadError;
      uploadedPath = newPath;

      if (currentImagePath) await removeFromStorage(currentImagePath);

      await onUploadSuccess(newPath);
      setEditingFile(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al subir la imagen.";
      console.error(e);
      toast.error(message);
      if (uploadedPath) await removeFromStorage(uploadedPath);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!currentImagePath || isLocked) return;
    setIsProcessing(true);
    try {
      await removeFromStorage(currentImagePath);
      await onDeleteSuccess();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Error al eliminar la imagen.";
      console.error(e);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {currentImagePath ? (
        <div className="flex flex-col">
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className={`cursor-pointer group relative w-full bg-gray-50 border transition-all duration-500 rounded-lg overflow-hidden flex items-center justify-center min-h-[160px] max-h-[260px] ${isExpanded ? 'border-blue-400 ring-4 ring-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
          >
            {previewLoading ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="Imagen subida"
                className="max-h-[260px] w-auto object-contain transition-transform duration-700"
              />
            ) : (
              <p className="text-xs text-gray-400 font-bold uppercase px-4 text-center">
                No se pudo cargar la vista previa.
              </p>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex items-center w-full bg-white border border-gray-100 rounded-lg overflow-hidden shadow-lg mt-3 h-14">

                  <div className="flex-[3.5] flex items-center px-5 gap-6 h-full bg-blue-50/30">
                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest shrink-0">Reemplazar:</span>
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); triggerSelect(); }}
                        disabled={isLocked}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-blue-600 text-[10px] font-black uppercase hover:bg-blue-100/50 py-2.5 rounded-lg transition-all active:scale-95"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Galería
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); triggerCamera(); }}
                        disabled={isLocked}
                        className="flex-1 inline-flex items-center justify-center gap-2 text-blue-600 text-[10px] font-black uppercase hover:bg-blue-100/50 py-2.5 rounded-lg transition-all active:scale-95"
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-4 h-4" />}
                        Cámara
                      </button>
                    </div>
                  </div>

                  {/* Separador sutil */}
                  <div className="w-[1px] h-8 bg-gray-200 shrink-0" />

                  {/* Sección Eliminar (1/4) */}
                  <div className="flex-1 flex items-center justify-center h-full">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                      disabled={isLocked}
                      className="w-full h-full inline-flex items-center justify-center gap-2 text-red-600 text-[10px] font-black uppercase hover:bg-red-50 transition-all active:scale-95"
                    >
                      {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Borrar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 px-4 flex flex-col items-center justify-center gap-4">
          {isProcessing ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="text-xs font-bold uppercase text-gray-500">Procesando...</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase text-gray-400">Selecciona una opción</p>
              <div className="flex gap-4 w-full">
                <button
                  type="button"
                  onClick={triggerSelect}
                  disabled={isLocked}
                  className="flex-1 inline-flex flex-col items-center justify-center gap-3 py-6 rounded-lg bg-blue-50/50 border-2 border-blue-100 text-blue-700 text-xs font-black uppercase hover:bg-blue-100 hover:border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <Upload className="w-8 h-8" />
                  Galería
                </button>
                <button
                  type="button"
                  onClick={triggerCamera}
                  disabled={isLocked}
                  className="flex-1 inline-flex flex-col items-center justify-center gap-3 py-6 rounded-lg bg-green-50/50 border-2 border-green-100 text-green-700 text-xs font-black uppercase hover:bg-green-100 hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <Camera className="w-8 h-8" />
                  Cámara
                </button>
              </div>
              <p className="text-[10px] text-gray-400 uppercase">JPG · PNG · WEBP</p>
            </>
          )}
        </div>
      )}

      <ImageEditorModal
        file={editingFile}
        onConfirm={uploadEditedFile}
        onCancel={() => setEditingFile(null)}
      />
    </div>
  );
}
