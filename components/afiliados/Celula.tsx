"use client";

import { useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import type { Afiliado, Lider } from "./esquemas";
import Tabla from "./Tabla";
import EstadisticasTabs from "./estadisticas/EstadisticasTabs";
import TextoAnimado from "@/components/ui/Typeanimation";
import Image from "next/image";
import { Dialog, TransitionChild, DialogPanel } from "@headlessui/react";
import { Users, BarChart3, X, UserPlus, Search, Loader2, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { obtenerAfiliadosAction } from "./actions/afiliados";
import { obtenerConfiguracionAction } from "../dashboard/actions/configuracion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lider: Lider | null;
  onEditar: (afiliado: Afiliado) => void;
  onAnadirAfiliado: (liderId: string, isFirstMember?: boolean, familiarDeId?: string) => void;
  onDataChange: () => void;
  rolUsuarioSesion: string;
}

type Vista = "miembros" | "estadisticas";

export default function Celula({
  isOpen,
  onClose,
  lider,
  onEditar,
  onAnadirAfiliado,
  onDataChange,
  rolUsuarioSesion,
}: Props) {
  const [vistaActual, setVistaActual] = useState<Vista>("miembros");
  const [busqueda, setBusqueda] = useState("");

  const { data: afiliadosDelLider = [], isLoading } = useQuery({
    queryKey: ["afiliados-lider", lider?.id],
    queryFn: () => obtenerAfiliadosAction(lider?.id),
    enabled: isOpen && !!lider?.id,
  });

  const { data: config } = useQuery({
    queryKey: ["config_sistema"],
    queryFn: () => obtenerConfiguracionAction(),
  });

  if (!lider) return null;

  const liderAfiliado =
    afiliadosDelLider.find((a: Afiliado) => !!a.es_lider) ??
    (afiliadosDelLider.length > 0 ? afiliadosDelLider[0] : null);
  const restantesAfiliados = liderAfiliado
    ? afiliadosDelLider.filter((a: Afiliado) => a.id !== liderAfiliado.id)
    : afiliadosDelLider;

  const totalEnGrupo = afiliadosDelLider.filter((a: Afiliado) => !a.familiar_de).length;
  const objetivo = config?.meta_por_lider || 0;
  const progreso = Math.min((totalEnGrupo / objetivo) * 100, 100);

  let mensaje = "";
  let colorBarra = "bg-blue-600";
  let gifUrl = "/gif/afiliados/gif1.gif";

  if (totalEnGrupo === 0 && !isLoading) {
    mensaje = `👋 ¡Hola ${lider.nombres}! Inicia tu grupo registrándote a ti mismo.`;
    colorBarra = "bg-gray-300";
  } else if (totalEnGrupo === 1) {
    mensaje = `🎉 ¡Líder registrado! Añade a tus familiares y amigos.`;
  } else if (progreso <= 25) {
    mensaje = `⚡ ¡Apenas comenzamos! Somos ${totalEnGrupo} de ${objetivo}.`;
    colorBarra = "bg-blue-600";
    gifUrl = "/gif/afiliados/gif1.gif";
  } else if (progreso <= 50) {
    mensaje = `🚀 ¡Vamos por buen camino! Somos ${totalEnGrupo} de ${objetivo}.`;
    colorBarra = "bg-yellow-600";
    gifUrl = "/gif/afiliados/gif2.gif";
  } else if (progreso < 100) {
    mensaje = `😎 ¡Casi llegamos a la meta! Somos ${totalEnGrupo} de ${objetivo}.`;
    colorBarra = "bg-purple-600";
    gifUrl = "/gif/afiliados/gif3.gif";
  } else if (progreso >= 100) {
    mensaje = `🏆 ¡Objetivo alcanzado! ${totalEnGrupo} miembros. ¡Excelente trabajo!`;
    colorBarra = "bg-green-500";
    gifUrl = "/gif/afiliados/gif5.gif";
  }

  const familiares = restantesAfiliados.filter((a: Afiliado) => !!a.familiar_de);

  const afiliadosFiltrados =
    busqueda.length >= 2
      ? restantesAfiliados.filter(
          (a: Afiliado) =>
            a.nombres.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.apellidos.toLowerCase().includes(busqueda.toLowerCase()) ||
            a.dpi.includes(busqueda),
        )
      : restantesAfiliados;

  const TABS = [
    { id: "miembros", label: "Miembros", icon: Users },
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
  ];

  return (
    <Fragment>
      <Dialog open={isOpen} onClose={() => {}} className="relative z-50">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-0">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-10 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-10 scale-95"
          >
            <DialogPanel className="w-screen h-screen bg-white flex flex-col overflow-hidden">
              {/* HEADER */}
              <div className="flex justify-between items-center px-3 py-2.5 border-b shrink-0 bg-white sticky top-0 z-20">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm md:text-base font-black uppercase truncate text-gray-900 leading-tight">
                      {lider.nombres} {lider.apellidos}
                    </h3>
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />}
                  </div>
                  {liderAfiliado?.created_at && (
                    <p className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">
                      Afiliado el{" "}
                      {new Date(liderAfiliado.created_at).toLocaleDateString("es-GT", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-black uppercase text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors shrink-0"
                >
                  CERRAR
                </button>
              </div>

              <div className="px-2 py-2 border-b bg-gray-50 flex justify-center">
                <div className="flex bg-gray-200 p-1 rounded-lg gap-1 w-full max-w-md">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setVistaActual(tab.id as Vista)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold transition-all ${
                        vistaActual === tab.id
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-500 hover:bg-gray-300"
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONTENIDO */}
              <div className="flex-1 overflow-y-auto px-2">
                <div className="w-full">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                      <p className="text-sm font-bold text-gray-500 uppercase">Consultando Miembros de Célula...</p>
                    </div>
                  ) : vistaActual === "miembros" ? (
                    <>
                      <div className="mb-6 p-4 border rounded-xl bg-white shadow-sm flex flex-col md:flex-row items-center gap-4">
                        <div className="w-full md:flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-700 uppercase">
                              Progreso de Célula
                            </span>
                            <span className="text-sm font-black text-blue-700">
                              {totalEnGrupo} / {objetivo}
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner border">
                            <div
                              className={`${colorBarra} h-full transition-all duration-1000`}
                              style={{ width: `${progreso}%` }}
                            ></div>
                          </div>

                          <div className="hidden md:block text-center mt-2">
                            <span className="text-xs text-gray-600 font-bold bg-gray-50 px-4 py-1 rounded-full border inline-block">
                              <TextoAnimado textos={[mensaje]} />
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border w-full md:w-auto shrink-0">
                          <div className="md:hidden flex-1">
                            <span className="text-[10px] text-gray-700 font-bold leading-tight uppercase">
                              <TextoAnimado textos={[mensaje]} />
                            </span>
                          </div>

                          <div className="shrink-0">
                            <Image
                              src={gifUrl}
                              alt="Status"
                              width={100}
                              height={100}
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                        <div className="relative w-full md:w-96">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Buscar por nombre o DPI..."
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                          />
                        </div>
                        <Button
                          className={`font-bold h-12 px-6 shadow-md transition-transform hover:scale-105 w-full md:w-auto uppercase text-xs ${
                            totalEnGrupo === 0
                              ? "bg-green-600 animate-pulse"
                              : "bg-blue-700"
                          }`}
                          onClick={() =>
                            onAnadirAfiliado(lider.id, totalEnGrupo === 0)
                          }
                        >
                          {totalEnGrupo === 0 ? (
                            <>
                              <UserPlus className="w-5 h-5 mr-2" /> Registrarme
                              como Líder
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-5 h-5 mr-2" /> Añadir
                              Integrante
                            </>
                          )}
                        </Button>
                      </div>

                      <Tabla
                        lider={lider}
                        afiliados={afiliadosFiltrados}
                        onEditar={onEditar}
                        onAnadirFamiliar={(titularId) => onAnadirAfiliado(lider.id, false, titularId)}
                        onDataChange={onDataChange}
                        rolUsuarioSesion={rolUsuarioSesion}
                        config={config}
                        totalEnCelula={totalEnGrupo}
                      />
                    </>
                  ) : (
                    <div className="w-full pt-4">
                      <EstadisticasTabs afiliados={afiliadosDelLider} />
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Fragment>
  );
}
