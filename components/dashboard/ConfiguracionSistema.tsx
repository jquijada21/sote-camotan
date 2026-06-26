"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, Search, MapPin, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import useUserData from "@/hooks/sesion/useUserData";
import { obtenerConfiguracionAction, actualizarConfiguracionAction } from "./actions/configuracion";
import {
  obtenerLugaresAction,
  obtenerSectoresAction,
  crearLugarAction,
  crearSectorAction,
  editarSectorAction,
  eliminarSectorAction,
  editarLugarAction,
  eliminarLugarAction,
  type Lugar,
  type Sector,
} from "@/components/afiliados/forms/afiliados/catalogos";
import IndexDev from "@/components/dev/IndexDev";
import Swal from "sweetalert2";

interface Props {
  showMetas?: boolean;
  allowEditing?: boolean;
  onClose?: () => void;
}

export default function ConfiguracionSistema({
  showMetas = true,
  allowEditing = true,
  onClose
}: Props) {
  const { rol, cargando: cargandoRol } = useUserData();
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const canEdit = (rol === "SUPER" || rol === "ADMINISTRADOR" || rol === "ADMIN") && allowEditing;

  const { data: config, isLoading } = useQuery({
    queryKey: ["config_sistema"],
    queryFn: () => obtenerConfiguracionAction(),
  });

  const [nombreCandidato, setNombreCandidato] = useState("");
  const [lugar, setLugar] = useState("");
  const [frase, setFrase] = useState("");
  const [objetivoTotal, setObjetivoTotal] = useState(0);
  const [metaPorLider, setMetaPorLider] = useState(0);
  const [padronPrecargado, setPadronPrecargado] = useState(false);
  const [activeTab, setActiveTab] = useState<"candidato" | "metas" | "lugares" | "dev">("candidato");

  const [initialized, setInitialized] = useState(false);

  // Sincronizar estados locales una sola vez al cargar o cuando cambie la config
  if (config && !initialized) {
    setNombreCandidato(config.nombre_candidato || "");
    setLugar(config.lugar || "");
    setFrase(config.frase || "");
    setObjetivoTotal(config.objetivo_total || 0);
    setMetaPorLider(config.meta_por_lider || 0);
    setPadronPrecargado(config.padron ?? false);
    setInitialized(true);
  }

  // ── Sectores y Lugares ──
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [sectorQuery, setSectorQuery] = useState("");
  const [lugarQuery, setLugarQuery] = useState("");
  const [sectorSeleccionado, setSectorSeleccionado] = useState<number | null>(null);
  const [creandoSector, setCreandoSector] = useState(false);
  const [creandoLugar, setCreandoLugar] = useState(false);

  useEffect(() => {
    if (canEdit) {
      obtenerSectoresAction().then(setSectores);
      obtenerLugaresAction().then(setLugares);
    }
  }, [canEdit]);

  const sectoresFiltrados = sectores.filter((s) => {
    const queryLower = sectorQuery.toLowerCase().trim();
    const matchSector = queryLower.match(/^sector\s+(\d+)$/);
    if (matchSector) {
      return s.id === parseInt(matchSector[1], 10);
    }
    const formatted = s.nombre;
    return formatted.toLowerCase().includes(queryLower);
  });
  const sectorExacto = sectores.find((s) => {
    const formatted = s.nombre;
    return formatted.toLowerCase() === sectorQuery.trim().toLowerCase();
  });
  const puedeCrearSector = sectorQuery.trim().length > 1 && !sectorExacto;

  const normalize = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const lugaresFiltrados = lugares.filter((l) => {
    if (sectorSeleccionado && l.sector_id !== sectorSeleccionado) return false;
    const qNorm = normalize(lugarQuery);
    if (qNorm === "") return true;
    const lNorm = normalize(l.nombre);
    return lNorm.includes(qNorm);
  });
  const lugarExactoEnSector = lugares.find(
    (l) => normalize(l.nombre) === normalize(lugarQuery) && l.sector_id === sectorSeleccionado
  );
  const puedeCrearLugar = lugarQuery.trim().length > 1 && !lugarExactoEnSector && sectorSeleccionado;

  useEffect(() => {
    setLugarQuery("");
  }, [sectorSeleccionado]);

  const handleCrearSector = async () => {
    if (!puedeCrearSector) return;
    setCreandoSector(true);
    const nuevo = await crearSectorAction(sectorQuery.trim());
    if (nuevo) {
      setSectores((prev) => [...prev, nuevo].sort((a, b) => {
        if (a.id === 0) return 1;
        if (b.id === 0) return -1;
        return a.id - b.id;
      }));
      setSectorSeleccionado(nuevo.id);
      const formatted = nuevo.nombre;
      setSectorQuery(formatted);
      toast.success(`Sector "${nuevo.nombre}" creado`);
    } else {
      toast.error("Error al crear el sector");
    }
    setCreandoSector(false);
  };

  const handleCrearLugar = async () => {
    if (!puedeCrearLugar || !sectorSeleccionado) return;
    setCreandoLugar(true);
    const nuevo = await crearLugarAction(lugarQuery.trim(), sectorSeleccionado);
    if (nuevo) {
      setLugares((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setLugarQuery("");
      toast.success(`Lugar "${nuevo.nombre}" creado`);
    } else {
      toast.error("Error al crear el lugar");
    }
    setCreandoLugar(false);
  };

  const handleEditSector = async (sector: Sector) => {
    const { value: nuevoNombre } = await Swal.fire({
      title: 'Editar Sector',
      input: 'text',
      inputLabel: 'Nuevo nombre para el sector',
      inputValue: sector.nombre,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      inputValidator: (value) => {
        if (!value || value.trim() === '') return 'El nombre no puede estar vacío';
        if (value.trim() === sector.nombre) return 'El nombre es el mismo';
      }
    });

    if (nuevoNombre) {
      const ok = await editarSectorAction(sector.id, nuevoNombre);
      if (ok) {
        setSectores(prev => prev.map(s => s.id === sector.id ? { ...s, nombre: nuevoNombre.trim() } : s));
        toast.success("Sector actualizado");
      } else {
        toast.error("Error al actualizar");
      }
    }
  };

  const handleDeleteSector = async (sector: Sector) => {
    const result = await Swal.fire({
      title: '¿Eliminar sector?',
      html: `¿Estás seguro de eliminar el sector <b>"${sector.nombre}"</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const res = await eliminarSectorAction(sector.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSectores(prev => prev.filter(s => s.id !== sector.id));
        if (sectorSeleccionado === sector.id) setSectorSeleccionado(null);
        toast.success("Sector eliminado");
      }
    }
  };

  const handleEditLugar = async (lugar: Lugar) => {
    const { value: nuevoNombre } = await Swal.fire({
      title: 'Editar Lugar',
      input: 'text',
      inputLabel: 'Nuevo nombre para el lugar',
      inputValue: lugar.nombre,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      inputValidator: (value) => {
        if (!value || value.trim() === '') return 'El nombre no puede estar vacío';
        if (value.trim() === lugar.nombre) return 'El nombre es el mismo';
      }
    });

    if (nuevoNombre) {
      const ok = await editarLugarAction(lugar.id, nuevoNombre);
      if (ok) {
        setLugares(prev => prev.map(l => l.id === lugar.id ? { ...l, nombre: nuevoNombre.trim() } : l));
        toast.success("Lugar actualizado");
      } else {
        toast.error("Error al actualizar");
      }
    }
  };

  const handleDeleteLugar = async (lugar: Lugar) => {
    const result = await Swal.fire({
      title: '¿Eliminar lugar?',
      html: `¿Estás seguro de eliminar el lugar <b>"${lugar.nombre}"</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const res = await eliminarLugarAction(lugar.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        setLugares(prev => prev.filter(l => l.id !== lugar.id));
        toast.success("Lugar eliminado");
      }
    }
  };

  const sectorObj = sectores.find((s) => s.id === sectorSeleccionado);
  const sectorNombre = sectorObj ? sectorObj.nombre : undefined;

  const isLugarDuplicado = activeTab === "lugares" && lugarQuery.trim() !== "" && lugarExactoEnSector;

  const handleSaveTodo = async () => {
    if (isLugarDuplicado) {
      toast.error("No puedes guardar porque el lugar ya existe");
      return;
    }
    try {
      setGuardando(true);
      if (!nombreCandidato || !lugar) {
        toast.warning("El nombre y lugar son obligatorios", { position: "top-center" });
        return;
      }
      await actualizarConfiguracionAction(
        nombreCandidato,
        lugar,
        frase,
        objetivoTotal,
        metaPorLider,
        padronPrecargado
      );
      queryClient.invalidateQueries({ queryKey: ["config_sistema"] });
      toast.success("Configuración actualizada correctamente", {
        autoClose: 4000,
        position: "top-center"
      });
    } catch (error: any) {
      toast.error("Error al guardar: " + error.message, { position: "top-center" });
    } finally {
      setGuardando(false);
    }
  };

  if (isLoading || cargandoRol) return <div className="h-16 w-full bg-blue-50/50 animate-pulse rounded-xl mb-2" />;

  if (!config && !canEdit) return null;

  const currentConfig = config || { nombre_candidato: "", lugar: "", frase: "" };
  const isNew = !config;

  return (
    <div className={`w-full mx-auto flex flex-col ${canEdit ? "h-full" : ""}`}>
      {canEdit ? (
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          {/* TABS */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("candidato")}
              className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all ${activeTab === "candidato" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Candidato
            </button>
            {showMetas && (
              <button
                onClick={() => setActiveTab("metas")}
                className={`flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all ${activeTab === "metas" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Metas
              </button>
            )}
            <button
              onClick={() => setActiveTab("lugares")}
              className={`flex-1 py-1 text-[10px] sm:text-[10px] font-bold uppercase rounded-lg transition-all whitespace-pre-line leading-tight ${activeTab === "lugares" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {"Lugares y\nSectores"}
            </button>
            <button
              onClick={() => setActiveTab("dev")}
              className={`flex-1 py-1 text-[10px] sm:text-[10px] font-bold uppercase rounded-lg transition-all whitespace-pre-line leading-tight ${activeTab === "dev" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {"Mensajes\nDe Sistema"}
            </button>
          </div>

          {/* SECCIÓN 1: INFORMACIÓN DEL CANDIDATO */}
          {activeTab === "candidato" && (
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                Información del Candidato
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 uppercase ml-1">Nombre Completo / Título</label>
                  <Input
                    value={nombreCandidato}
                    onChange={(e) => setNombreCandidato(e.target.value)}
                    className="h-12 text-lg font-black text-blue-900 border-gray-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all bg-gray-50/30"
                    placeholder="Escribe aqui el nombre del candidato"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase ml-1">Frase o Lema</label>
                    <Input
                      value={frase}
                      onChange={(e) => setFrase(e.target.value)}
                      className="h-12 text-base italic text-gray-700 border-gray-300 focus:border-blue-600 bg-gray-50/30"
                      placeholder="Escribe aqui tu frase o lema"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 uppercase ml-1">Municipio / Ubicación</label>
                    <Input
                      value={lugar}
                      onChange={(e) => setLugar(e.target.value)}
                      className="h-12 text-base font-bold uppercase border-gray-300 focus:border-blue-600 bg-gray-50/30"
                      placeholder="Escribe aqui el lugar"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button
                  onClick={handleSaveTodo}
                  disabled={guardando}
                  className="w-full sm:w-auto px-10 h-11 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 transition-all"
                >
                  {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Candidato"}
                </Button>
              </div>
            </div>
          )}

          {/* SECCIÓN 2: METAS Y OBJETIVOS */}
          {showMetas && activeTab === "metas" && (
            <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
                Configuración de Metas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-blue-800 uppercase ml-1">Objetivo Total</label>
                  <Input
                    type="number"
                    value={objetivoTotal}
                    onChange={(e) => setObjetivoTotal(Number(e.target.value))}
                    className="h-12 text-2xl font-black text-blue-900 border-blue-300 focus:border-blue-600 bg-white text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-blue-800 uppercase ml-1">Meta por Líder</label>
                  <Input
                    type="number"
                    value={metaPorLider}
                    onChange={(e) => setMetaPorLider(Number(e.target.value))}
                    className="h-12 text-2xl font-black text-blue-900 border-blue-300 focus:border-blue-600 bg-white text-center"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-blue-200">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-blue-800 uppercase">Padrón Precargado</span>
                  <span className="text-[10px] text-blue-500">Indica si el padrón electoral ya fue cargado en el sistema</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPadronPrecargado((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${padronPrecargado ? "bg-blue-600" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${padronPrecargado ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </button>
              </div>

              {objetivoTotal > 0 && metaPorLider > 0 && (
                <div className="mt-4 p-5 bg-blue-600 rounded-2xl shadow-lg flex items-center justify-between text-white">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase opacity-80">Requerimiento de Células</span>
                    <span className="text-base font-bold">Líderes necesarios para la meta</span>
                  </div>
                  <div className="text-4xl font-black">
                    {Math.ceil(objetivoTotal / metaPorLider)}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-blue-100 flex justify-end">
                <Button
                  onClick={handleSaveTodo}
                  disabled={guardando}
                  className="w-full sm:w-auto px-10 h-11 bg-blue-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 transition-all"
                >
                  {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Metas"}
                </Button>
              </div>
            </div>
          )}

          {/* SECCIÓN 3: GESTIÓN DE SECTORES Y LUGARES */}
          {activeTab === "lugares" && (
            <div className="bg-amber-50/50 p-6 rounded-2xl border-2 border-amber-200 shadow-sm space-y-5 flex-1 flex flex-col">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Gestión de Sectores y Lugares
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* SECTORES */}
                <div className="space-y-3 flex flex-col min-h-0">
                  <label className="text-xs font-black text-amber-800 uppercase ml-1">Sectores</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={sectorQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSectorQuery(val);
                          if (val.trim() === "") setSectorSeleccionado(null);
                        }}
                        placeholder="Selecciona o busca un sector..."
                        className="w-full h-10 pl-9 pr-3 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 shrink-0"
                      />
                    </div>
                    {puedeCrearSector && (
                      <Button
                        type="button"
                        onClick={handleCrearSector}
                        disabled={creandoSector}
                        className="h-10 bg-amber-600 hover:bg-amber-700 text-white px-3 rounded-lg flex items-center gap-1 shrink-0"
                      >
                        {creandoSector ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span className="hidden sm:inline text-sm font-bold">Crear</span>
                      </Button>
                    )}
                  </div>

                  <div className="bg-white border border-amber-100 rounded-lg flex-1 overflow-y-auto">
                    {sectoresFiltrados.length === 0 && !puedeCrearSector ? (
                      <p className="text-xs text-gray-400 p-3 text-center">No hay sectores</p>
                    ) : (
                      <>
                        {sectoresFiltrados.map((s) => {
                          const tieneLugares = lugares.some((l) => l.sector_id === s.id);
                          return (
                            <div
                              key={s.id}
                              className={`w-full flex items-center justify-between transition-colors group ${sectorSeleccionado === s.id
                                  ? "bg-amber-100 text-amber-900 font-bold"
                                  : "hover:bg-amber-50 text-gray-700"
                                }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSectorSeleccionado(s.id);
                                }}
                                className="flex-1 text-left px-3 py-2 text-sm flex items-center"
                              >
                                {s.nombre}
                                {sectorSeleccionado === s.id && <Check className="w-3 h-3 text-amber-600 ml-2" />}
                              </button>
                              {s.id !== 0 && (
                                <div className="flex items-center pr-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => handleEditSector(s)} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-blue-600" title="Editar"><Pencil className="w-3 h-3" /></button>
                                  {!tieneLugares && (
                                    <button type="button" onClick={() => handleDeleteSector(s)} className="p-1.5 hover:bg-white rounded-md text-gray-500 hover:text-red-600" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* LUGARES */}
                <div className="space-y-3 flex flex-col min-h-0">
                  <label className="text-xs font-black text-amber-800 uppercase ml-1">
                    Lugares
                    {sectorNombre && (
                      <span className="text-amber-500 font-normal ml-1">— {sectorNombre}</span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={lugarQuery}
                        onChange={(e) => setLugarQuery(e.target.value)}
                        placeholder={sectorSeleccionado ? "Buscar o crear lugar..." : "Selecciona un sector primero"}
                        disabled={!sectorSeleccionado}
                        className="w-full h-10 pl-9 pr-3 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50 disabled:bg-gray-50 shrink-0"
                      />
                    </div>
                    {puedeCrearLugar && (
                      <Button
                        type="button"
                        onClick={handleCrearLugar}
                        disabled={creandoLugar}
                        className="h-10 bg-amber-600 hover:bg-amber-700 text-white px-3 rounded-lg flex items-center gap-1 shrink-0"
                      >
                        {creandoLugar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span className="hidden sm:inline text-sm font-bold">Crear</span>
                      </Button>
                    )}
                  </div>

                  <div className="bg-white border border-amber-100 rounded-lg flex-1 overflow-y-auto">
                    {!sectorSeleccionado ? (
                      <p className="text-xs text-gray-400 p-3 text-center italic">
                        Selecciona un sector para ver sus lugares
                      </p>
                    ) : lugaresFiltrados.length === 0 && !puedeCrearLugar ? (
                      <p className="text-xs text-gray-400 p-3 text-center">
                        {lugarExactoEnSector ? (
                          <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md border border-red-100">
                            ⚠️ ESTE LUGAR YA EXISTE EN ESTE SECTOR
                          </span>
                        ) : "No hay lugares en este sector"}
                      </p>
                    ) : (
                      <>
                        {lugaresFiltrados.map((l) => (
                          <div
                            key={l.id}
                            className="px-3 py-2 text-sm text-gray-700 flex items-center justify-between border-b border-gray-50 last:border-0 group hover:bg-amber-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              {l.nombre}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => handleEditLugar(l)} className="p-1 hover:bg-white rounded text-gray-500 hover:text-blue-600" title="Editar"><Pencil className="w-3 h-3" /></button>
                              <button type="button" onClick={() => handleDeleteLugar(l)} className="p-1 hover:bg-white rounded text-gray-500 hover:text-red-600" title="Eliminar"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {!sectorSeleccionado && (
                    <p className="text-[9px] text-amber-600 italic">
                      Selecciona un sector existente para poder gestionar sus lugares.
                    </p>
                  )}

                  <div className="pt-4 border-t border-amber-100 mt-4 flex flex-col gap-3">
                    <p className="text-[10px] text-amber-700 font-medium italic text-center">
                      * Los cambios en sectores y lugares se guardan automáticamente al crearlos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN 4: DEV */}
          {activeTab === "dev" && (
            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
              <IndexDev />
            </div>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${showMetas ? "md:grid-cols-2 gap-8" : ""} items-stretch`}>
          <div className={`relative flex flex-col justify-center items-center select-none text-center h-full  pt-4 sm:pt-0 pb-2 sm:pb-4  transition-all duration-300 rounded-xl ${!showMetas ? "max-w-4xl mx-auto" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key="view-lider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col relative w-full items-center"
              >
                <h1 className="text-2xl md:text-4xl font-bold text-center leading-tight bg-gradient-to-r from-blue-800 via-blue-400 to-blue-800 bg-[length:200%_auto] text-transparent bg-clip-text animate-text-shine">
                  {currentConfig.nombre_candidato || "Sin nombre asignado"}
                </h1>

                {currentConfig.frase && (
                  <p className="mt-2 text-base md:text-lg text-blue-500 font-medium italic opacity-80 text-center">
                    "{currentConfig.frase}"
                  </p>
                )}

                <div className="flex flex-col items-center mt-4 w-full">
                  <span className="text-sm md:text-base font-bold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="h-[1px] w-6 bg-blue-200"></span>
                    {currentConfig.lugar || "Sin lugar"}
                    <span className="h-[1px] w-6 bg-blue-200"></span>
                  </span>

                  {(rol === "SUPER" || rol === "ADMINISTRADOR" || rol === "ADMIN") && currentConfig.objetivo_total > 0 && currentConfig.meta_por_lider > 0 && (
                    <div className="mt-2 bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100/50">
                      <p className="text-xs md:text-lg font-black text-blue-900/60 uppercase tracking-tight">
                        Se requieren <span className="text-blue-600 text-sm md:text-2xl">{Math.ceil(currentConfig.objetivo_total / currentConfig.meta_por_lider)} líderes</span> para la meta
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {showMetas && (
            <div className="relative flex flex-col justify-center items-center select-none text-center h-full min-h-[140px] p-4 transition-all duration-300 rounded-xl cursor-default">
              <div className="flex flex-col items-center">
                <motion.div
                  key="view-metas"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-row relative w-full items-center justify-center gap-12"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Objetivo Total</span>
                    <span className="text-xl md:text-2xl font-black text-blue-700">
                      {currentConfig.objetivo_total ? currentConfig.objetivo_total.toLocaleString() : "0"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Meta por Líder</span>
                    <span className="text-xl md:text-2xl font-black text-blue-500">
                      {currentConfig.meta_por_lider ? currentConfig.meta_por_lider.toLocaleString() : "0"}
                    </span>
                  </div>
                </motion.div>
                {currentConfig.objetivo_total > 0 && currentConfig.meta_por_lider > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs font-bold text-blue-900 uppercase tracking-widest"
                  >
                    {Math.ceil(currentConfig.objetivo_total / currentConfig.meta_por_lider)} <span className="text-gray-500">líderes nesesarios</span>
                  </motion.p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
