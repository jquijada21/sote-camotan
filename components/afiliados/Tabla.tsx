"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Hash,
  XCircle,
  MessageCircle,
  Crown,
  Heart,
  Eye,
  Download,
  UserPlus,
  Users,
} from "lucide-react";

import { eliminar } from "./acciones";
import type { Afiliado, Lider } from "./esquemas";
import GestionDpiModal from "./GestionDpiModal";
import { Dialog, Transition, TransitionChild, DialogPanel } from "@headlessui/react";
import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  lider: Lider;
  afiliados: Afiliado[];
  onEditar: (afiliado: Afiliado) => void;
  onAnadirFamiliar?: (titularId: string) => void;
  onDataChange: () => void;
  rolUsuarioSesion: string;
  config?: any;
  totalEnCelula?: number;
  isFamilyView?: boolean;
}

export default function Tabla({
  lider,
  afiliados,
  onEditar,
  onAnadirFamiliar,
  onDataChange,
  rolUsuarioSesion,
  config,
  totalEnCelula,
  isFamilyView = false,
}: Props) {
  const puedeVerAcciones = true;
  const totalAfiliados = totalEnCelula ?? afiliados.length;

  const [gestionDpiAfiliado, setGestionDpiAfiliado] = useState<Afiliado | null>(null);
  const [titularVerFamilia, setTitularVerFamilia] = useState<Afiliado | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const descargarCarnet = (afiliado: Afiliado) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 1000;
    canvas.height = 630;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    ctx.fillStyle = "#1e40af";
    ctx.fillRect(30, 30, 100, 10);
    ctx.fillRect(30, 30, 10, 100);
    ctx.fillRect(canvas.width - 130, 30, 100, 10);
    ctx.fillRect(canvas.width - 40, 30, 10, 100);
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CONSTANCIA DE AFILIACIÓN", canvas.width / 2, 75);
    ctx.fillStyle = "#111827";
    ctx.font = "900 40px sans-serif";
    ctx.fillText(config?.nombre_candidato?.toUpperCase() || "AFILIACIÓN", canvas.width / 2, 125);
    ctx.beginPath();
    ctx.moveTo(100, 155);
    ctx.lineTo(900, 155);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("NOMBRE DEL AFILIADO:", 100, 210);
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(`${afiliado.nombres} ${afiliado.apellidos}`.toUpperCase(), 100, 265);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("DOCUMENTO PERSONAL DE IDENTIFICACIÓN (DPI):", 100, 340);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 38px monospace";
    ctx.fillText(afiliado.dpi || "0000 00000 0000", 100, 390);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("NO. DE PADRÓN:", 100, 460);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(afiliado.no_padron || "N/A", 100, 505);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("MUNICIPIO / LUGAR:", 550, 460);
    ctx.fillStyle = "#111827";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(afiliado.lugar_nombre || config?.lugar || "—", 550, 505);
    ctx.fillStyle = "#9ca3af";
    ctx.font = "italic 18px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Afiliado el: ${new Date(afiliado.created_at).toLocaleDateString("es-GT")}`, 900, 580);
    const link = document.createElement("a");
    link.download = `carnet_${afiliado.nombres.replace(/\s/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const obtenerDpiInfo = (afiliado: Afiliado) => {
    const hasDpi = !!afiliado.dpi_frontal_url || !!afiliado.dpi_reverso_url;
    return {
      color: hasDpi ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700",
      label: hasDpi ? "Ver DPI" : "Cargar DPI"
    };
  };

  if (afiliados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500 bg-gray-50 rounded border border-dashed">
        <p className="text-sm">No hay afiliados en esta célula aún.</p>
      </div>
    );
  }

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return "—";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  const generarLinkWhatsapp = (telefono: string) => {
    if (!telefono) return "#";
    const numeroLimpio = telefono.replace(/\D/g, "");
    const numeroFinal =
      numeroLimpio.length === 8 ? `502${numeroLimpio}` : numeroLimpio;
    return `https://wa.me/${numeroFinal}`;
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return "—";
    const d = new Date(fecha);
    const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    const diaSemana = dias[d.getDay()];
    const dia = d.getDate().toString().padStart(2, "0");
    const mes = (d.getMonth() + 1).toString().padStart(2, "0");
    const anio = d.getFullYear().toString().slice(-2);
    let horas = d.getHours();
    const minutos = d.getMinutes().toString().padStart(2, "0");
    const ampm = horas >= 12 ? "PM" : "AM";
    horas = horas % 12;
    horas = horas ? horas : 12;
    const horasStr = horas.toString().padStart(2, "0");

    return `${diaSemana} ${dia}/${mes}/${anio}, ${horasStr}:${minutos} ${ampm}`;
  };

  const titulares = isFamilyView ? afiliados : afiliados.filter((a) => !a.familiar_de);
  const familiaresPorTitular = new Map<string, Afiliado[]>();
  
  if (!isFamilyView) {
    afiliados.forEach(a => {
      if (a.familiar_de) {
        if (!familiaresPorTitular.has(a.familiar_de)) familiaresPorTitular.set(a.familiar_de, []);
        familiaresPorTitular.get(a.familiar_de)!.push(a);
      }
    });
  }

  const todosOrdenados: Array<{ afiliado: Afiliado; depth: number }> = titulares.map(a => ({ afiliado: a, depth: 0 }));

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {todosOrdenados.map(({afiliado, depth}, index) => {
        const esLider = !!afiliado.es_lider;
        const esFamiliar = !!afiliado.familiar_de && !esLider;
        const puedeEliminar = !(esLider && totalAfiliados > 1);

        return (
          <div
            key={afiliado.id}
            onClick={() => toggleExpand(afiliado.id)}
            className={`group relative bg-white border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer overflow-hidden ${
              esLider
                ? "border-orange-200 ring-1 ring-orange-100"
                : esFamiliar
                  ? "border-purple-100"
                  : "border-gray-100"
            } ${depth > 0 ? "ml-8 md:ml-12 border-l-4 border-l-purple-400" : ""} ${expandedId === afiliado.id ? "ring-2 ring-blue-500/20 border-blue-200" : ""}`}
          >
            {esLider && (
              <div className="absolute -top-2.5 left-3 z-10">
                <span className="flex items-center gap-1 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  <Crown className="w-2.5 h-2.5" /> Líder
                </span>
              </div>
            )}




            <div className="p-4 flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-3 gap-1 md:gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex items-center justify-center font-bold text-xs h-6 w-6 rounded-md shrink-0 ${
                      esLider
                        ? "bg-orange-100 text-orange-700"
                        : esFamiliar
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-black text-gray-900 uppercase leading-tight">
                    {afiliado.nombres} {afiliado.apellidos}
                  </h3>
                </div>
                <div className="text-xs italic text-slate-400 shrink-0 md:text-right">
                  Afiliado el:{" "}
                  <span className="font-bold">
                    {formatearFecha(afiliado.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="font-bold text-gray-500 shrink-0">DPI:</span>
                  <span className="font-mono font-medium truncate">
                    {afiliado.dpi || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="font-bold text-[10px]">
                    {calcularEdad(afiliado.nacimiento)}
                  </span>
                </div>

                <div className="shrink-0">
                  {afiliado.sexo === "M" ? (
                    <span className="flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] h-6 w-6 rounded-md">
                      M
                    </span>
                  ) : (
                    <span className="flex items-center justify-center bg-pink-50 text-pink-700 border border-pink-200 font-bold text-[10px] h-6 w-6 rounded-md">
                      F
                    </span>
                  )}
                </div>
              </div>

              {/* LÍNEA 3: WHATSAPP + UBICACIÓN */}
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <a
                  href={generarLinkWhatsapp(afiliado.telefono || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 shrink-0 text-green-600 hover:text-green-700 hover:underline transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="font-bold font-mono">
                    {afiliado.telefono || "—"}
                  </span>
                </a>

                <div className="h-4 w-px bg-gray-200 shrink-0"></div>

                {/* Ubicación: Ahora solo depende de afiliado.lugar_nombre */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span
                    className="truncate"
                    title={afiliado.lugar_nombre || "Ubicación no definida"}
                  >
                    {afiliado.lugar_nombre || "—"}
                  </span>
                </div>
              </div>

              {/* LÍNEA 4: PADRÓN */}
              <div className="pt-1">
                {afiliado.empadronado ? (
                  <div className={`border rounded p-2 flex items-center gap-2 ${
                    esFamiliar 
                      ? "bg-purple-50 border-purple-200 text-purple-800" 
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}>
                    <Hash className={`w-3.5 h-3.5 shrink-0 ${esFamiliar ? "text-purple-600" : "text-blue-600"}`} />
                    <div className="text-[10px]">
                      <span className="font-bold uppercase mr-1">Padrón:</span>
                      <span className="font-mono font-bold">
                        {afiliado.no_padron || "—"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded p-2 flex items-center gap-2 text-red-700">
                    <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-[10px] font-bold uppercase">
                      NO EMPADRONADO
                    </span>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {puedeVerAcciones && expandedId === afiliado.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div 
                    className="bg-gray-50/80 p-2 border-t border-gray-100 flex flex-wrap gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Ver/Cargar DPI */}
                    <button
                      type="button"
                      onClick={() => setGestionDpiAfiliado(afiliado)}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 h-12 rounded-lg text-white text-xs font-black uppercase transition shadow-md shrink-0 ${obtenerDpiInfo(afiliado).color}`}
                    >
                      <Eye className="w-4 h-4" />
                      {obtenerDpiInfo(afiliado).label}
                    </button>

                    {/* Ver Familia Button (Conditional) */}
                    {!esFamiliar && !isFamilyView && (
                      <Button
                        variant="outline"
                        className="flex-1 bg-white text-purple-700 border-purple-200 hover:bg-purple-100 h-12 px-3 text-xs font-black uppercase shrink-0 shadow-sm"
                        onClick={() => setTitularVerFamilia(afiliado)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Familia ({familiaresPorTitular.get(afiliado.id)?.length || 0})
                      </Button>
                    )}

                    {/* Editar Button */}
                    <Button
                      variant="outline"
                      className="flex-1 bg-white text-blue-700 border-blue-200 hover:bg-blue-50 h-12 px-3 text-xs font-black uppercase shrink-0 shadow-sm"
                      onClick={() => onEditar(afiliado)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>

                    {/* Eliminar Button */}
                    <Button
                      variant="outline"
                      disabled={!puedeEliminar}
                      title={!puedeEliminar ? "No se puede eliminar al líder mientras tenga integrantes" : undefined}
                      className="flex-1 bg-white text-red-700 border-red-200 hover:bg-red-50 h-12 px-3 text-xs font-black uppercase disabled:opacity-40 shrink-0 shadow-sm"
                      onClick={() => puedeEliminar && eliminar(afiliado, onDataChange)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Borrar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>

    <GestionDpiModal
      isOpen={!!gestionDpiAfiliado}
      onClose={() => setGestionDpiAfiliado(null)}
      afiliado={gestionDpiAfiliado}
      onSaved={() => {
        onDataChange();
      }}
    />

    <Transition show={!!titularVerFamilia} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => setTitularVerFamilia(null)}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-10">
          <div className="flex min-h-full items-center justify-center p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <DialogPanel className="w-screen h-screen bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 md:p-6 bg-white border-b shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                        Familia de {titularVerFamilia?.nombres}
                      </Dialog.Title>
                      <p className="text-xs font-medium text-gray-500 uppercase mt-0.5">
                        Gestión de grupo familiar
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTitularVerFamilia(null)}
                    className="text-blue-600 font-bold hover:underline text-sm uppercase px-4 py-2"
                  >
                    Cerrar
                  </button>
                </div>
                
                <div className="p-4 md:p-6 overflow-y-auto flex-1">
                  {titularVerFamilia && (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        {onAnadirFamiliar && (
                          <Button
                            onClick={() => onAnadirFamiliar(titularVerFamilia.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold"
                          >
                            <UserPlus className="w-4 h-4" />
                            Añadir Familiar
                          </Button>
                        )}
                      </div>
                      <Tabla
                        lider={lider}
                        afiliados={[
                          titularVerFamilia,
                          ...(familiaresPorTitular.get(titularVerFamilia.id) || []),
                        ]}
                        onEditar={onEditar}
                        onAnadirFamiliar={onAnadirFamiliar}
                        onDataChange={onDataChange}
                        rolUsuarioSesion={rolUsuarioSesion}
                        config={config}
                        totalEnCelula={totalEnCelula}
                        isFamilyView={true}
                      />
                    </div>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  </>
  );
}
