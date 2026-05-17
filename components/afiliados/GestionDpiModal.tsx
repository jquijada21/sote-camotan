"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, IdCard, Image, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";

import ImageUploader from "@/components/imgs/ImageUploader";
import { createClient } from "@/utils/supabase/client";

import { actualizarCampoDpiAction, type CampoDpi } from "./actions/dpi";
import type { Afiliado } from "./esquemas";
import { generarDpiImg, generarDpiPdf } from "./utils/generarDpiPdf";

const BUCKET = "dpis";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  afiliado: Afiliado | null;
  onSaved?: () => void;
}

interface MutacionPayload {
  campo: CampoDpi;
  path: string | null;
}

export default function GestionDpiModal({
  isOpen,
  onClose,
  afiliado,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const [frontalPath, setFrontalPath] = useState<string | null>(
    afiliado?.dpi_frontal_url ?? null,
  );
  const [reversoPath, setReversoPath] = useState<string | null>(
    afiliado?.dpi_reverso_url ?? null,
  );

  useEffect(() => {
    setFrontalPath(afiliado?.dpi_frontal_url ?? null);
    setReversoPath(afiliado?.dpi_reverso_url ?? null);
  }, [afiliado?.id, afiliado?.dpi_frontal_url, afiliado?.dpi_reverso_url]);

  const mutation = useMutation({
    mutationFn: async ({ campo, path }: MutacionPayload) => {
      if (!afiliado) throw new Error("Afiliado no definido.");
      const result = await actualizarCampoDpiAction(afiliado.id, campo, path);
      if (result.error) throw new Error(result.error);
      return { campo, path };
    },
    onSuccess: ({ campo, path }) => {
      if (campo === "dpi_frontal_url") setFrontalPath(path);
      else setReversoPath(path);

      queryClient.invalidateQueries({ queryKey: ["afiliados-lider"] });
      queryClient.invalidateQueries({ queryKey: ["afiliados-gl"] });
      onSaved?.();
      const lado = campo === "dpi_frontal_url" ? "frontal" : "reverso";
      toast.success(
        path
          ? `DPI ${lado} actualizado correctamente.`
          : `DPI ${lado} eliminado.`,
      );
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "No se pudo actualizar el DPI.");
    },
  });

  const buildSignedUrl = async (path: string | null | undefined) => {
    if (!path) return null;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error) {
      console.warn("No se pudo crear signed URL:", error.message);
      return null;
    }
    return data.signedUrl;
  };

  const handleDownloadPdf = async () => {
    if (!afiliado) return;
    try {
      const [frontal, reverso] = await Promise.all([
        buildSignedUrl(frontalPath),
        buildSignedUrl(reversoPath),
      ]);
      await generarDpiPdf(afiliado, { frontal, reverso });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo generar el PDF.";
      toast.error(message);
    }
  };

  const handleDownloadImg = async () => {
    if (!afiliado) return;
    try {
      const [frontal, reverso] = await Promise.all([
        buildSignedUrl(frontalPath),
        buildSignedUrl(reversoPath),
      ]);
      await generarDpiImg(afiliado, { frontal, reverso });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "No se pudo generar la imagen.";
      toast.error(message);
    }
  };

  const isMutating = mutation.isPending;
  const tieneAlgunDpi = !!frontalPath || !!reversoPath;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[60]"
        onClose={() => !isMutating && onClose()}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-0 sm:p-6">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-screen h-screen sm:w-full sm:max-w-lg bg-white sm:rounded-lg shadow-2xl overflow-hidden flex flex-col sm:max-h-[90vh]">
              <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 border-b bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-green-100 text-green-700 p-2 rounded-lg shrink-0">
                    <IdCard className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-gray-900">
                      Gestionar DPI
                    </h2>
                    {afiliado && (
                      <div className="flex flex-col">
                        <p className="text-[11px] text-gray-500 font-bold uppercase truncate">
                          {afiliado.nombres} {afiliado.apellidos}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono font-bold tracking-wider mt-0.5">
                          DPI: {afiliado.dpi}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isMutating && onClose()}
                  disabled={isMutating}
                  className="text-blue-600 font-bold hover:underline text-sm uppercase px-4 py-2 shrink-0 disabled:opacity-50"
                >
                  Cerrar
                </button>
              </div>

              <div className="relative p-4 md:p-5 overflow-y-auto flex-1">
                {afiliado && (
                  <div className="grid grid-cols-1 gap-6 max-w-xl mx-auto w-full">
                    <section className="flex flex-col gap-2">
                      <header className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-gray-700">
                          Frontal
                        </h3>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            frontalPath
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {frontalPath ? "Cargado" : "Pendiente"}
                        </span>
                      </header>
                      <ImageUploader
                        bucketName={BUCKET}
                        currentImagePath={frontalPath}
                        enableImageLoupe
                        onUploadSuccess={async (newPath) => {
                          await mutation.mutateAsync({
                            campo: "dpi_frontal_url",
                            path: newPath,
                          });
                        }}
                        onDeleteSuccess={async () => {
                          await mutation.mutateAsync({
                            campo: "dpi_frontal_url",
                            path: null,
                          });
                        }}
                        disabled={isMutating}
                      />
                    </section>

                    <section className="flex flex-col gap-2">
                      <header className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase text-gray-700">
                          Reverso
                        </h3>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            reversoPath
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {reversoPath ? "Cargado" : "Pendiente"}
                        </span>
                      </header>
                      <ImageUploader
                        bucketName={BUCKET}
                        currentImagePath={reversoPath}
                        enableImageLoupe
                        onUploadSuccess={async (newPath) => {
                          await mutation.mutateAsync({
                            campo: "dpi_reverso_url",
                            path: newPath,
                          });
                        }}
                        onDeleteSuccess={async () => {
                          await mutation.mutateAsync({
                            campo: "dpi_reverso_url",
                            path: null,
                          });
                        }}
                        disabled={isMutating}
                      />
                    </section>
                  </div>
                )}

                {isMutating && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 z-10">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-xs font-bold text-blue-700 uppercase">
                      Guardando...
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-row items-center gap-2 px-3 md:px-5 py-4 md:py-5 border-t bg-gray-50 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!tieneAlgunDpi || isMutating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-6 h-11 rounded-lg border-2 border-red-200 bg-white text-red-600 text-[10px] md:text-xs font-black uppercase hover:bg-red-50 hover:border-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  title={!tieneAlgunDpi ? "Sube al menos una imagen del DPI" : "Descargar PDF"}
                >
                  <Download className="w-3.5 h-3.5 md:w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImg}
                  disabled={!tieneAlgunDpi || isMutating}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 md:px-6 h-11 rounded-lg border-2 border-blue-200 bg-white text-blue-600 text-[10px] md:text-xs font-black uppercase hover:bg-blue-50 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  title={!tieneAlgunDpi ? "Sube al menos una imagen del DPI" : "Descargar IMG"}
                >
                  <Download className="w-3.5 h-3.5 md:w-4 h-4" />
                  IMG
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
