"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { ChevronDown, Crown, Heart, User, Phone, MessageCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import type { Afiliado, Lider } from "./esquemas";
import { motion } from "framer-motion";

interface Props {
  afiliados: Afiliado[];
  lideres: Lider[];
  onEditar: (afiliado: Afiliado) => void;
  onDataChange: () => void;
  searchTerm: string;
  isLoading?: boolean;
  idUsuarioSesion?: string;
  rolUsuarioSesion?: string;
}

export default function AfiliadosGeneral({
  afiliados,
  lideres,
  onEditar,
  onDataChange,
  searchTerm,
  isLoading = false,
  idUsuarioSesion = "",
  rolUsuarioSesion = "",
}: Props) {
  const [liderAbiertoId, setLiderAbiertoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [exportandoId, setExportandoId] = useState<string | null>(null);

  const esAdminOSuper = ["ADMIN", "SUPER", "ADMINISTRADOR"].includes(rolUsuarioSesion.toUpperCase());

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

  const timestampArchivo = () => {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
  };

  const encabezado = [
    "No.", "Nombres", "Apellidos", "DPI", "Padrón", "Teléfono", "Teléfono 2", "Teléfono 3",
    "Edad", "Sexo", "Empadronado", "Líder", "Ubicación", "Sector",
    "Programa de Interés", "Religión", "Condición Especial", "Fecha de Registro"
  ];

  const construirFilasGrupo = (list: Afiliado[], lider: Lider | null) => {
    const liderRow = list.find((a) => !!a.es_lider) ?? list[0];
    const titulares = list.filter((a) => !a.familiar_de && a.id !== liderRow?.id);
    const familiaresPorTitular = new Map<string, Afiliado[]>();
    list.forEach(a => {
      if (a.familiar_de) {
        if (!familiaresPorTitular.has(a.familiar_de)) familiaresPorTitular.set(a.familiar_de, []);
        familiaresPorTitular.get(a.familiar_de)!.push(a);
      }
    });
    const ordenados: Afiliado[] = [];
    if (liderRow) {
      ordenados.push(liderRow);
      familiaresPorTitular.get(liderRow.id)?.forEach(f => ordenados.push(f));
    }
    titulares.forEach(t => {
      ordenados.push(t);
      familiaresPorTitular.get(t.id)?.forEach(f => ordenados.push(f));
    });

    const filas: (string | number)[][] = [];
    ordenados.forEach((a, idx) => {
      filas.push([
        idx + 1,
        a.nombres,
        a.apellidos,
        a.dpi || "—",
        a.no_padron || "—",
        a.telefono || "—",
        a.telefono2 || "—",
        a.telefono3 || "—",
        calcularEdad(a.nacimiento),
        a.sexo === "M" ? "Masculino" : "Femenino",
        a.empadronado ? "Sí" : "No",
        lider ? `${lider.nombres} ${lider.apellidos}` : "Sin Líder",
        a.lugar_nombre || "—",
        a.sector_nombre || "—",
        a.politica || "—",
        a.religion || "—",
        a.condicion_especial || "—",
        new Date(a.created_at).toLocaleDateString("es-GT"),
      ]);
    });
    return filas;
  };

  // Excel general MULTI-HOJA — solo ADMIN/SUPER
  const exportarExcelGeneral = () => {
    setExportando(true);
    try {
      const wb = XLSX.utils.book_new();
      afiliadosAgrupados.forEach(({ lider, afiliados: list }) => {
        const nombreHoja = (lider
          ? `${lider.nombres} ${lider.apellidos}`
          : "Sin Lider").slice(0, 31);
        const filas = [encabezado, ...construirFilasGrupo(list, lider)];
        const ws = XLSX.utils.aoa_to_sheet(filas);
        XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
      });
      XLSX.writeFile(wb, `miembros-general-${timestampArchivo()}.xlsx`);
    } finally {
      setExportando(false);
    }
  };

  // Excel individual por célula (una hoja)
  const exportarExcelCelula = (lider: Lider | null, list: Afiliado[]) => {
    const key = lider?.id || "sin-lider";
    setExportandoId(key);
    try {
      const wb = XLSX.utils.book_new();
      const nombreHoja = (lider
        ? `${lider.nombres} ${lider.apellidos}`
        : "Sin Lider").slice(0, 31);
      const filas = [encabezado, ...construirFilasGrupo(list, lider)];
      const ws = XLSX.utils.aoa_to_sheet(filas);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
      const nombreBase = lider
        ? `celula-${lider.nombres.toLowerCase().replace(/\s+/g, "-")}`
        : "celula-sin-lider";
      XLSX.writeFile(wb, `${nombreBase}-${timestampArchivo()}.xlsx`);
    } finally {
      setExportandoId(null);
    }
  };

  const afiliadosAgrupados = useMemo(() => {
    const grouped = new Map<string, Afiliado[]>();
    const term = searchTerm.toLowerCase();

    const afiliadosFiltradosPorRol = esAdminOSuper
      ? afiliados
      : afiliados.filter((a) => a.lider_id === idUsuarioSesion);

    afiliadosFiltradosPorRol.forEach((afiliado) => {
      const liderId = afiliado.lider_id || "SIN_LIDER";
      const fullName = `${afiliado.nombres} ${afiliado.apellidos}`.toLowerCase();
      const dpi = afiliado.dpi || "";

      if (!searchTerm || fullName.includes(term) || dpi.includes(term)) {
        if (!grouped.has(liderId)) grouped.set(liderId, []);
        grouped.get(liderId)?.push(afiliado);
      }
    });

    const leadersMap = new Map(lideres.map((l) => [l.id, l]));
    const leaderGroups: Array<{ lider: Lider | null; afiliados: Afiliado[] }> = [];

    grouped.forEach((list, liderId) => {
      if (liderId !== "SIN_LIDER") {
        const lider = leadersMap.get(liderId);
        if (lider) leaderGroups.push({ lider, afiliados: list });
      }
    });

    if (grouped.has("SIN_LIDER")) {
      leaderGroups.push({ lider: null, afiliados: grouped.get("SIN_LIDER") || [] });
    }

    return leaderGroups;
  }, [afiliados, lideres, searchTerm, idUsuarioSesion, esAdminOSuper]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse mt-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="border rounded-lg shadow-sm">
            <div className="flex justify-between items-center p-4 bg-gray-100/50 rounded-lg">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-5 bg-gray-200 rounded w-5"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (afiliadosAgrupados.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8 border rounded-lg p-4">
        No se encontraron miembros.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 py-2 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-700">
            <Crown className="w-3.5 h-3.5 text-orange-500" /> Líder
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-700">
            <Heart className="w-3.5 h-3.5 text-purple-500" /> Familiar
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
            <User className="w-3.5 h-3.5 text-blue-500" /> Afiliado
          </span>
        </div>
        {/* Excel General: multi-hoja, solo ADMIN/SUPER */}
        {esAdminOSuper && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exportando}
            onClick={exportarExcelGeneral}
            className="gap-2 font-bold border-green-200 bg-green-50/70 text-green-900 hover:bg-green-100 text-xs"
          >
            {exportando ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
            )}
            Excel General (por célula)
          </Button>
        )}
      </div>

      {afiliadosAgrupados.map(({ lider, afiliados: list }) => {
        const liderId = lider?.id || "SIN_LIDER";
        const isLiderAbierto = liderAbiertoId === liderId;
        const nombreLider = lider
          ? `${lider.nombres} ${lider.apellidos}`
          : "Miembros sin Líder asignado";
        const colorClase = lider
          ? (lider.rol === "SUPER" || lider.rol === "ADMINISTRADOR" || lider.rol === "ADMIN")
            ? "bg-indigo-50 border-indigo-200"
            : "bg-gray-50 border-gray-200"
          : "bg-red-50 border-red-200";

        return (
          <div key={liderId} className="border rounded-lg shadow-sm">
            <div
              className={`flex justify-between items-center px-4 py-3 cursor-pointer ${colorClase} rounded-lg gap-2`}
              onClick={() => setLiderAbiertoId(isLiderAbierto ? null : liderId)}
            >
              <h3 className="text-base font-bold text-gray-800 flex-1 min-w-0">
                Célula de:{" "}
                <span className="text-blue-700 uppercase">
                  {nombreLider} ({list.length})
                </span>
              </h3>
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Botón Excel individual por célula */}
                <button
                  type="button"
                  disabled={exportandoId === liderId}
                  onClick={() => exportarExcelCelula(lider, list)}
                  className="flex items-center gap-1 text-[10px] font-bold text-green-700 hover:bg-green-100 px-2 py-1 rounded-md transition-colors border border-green-200 bg-green-50"
                  title="Descargar Excel de esta célula"
                >
                  {exportandoId === liderId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3 h-3" />
                  )}
                  Excel
                </button>
                <ChevronDown
                  className={`h-5 w-5 text-gray-600 transition-transform ${isLiderAbierto ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            <motion.div
              initial={false}
              animate={{ height: isLiderAbierto ? "auto" : 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {(() => {
                const liderRow = list.find((a) => !!a.es_lider) ?? list[0];
                const titulares = list.filter((a) => !a.familiar_de && a.id !== liderRow?.id);
                const familiaresPorTitular = new Map<string, Afiliado[]>();
                list.forEach(a => {
                  if (a.familiar_de) {
                    if (!familiaresPorTitular.has(a.familiar_de)) familiaresPorTitular.set(a.familiar_de, []);
                    familiaresPorTitular.get(a.familiar_de)!.push(a);
                  }
                });

                const todosOrdenados: Array<{ afiliado: Afiliado; tipo: "lider" | "familiar" | "miembro"; depth: number }> = [];
                if (liderRow) todosOrdenados.push({ afiliado: liderRow, tipo: "lider", depth: 0 });
                if (liderRow && familiaresPorTitular.has(liderRow.id)) {
                  familiaresPorTitular.get(liderRow.id)!.forEach(fam => todosOrdenados.push({ afiliado: fam, tipo: "familiar", depth: 1 }));
                }
                titulares.forEach(titular => {
                  todosOrdenados.push({ afiliado: titular, tipo: "miembro", depth: 0 });
                  if (familiaresPorTitular.has(titular.id)) {
                    familiaresPorTitular.get(titular.id)!.forEach(fam => todosOrdenados.push({ afiliado: fam, tipo: "familiar", depth: 1 }));
                  }
                });

                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase">No.</th>
                          <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase">Nombre</th>
                          <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase">DPI</th>
                          <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase">Teléfono</th>
                          <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase">Edad</th>
                          <th className="px-4 py-2 text-left font-bold text-gray-600 uppercase">Ubicación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {todosOrdenados.map(({ afiliado, tipo, depth }, index) => (
                          <tr
                            key={afiliado.id}
                            className={`uppercase ${
                              tipo === "lider"
                                ? "bg-orange-50 hover:bg-orange-100"
                                : tipo === "familiar"
                                ? "bg-purple-50/50 hover:bg-purple-100/80"
                                : "bg-blue-50/40 hover:bg-blue-100/60"
                            }`}
                          >
                            <td className={`px-4 py-2 whitespace-nowrap ${depth > 0 ? "pl-12" : ""}`}>
                              {tipo === "lider" ? (
                                <span className="flex items-center gap-1 text-orange-600 font-black">
                                  <Crown className="w-3 h-3" /> {index + 1}
                                </span>
                              ) : tipo === "familiar" ? (
                                <span className="flex items-center gap-1 text-purple-600 font-black">
                                  <Heart className="w-3 h-3" /> {index + 1}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-blue-600 font-black">
                                  <User className="w-3 h-3" /> {index + 1}
                                </span>
                              )}
                            </td>
                            <td className={`px-4 py-2 whitespace-nowrap font-bold ${
                              tipo === "lider" ? "text-orange-800" : tipo === "familiar" ? "text-purple-800" : "text-blue-800"
                            }`}>
                              {afiliado.nombres} {afiliado.apellidos}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap font-mono">{afiliado.dpi || "—"}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{afiliado.telefono || "—"}</span>
                                {afiliado.telefono && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <a
                                      href={`tel:+502${afiliado.telefono.replace(/\D/g, "")}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 text-blue-600 hover:underline rounded transition-colors"
                                      title="Llamar"
                                    >
                                      <Phone className="w-3.5 h-3.5 fill-current" />
                                    </a>
                                    <a
                                      href={generarLinkWhatsapp(afiliado.telefono)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 text-green-600 hover:underline rounded transition-colors"
                                      title="WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap font-bold">{calcularEdad(afiliado.nacimiento)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-800">{afiliado.lugar_nombre || "—"}</span>
                                {afiliado.sector_nombre && (
                                  <span className="text-[10px] text-gray-500 uppercase font-medium mt-0.5">
                                    Sector: {afiliado.sector_nombre}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
