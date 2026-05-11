"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Loader2, Check, Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { toast } from "react-toastify";

import {
  guardarAfiliadoAction,
  buscarDpiEnPadronAction,
  buscarDpiEnAfiliadosAction,
} from "./actions";
import { obtenerReligionesUnicasAction } from "../../actions/afiliados";
import { type AfiliadoFormData, type Afiliado } from "./schemas";
import {
  useAfiliadosForm,
  useInicializarFormulario,
  useBuscadorLider,
} from "./hooks";
import useUserData from "@/hooks/sesion/useUserData";
import {
  obtenerPoliticasAction,
  obtenerSubPoliticasAction,
  crearSubPoliticaAction,
  obtenerLugaresAction,
  obtenerBeneficiosAction,
  crearBeneficioAction,
  type Politica,
  type SubPolitica,
  type Lugar,
  type Beneficio,
} from "./catalogos";
import { useQuery } from "@tanstack/react-query";
import { obtenerConfiguracionAction } from "@/components/dashboard/actions/configuracion";

type LiderType = {
  id: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  afiliadoAEditar?: Afiliado | null;
  liderPredefinidoId?: string | null;
  lugares: Lugar[];
  lideres: LiderType[];
  afiliados: Afiliado[];
  isFirstMember?: boolean;
  datosLider?: LiderType | null;
  familiarDeId?: string | null;
}

function ComboSearch({
  placeholder,
  items,
  value,
  onSelect,
  onCreateNew,
  disabled = false,
  loading = false,
  groupKey,
}: {
  placeholder: string;
  items: { id: number; nombre: string; [key: string]: any }[];
  value: number | null | undefined;
  onSelect: (id: number) => void;
  onCreateNew?: (nombre: string) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  groupKey?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find((i) => i.id === value);

  useEffect(() => {
    if (selected) setQuery(selected.nombre);
    else setQuery("");
  }, [value, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = items.filter((i: any) => {
    const queryLower = query.toLowerCase().trim();
    if (i.nombre.toLowerCase().includes(queryLower)) return true;

    if (groupKey) {
      const baseGroup = i[groupKey] ? String(i[groupKey]).toLowerCase() : "";
      if (baseGroup.includes(queryLower)) return true;

      const id = i.sector_id || 0;

      // Prevenir que "sector 1" coincida con "sector 11"
      const matchSector = queryLower.match(/^sector\s+(\d+)$/);
      if (matchSector) {
        if (id === parseInt(matchSector[1], 10)) return true;
      } else {
        const formattedGroup =
          id === 0 ? baseGroup : `sector ${id}: ${baseGroup}`.toLowerCase();
        if (formattedGroup.includes(queryLower)) return true;
      }
    }
    return false;
  });
  const exactMatch = items.find(
    (i) => i.nombre.toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = onCreateNew && query.trim().length > 1 && !exactMatch;

  const handleCreate = async () => {
    if (!onCreateNew) return;
    setCreating(true);
    await onCreateNew(query.trim());
    setCreating(false);
    setOpen(false);
  };

  // Agrupar ítems por groupKey si se proporciona
  const grouped = useMemo(() => {
    if (!groupKey) return null;
    const map: Record<string, typeof filtered> = {};
    const sectorIdMap: Record<string, number> = {};
    filtered.forEach((item: any) => {
      const baseName = item[groupKey] || "Sin Clasificar";
      const id = item.sector_id || 0;
      const group = id === 0 ? baseName : `Sector ${id}: ${baseName}`;

      if (!map[group]) map[group] = [];
      map[group].push(item);
      sectorIdMap[group] = id;
    });

    // Ordenar los grupos por ID, dejando el ID 0 al final
    return Object.entries(map).sort(([nameA], [nameB]) => {
      const idA = sectorIdMap[nameA] || 0;
      const idB = sectorIdMap[nameB] || 0;
      if (idA === 0 && idB !== 0) return 1;
      if (idB === 0 && idA !== 0) return -1;
      return idA - idB;
    });
  }, [filtered, groupKey]);

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            disabled={disabled || loading}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (!e.target.value) onSelect(0);
            }}
            onFocus={() => setOpen(true)}
            className="w-full h-10 px-3 border rounded-md text-sm bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {loading && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>
      </div>
      <AnimatePresence>
        {open && (filtered.length > 0 || canCreate) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {grouped
              ? grouped.map(([group, groupItems]) => (
                  <div key={group}>
                    <div className="sticky top-0 bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 uppercase border-b border-blue-100 z-10">
                      📍 {group}
                    </div>
                    {groupItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full text-left px-3 pl-5 py-2 text-sm hover:bg-blue-50 flex items-center justify-between group"
                        onClick={() => {
                          onSelect(item.id);
                          setQuery(item.nombre);
                          setOpen(false);
                        }}
                      >
                        {item.nombre}
                        {value === item.id && (
                          <Check className="w-3 h-3 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              : filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between group"
                    onClick={() => {
                      onSelect(item.id);
                      setQuery(item.nombre);
                      setOpen(false);
                    }}
                  >
                    {item.nombre}
                    {value === item.id && (
                      <Check className="w-3 h-3 text-blue-600" />
                    )}
                  </button>
                ))}
            {canCreate && (
              <button
                type="button"
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 font-bold border-t flex items-center gap-2 hover:bg-blue-50"
                onClick={handleCreate}
              >
                {creating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Crear "{query.trim()}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AfiliadosForm({
  isOpen,
  onClose,
  onSave,
  afiliadoAEditar,
  liderPredefinidoId,
  lideres,
  afiliados = [],
  isFirstMember = false,
  datosLider = null,
  familiarDeId = null,
}: Props) {
  const { rol_id } = useUserData();
  const esAdmin = rol_id === 1 || rol_id === 2;

  const { data: configSis } = useQuery({
    queryKey: ["config_sistema"],
    queryFn: () => obtenerConfiguracionAction(),
  });
  const padronHabilitado = configSis?.padron === true;

  const isEditMode = !!afiliadoAEditar;
  const [step, setStep] = useState(
    isEditMode || isFirstMember || !padronHabilitado ? 2 : 1,
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [mostrandoNuevaReligion, setMostrandoNuevaReligion] = useState(false);
  const [mostrandoNuevoSub, setMostrandoNuevoSub] = useState(false);

  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [subPoliticas, setSubPoliticas] = useState<SubPolitica[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [politicaSeleccionada, setPoliticaSeleccionada] = useState<
    number | null
  >(null);
  const [subPoliticaSeleccionada, setSubPoliticaSeleccionada] = useState<
    number | null
  >(null);
  const [lugarSeleccionado, setLugarSeleccionado] = useState<number>(0);
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [beneficioSeleccionado, setBeneficioSeleccionado] = useState<
    number | null
  >(null);
  const [mostrandoNuevoBeneficio, setMostrandoNuevoBeneficio] = useState(false);
  const [nuevoBeneficioNombre, setNuevoBeneficioNombre] = useState("");
  const [creandoBeneficio, setCreandoBeneficio] = useState(false);

  const form = useAfiliadosForm();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    setError,
  } = form;

  const sexoActual = watch("sexo");
  const religionActual = watch("religion");
  const dpiActual = watch("dpi");
  const buscador = useBuscadorLider(lideres, setValue);
  const [buscandoDpi, setBuscandoDpi] = useState(false);
  const [padronStatus, setPadronStatus] = useState<
    "none" | "found" | "not_found"
  >("none");
  const [yaRegistrado, setYaRegistrado] = useState<{
    afiliadoNombre: string;
    liderNombre: string;
  } | null>(null);

  const [religionesRemotas, setReligionesRemotas] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      obtenerReligionesUnicasAction().then((res) => setReligionesRemotas(res));
    }
  }, [isOpen]);

  // Extraer las religiones existentes (omitir Católico y Evangélico que ya son fijas)
  const religionesExistentes = Array.from(
    new Set(
      [
        ...(afiliados || []).map((a) => a.religion),
        ...religionesRemotas,
      ].filter(Boolean),
    ),
  ).filter((r) => r !== "Católico" && r !== "Evangélico");

  const esReligionCustom =
    religionActual &&
    !["Católico", "Evangélico", ...religionesExistentes].includes(
      religionActual,
    );

  const handleVerificarDpi = async () => {
    const dpiLimpio = dpiActual?.replace(/\s/g, "");
    if (dpiActual !== dpiLimpio) setValue("dpi", dpiLimpio || "");

    if (!dpiLimpio || dpiLimpio.length !== 13) {
      setError("dpi", { type: "manual", message: "Ingrese 13 dígitos válidos" });
      return;
    }

    setBuscandoDpi(true);
    setYaRegistrado(null);

    const enSistema = await buscarDpiEnAfiliadosAction(dpiLimpio);
    if (enSistema?.yaRegistrado) {
      setYaRegistrado({
        afiliadoNombre: enSistema.afiliadoNombre,
        liderNombre: enSistema.liderNombre,
      });
      setBuscandoDpi(false);
      return;
    }

    const res = await buscarDpiEnPadronAction(dpiLimpio);
    if (res && res.encontrado) {
      setValue("nombres", res.nombres);
      setValue("apellidos", res.apellidos);
      setValue("sexo", res.genero as "M" | "F");
      setValue("empadronado", true);
      setPadronStatus("found");
      toast.success("¡Afiliado encontrado en TSE!");
    } else {
      setPadronStatus("not_found");
      setValue("empadronado", false);
      toast.warning("No encontrado en TSE, pero puedes continuar.");
    }
    setBuscandoDpi(false);
    setStep(2);
  };

  useEffect(() => {
    if (isEditMode || isFirstMember || !padronHabilitado) setStep(2);
    else setStep(1);
    setPadronStatus("none");
    setYaRegistrado(null);
  }, [isOpen, isEditMode, isFirstMember, padronHabilitado]);

  useInicializarFormulario(
    isOpen,
    afiliadoAEditar,
    liderPredefinidoId,
    lideres,
    form,
    buscador.setLiderSearch,
    buscador.setShowLiderSuggestions,
    isFirstMember,
    datosLider,
    familiarDeId,
  );

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) setIsLoadingData(true);
      Promise.all([
        obtenerPoliticasAction(),
        obtenerLugaresAction(),
        obtenerBeneficiosAction(),
      ]).then(async ([p, l, b]) => {
        setPoliticas(p);
        setLugares(l);
        setBeneficios(b);
        if (afiliadoAEditar) {
          const pid = (afiliadoAEditar as any).politica_id || null;
          const spid = (afiliadoAEditar as any).sub_politica_id || null;
          const lid = afiliadoAEditar.lugar_id || 0;
          const bid = (afiliadoAEditar as any).beneficio_id || null;
          setPoliticaSeleccionada(pid);
          setSubPoliticaSeleccionada(spid);
          setLugarSeleccionado(lid);
          setBeneficioSeleccionado(bid);
          if (pid) {
            const subs = await obtenerSubPoliticasAction(pid);
            setSubPoliticas(subs);
          }
        } else {
          setPoliticaSeleccionada(null);
          setSubPoliticaSeleccionada(null);
          setSubPoliticas([]);
          setLugarSeleccionado(0);
          setBeneficioSeleccionado(null);
        }
        setIsLoadingData(false);
      });
    }
  }, [isOpen, afiliadoAEditar, isEditMode]);

  useEffect(() => {
    if (isOpen && afiliadoAEditar?.religion) {
      const valor = afiliadoAEditar.religion;
      const esEstandar = ["Católico", "Evangélico"].includes(valor);
      if (!esEstandar) setValue("religion", valor);
    }
  }, [isOpen, isEditMode, afiliadoAEditar, setValue]);

  const handlePoliticaChange = async (id: number) => {
    setPoliticaSeleccionada(id || null);
    setSubPoliticaSeleccionada(null);
    setValue("politica_id" as any, id || null);
    setValue("sub_politica_id" as any, null);
    setSubPoliticas([]);
    if (id) {
      setLoadingSubs(true);
      const subs = await obtenerSubPoliticasAction(id);
      setSubPoliticas(subs);
      setLoadingSubs(false);
    }
  };

  const handleCrearSubPolitica = async (nombre: string) => {
    if (!politicaSeleccionada) return;
    const nueva = await crearSubPoliticaAction(politicaSeleccionada, nombre);
    if (nueva) {
      setSubPoliticas((prev) =>
        [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setSubPoliticaSeleccionada(nueva.id);
      setValue("sub_politica_id" as any, nueva.id);
      toast.success("Subpolítica creada");
    }
  };

  const handleCrearBeneficio = async () => {
    if (!nuevoBeneficioNombre.trim()) return;
    setCreandoBeneficio(true);
    const nuevo = await crearBeneficioAction(nuevoBeneficioNombre.trim());
    if (nuevo) {
      setBeneficios((prev) =>
        [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setBeneficioSeleccionado(nuevo.id);
      setValue("beneficio_id" as any, nuevo.id);
      setMostrandoNuevoBeneficio(false);
      setNuevoBeneficioNombre("");
      toast.success("Beneficio creado");
    } else {
      toast.error("Error al crear el beneficio");
    }
    setCreandoBeneficio(false);
  };

  const onSubmit = async (formData: any) => {
    const datosProcesados = {
      ...formData,
      lugar_id: lugarSeleccionado,
      politica_id: null,
      sub_politica_id: null,
      beneficio_id: beneficioSeleccionado,
      religion: mostrandoNuevaReligion
        ? formData.religion_otra
        : formData.religion,
      ...(isFirstMember && !afiliadoAEditar ? { es_lider: true } : {}),
    };
    delete (datosProcesados as any).religion_otra;

    const res = await guardarAfiliadoAction(
      datosProcesados as AfiliadoFormData,
      afiliadoAEditar?.id,
    );
    if (res?.error) {
      if (res.field) {
        setError(res.field as any, { type: "manual", message: res.error });
        if ((res as any).dpiDuplicado) {
          setYaRegistrado((res as any).dpiDuplicado);
        }
      } else {
        toast.error(`Error: ${res.error}`);
      }
      return;
    }

    toast.success(
      `Afiliado ${isEditMode ? "actualizado" : "creado"} correctamente.`,
    );
    setMostrandoNuevaReligion(false);
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 font-sans">
      <motion.div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg md:max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold uppercase">
            {isEditMode
              ? "Editar Afiliado"
              : step === 1
                ? "Verificar DPI"
                : "Completar Datos"}
          </h2>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 && !isEditMode ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 flex flex-col py-8"
            >
              <div className="text-center space-y-2">
                <Image
                  src="/gif/afiliados/gif0.gif"
                  alt="Animación"
                  width={60}
                  height={60}
                  unoptimized
                  className="mx-auto"
                />
                <p className="text-sm font-bold text-gray-500 uppercase">
                  Ingrese el DPI para buscar en el sistema de afiliación TSE
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  {...register("dpi")}
                  placeholder="DPI (13 dígitos sin espacios)"
                  disabled={buscandoDpi}
                  className="h-14 text-center text-xl font-bold tracking-widest placeholder:tracking-normal"
                  maxLength={13}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleVerificarDpi();
                    }
                  }}
                />
                {errors.dpi && (
                  <p className="text-xs text-red-500 text-center font-bold">
                    {errors.dpi.message}
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={handleVerificarDpi}
                disabled={buscandoDpi || !dpiActual || dpiActual.length < 13}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold uppercase"
              >
                {buscandoDpi ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>

              {yaRegistrado && (
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border-2 border-red-300 bg-red-50 text-red-800 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-black uppercase">¡DPI ya registrado!</p>
                  </div>
                  <p className="text-sm font-bold">{yaRegistrado.afiliadoNombre}</p>
                  <p className="text-[11px] text-red-600">
                    Célula del líder:{" "}
                    <span className="font-black">{yaRegistrado.liderNombre}</span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setYaRegistrado(null); setValue("dpi", ""); }}
                    className="mt-1 text-[10px] font-bold uppercase text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    Limpiar DPI
                  </Button>
                </div>
              )}
            </motion.div>
          ) : isLoadingData ? (
            <div className="space-y-4 animate-pulse pt-4">
              <div className="flex gap-4">
                <div className="h-10 bg-gray-100 rounded-md flex-1"></div>
                <div className="h-10 bg-gray-100 rounded-md flex-1"></div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 bg-gray-100 rounded-md flex-1"></div>
                <div className="h-10 bg-gray-100 rounded-md flex-1"></div>
              </div>
              <div className="h-10 bg-gray-100 rounded-md w-full"></div>
              <div className="h-10 bg-gray-100 rounded-md w-full"></div>
              <div className="h-10 bg-gray-100 rounded-md w-full"></div>
              <div className="h-10 bg-gray-100 rounded-md w-full"></div>

              <div className="flex justify-between mt-6 border-t pt-4">
                <div className="h-10 bg-gray-100 rounded-md w-24"></div>
                <div className="flex gap-2">
                  <div className="h-10 bg-gray-100 rounded-md w-24"></div>
                  <div className="h-10 bg-gray-200 rounded-md w-24"></div>
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* STATUS BANNER TSE */}
              {padronHabilitado &&
                !isEditMode &&
                padronStatus !== "none" &&
                !yaRegistrado && (
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 border text-xs font-bold uppercase ${
                      padronStatus === "found"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-orange-50 border-orange-200 text-orange-700"
                    }`}
                  >
                    {padronStatus === "found" ? (
                      <>
                        <Check className="w-4 h-4" /> AFILIADO EN PADRÓN TSE
                        ENCONTRADO - Datos prellenados
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" /> NO ENCONTRADO EN PADRÓN - Por
                        favor llene todos los campos
                      </>
                    )}
                  </div>
                )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLUMNA IZQUIERDA: DPI → Religión */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 uppercase">DPI</label>
                    <div className="relative">
                      <Input {...register("dpi")} placeholder="DPI" readOnly={!isEditMode && !isFirstMember && padronHabilitado} className={!isEditMode && !isFirstMember && padronHabilitado ? "bg-gray-100" : ""} />
                      {padronHabilitado && padronStatus === "found" && !isEditMode && <Check className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                    </div>
                    {errors.dpi && !yaRegistrado && <p className="text-[10px] text-red-500">{errors.dpi.message}</p>}
                    {yaRegistrado && (
                      <div className="flex flex-col gap-1 p-2.5 rounded-lg border-2 border-red-300 bg-red-50 text-red-800 text-center mt-1">
                        <div className="flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <p className="text-[10px] font-black uppercase">¡DPI ya registrado!</p>
                        </div>
                        <p className="text-xs font-bold">{yaRegistrado.afiliadoNombre}</p>
                        <p className="text-[10px] text-red-600">
                          Líder: <span className="font-black">{yaRegistrado.liderNombre}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">Nombres</label>
                      <Input {...register("nombres")} placeholder="Nombres" />
                      {errors.nombres && <p className="text-[10px] text-red-500">{errors.nombres.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">Apellidos</label>
                      <Input {...register("apellidos")} placeholder="Apellidos" />
                      {errors.apellidos && <p className="text-[10px] text-red-500">{errors.apellidos.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-green-600 uppercase">Teléfono (Whatsapp)</label>
                    <Input {...register("telefono")} placeholder="Teléfono" type="tel" inputMode="numeric" />
                    {errors.telefono && <p className="text-[10px] text-red-500">{errors.telefono.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Teléfono 2 (Opcional)</label>
                    <Input {...register("telefono2")} placeholder="Teléfono alternativo" type="tel" inputMode="numeric" />
                    {errors.telefono2 && <p className="text-[10px] text-red-500">{errors.telefono2.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Teléfono 3 (Opcional)</label>
                    <Input {...register("telefono3")} placeholder="Teléfono alternativo" type="tel" inputMode="numeric" />
                    {errors.telefono3 && <p className="text-[10px] text-red-500">{errors.telefono3.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase block leading-none">Nacimiento</label>
                      <Input type="date" {...register("nacimiento")} className="h-9 text-xs" />
                      {errors.nacimiento && <p className="text-[10px] text-red-500">{errors.nacimiento.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-blue-600 uppercase block leading-none">Sexo</label>
                      <div className="flex rounded-md border p-1 bg-gray-50 h-9">
                        <button type="button" onClick={() => setValue("sexo", "M")} className={`flex-1 rounded text-[10px] font-black transition-all ${sexoActual === "M" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:bg-gray-200"}`}>M</button>
                        <button type="button" onClick={() => setValue("sexo", "F")} className={`flex-1 rounded text-[10px] font-black transition-all ${sexoActual === "F" ? "bg-pink-600 text-white shadow-sm" : "text-gray-400 hover:bg-gray-200"}`}>F</button>
                      </div>
                      {errors.sexo && <p className="text-[10px] text-red-500">{errors.sexo.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-purple-600 uppercase">Religión</label>
                    <div className="flex gap-1 h-10">
                      {!mostrandoNuevaReligion ? (
                        <>
                          <select {...register("religion")} className="flex-1 px-3 border rounded-md text-sm bg-white">
                            <option value="">Seleccione...</option>
                            <option value="Católico">Católico</option>
                            <option value="Evangélico">Evangélico</option>
                            {religionesExistentes.map((r) => (<option key={r as string} value={r as string}>{r as string}</option>))}
                            {esReligionCustom && (<option value={religionActual}>{religionActual}</option>)}
                          </select>
                          <Button type="button" size="icon" variant="outline" className="shrink-0 border-green-200 text-green-600 h-10 w-10" onClick={() => setMostrandoNuevaReligion(true)}><Plus className="w-5 h-5" /></Button>
                        </>
                      ) : (
                        <>
                          <Input {...register("religion_otra")} placeholder="Religión..." className="flex-1 px-2" autoFocus onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = form.getValues("religion_otra"); if (v) { setValue("religion", v); setMostrandoNuevaReligion(false); } } }} />
                          <Button type="button" size="icon" variant="ghost" className="shrink-0 text-green-600 bg-green-50 hover:bg-green-100 h-10 w-10" onClick={() => { const v = form.getValues("religion_otra"); if (v) { setValue("religion", v); setMostrandoNuevaReligion(false); } }}><Check className="w-4 h-4" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="shrink-0 text-red-500 bg-red-50 hover:bg-red-100 h-10 w-10" onClick={() => { setMostrandoNuevaReligion(false); setValue("religion_otra", ""); }}><X className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                    {errors.religion && !mostrandoNuevaReligion && <p className="text-[10px] text-red-500">{errors.religion.message}</p>}
                  </div>
                </div>

                {/* COLUMNA DERECHA: Lugar → Condición Especial */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 uppercase block">
                      Lugar
                    </label>
                    <select
                      value={lugarSeleccionado || ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setLugarSeleccionado(id);
                        setValue("lugar_id", id);
                      }}
                      className="w-full h-10 px-3 border rounded-md text-sm bg-white"
                    >
                      <option value="">Seleccione un lugar...</option>
                      {Object.entries(
                        lugares.reduce<Record<string, typeof lugares>>(
                          (acc, l) => {
                            const grupo = l.sector_nombre ?? "Sin Sector";
                            if (!acc[grupo]) acc[grupo] = [];
                            acc[grupo].push(l);
                            return acc;
                          },
                          {},
                        ),
                      ).map(([sector, items]) => (
                        <optgroup key={sector} label={sector}>
                          {items.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {errors.lugar_id && (
                      <p className="text-[10px] text-red-500">
                        {errors.lugar_id.message}
                      </p>
                    )}
                    <p className="text-[10px] font-semibold text-blue-500">
                      Si el lugar no aparece, comunícate con administración.
                    </p>
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="space-y-1 w-3/4">
                      <label className="text-[10px] font-bold text-blue-600 uppercase">
                        No. Padrón
                      </label>
                      <Input
                        {...register("no_padron")}
                        placeholder="No. Padrón"
                      />
                      {errors.no_padron && (
                        <p className="text-[10px] text-red-500">
                          {errors.no_padron.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1 w-1/4">
                      <label className="text-[10px] font-bold text-blue-600 uppercase opacity-0 select-none">
                        TSE
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full text-blue-600 border-blue-200 text-[10px] font-bold uppercase h-10 shadow-sm"
                        onClick={() =>
                          window.open(
                            "https://tse.org.gt/reg-ciudadanos/sistema-de-estadisticas/consulta-de-afiliacion",
                            "_blank",
                          )
                        }
                      >
                        Ver. TSE
                      </Button>
                    </div>
                  </div>

                  <div className="hidden">
                    <label className="text-[10px] font-bold text-blue-600 uppercase block">
                      Programa de Interés
                    </label>
                    <select
                      value={politicaSeleccionada ?? ""}
                      onChange={(e) =>
                        handlePoliticaChange(Number(e.target.value))
                      }
                      className="w-full h-10 px-3 border rounded-md text-sm bg-white"
                    >
                      <option value="">Seleccione programa...</option>
                      {politicas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden">
                    {politicaSeleccionada && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-600 uppercase block">
                          Sub-programa
                        </label>
                        <div className="flex gap-2">
                          {!mostrandoNuevoSub ? (
                            <>
                              <select
                                value={subPoliticaSeleccionada ?? ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setSubPoliticaSeleccionada(val || null);
                                  setValue(
                                    "sub_politica_id" as any,
                                    val || null,
                                  );
                                }}
                                disabled={loadingSubs}
                                className="flex-1 h-10 px-3 border rounded-md text-sm bg-white disabled:opacity-50"
                              >
                                <option value="">
                                  Seleccione sub-programa...
                                </option>
                                {subPoliticas.map((sp) => (
                                  <option key={sp.id} value={sp.id}>
                                    {sp.nombre}
                                  </option>
                                ))}
                              </select>
                              {esAdmin && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="shrink-0 border-blue-200 text-blue-600 h-10 w-10"
                                  onClick={() => setMostrandoNuevoSub(true)}
                                >
                                  <Plus className="w-5 h-5" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <div className="flex gap-2 w-full">
                              <Input
                                placeholder="Nombre del nuevo sub-programa..."
                                className="flex-1"
                                autoFocus
                                onKeyDown={async (e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    await handleCrearSubPolitica(
                                      e.currentTarget.value,
                                    );
                                    setMostrandoNuevoSub(false);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="shrink-0 text-red-500 h-10 w-10"
                                onClick={() => setMostrandoNuevoSub(false)}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase block">
                      Beneficios Recibidos (Opcional)
                    </label>
                    {!mostrandoNuevoBeneficio ? (
                      <select
                        value={beneficioSeleccionado ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "otros") {
                            setMostrandoNuevoBeneficio(true);
                            setBeneficioSeleccionado(null);
                            setValue("beneficio_id" as any, null);
                          } else {
                            const num = val ? Number(val) : null;
                            setBeneficioSeleccionado(num);
                            setValue("beneficio_id" as any, num);
                          }
                        }}
                        className="w-full h-10 px-3 border rounded-md text-sm bg-white"
                      >
                        <option value="">Sin beneficio...</option>
                        {beneficios.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nombre}
                          </option>
                        ))}
                        <option value="otros">+ Otros (crear nuevo)</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={nuevoBeneficioNombre}
                          onChange={(e) =>
                            setNuevoBeneficioNombre(e.target.value)
                          }
                          placeholder="Nombre del nuevo beneficio..."
                          className="flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCrearBeneficio();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          disabled={
                            creandoBeneficio || !nuevoBeneficioNombre.trim()
                          }
                          onClick={handleCrearBeneficio}
                          className="shrink-0 bg-emerald-600 hover:bg-emerald-700 h-10 w-10"
                        >
                          {creandoBeneficio ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="shrink-0 text-red-500 bg-red-50 hover:bg-red-100 h-10 w-10"
                          onClick={() => {
                            setMostrandoNuevoBeneficio(false);
                            setNuevoBeneficioNombre("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-teal-600 uppercase block">
                      Condición Especial (Opcional)
                    </label>
                    <select
                      {...register("condicion_especial")}
                      className="w-full h-10 px-3 border rounded-md text-sm bg-white"
                    >
                      <option value="">Ninguna</option>
                      <option value="Discapacidad">Discapacidad</option>
                      <option value="Desnutrición">Desnutrición</option>
                      <option value="Adulto mayor">Adulto mayor</option>
                      <option value="Madre soltera">Madre soltera</option>
                    </select>
                  </div>

                </div>
              </div>

              <input
                type="hidden"
                {...register("lider_id")}
                value={liderPredefinidoId || ""}
              />

              <div className="flex justify-between items-center pt-4 border-t mt-2">
                {step === 2 &&
                  !isEditMode &&
                  !isFirstMember &&
                  padronHabilitado && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep(1);
                        setPadronStatus("none");
                      }}
                      className="text-xs font-bold uppercase text-gray-400"
                    >
                      Atrás
                    </Button>
                  )}

                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="text-xs font-bold uppercase"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 text-white hover:bg-green-700 text-xs font-bold uppercase px-8 h-10"
                  >
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
