"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Crown, Heart, User, Users } from "lucide-react";
import type { Afiliado, Lider } from "./esquemas";
import { motion } from "framer-motion";

interface Props {
  afiliados: Afiliado[];
  lideres: Lider[];
  onEditar: (afiliado: Afiliado) => void;
  onDataChange: () => void;
  searchTerm: string;
}

export default function AfiliadosGeneral({
  afiliados,
  lideres,
  onEditar,
  onDataChange,
  searchTerm,
}: Props) {
  const [liderAbiertoId, setLiderAbiertoId] = useState<string | null>(null);

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

  const afiliadosAgrupados = useMemo(() => {
    const grouped = new Map<string, Afiliado[]>();
    const term = searchTerm.toLowerCase();

    afiliados.forEach((afiliado) => {
      const liderId = afiliado.lider_id || "SIN_LIDER";
      const fullName =
        `${afiliado.nombres} ${afiliado.apellidos}`.toLowerCase();
      const dpi = afiliado.dpi || "";

      if (!searchTerm || fullName.includes(term) || dpi.includes(term)) {
        if (!grouped.has(liderId)) {
          grouped.set(liderId, []);
        }
        grouped.get(liderId)?.push(afiliado);
      }
    });

    const leadersMap = new Map(lideres.map((l) => [l.id, l]));
    const leaderGroups: Array<{ lider: Lider | null; afiliados: Afiliado[] }> =
      [];

    grouped.forEach((list, liderId) => {
      if (liderId !== "SIN_LIDER") {
        const lider = leadersMap.get(liderId);
        if (lider) {
          leaderGroups.push({ lider, afiliados: list });
        }
      }
    });

    if (grouped.has("SIN_LIDER")) {
      leaderGroups.push({
        lider: null,
        afiliados: grouped.get("SIN_LIDER") || [],
      });
    }

    return leaderGroups;
  }, [afiliados, lideres, searchTerm]);

  if (afiliadosAgrupados.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8 border rounded-lg p-4">
        No se encontraron miembros.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-1 py-2 flex-wrap">
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
              className={`flex justify-between items-center p-4 cursor-pointer ${colorClase} rounded-lg`}
              onClick={() => setLiderAbiertoId(isLiderAbierto ? null : liderId)}
            >
              <h3 className="text-base font-bold text-gray-800">
                Célula de:{" "}
                <span className="text-blue-700 uppercase">
                  {nombreLider} ({list.length})
                </span>
              </h3>
              <ChevronDown
                className={`h-5 w-5 text-gray-600 transition-transform ${isLiderAbierto ? "rotate-180" : ""}`}
              />
            </div>
            {/* Filtros removidos por instrucción de diseño */}

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
                                : "hover:bg-gray-50"
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
                            <td className="px-4 py-2 whitespace-nowrap font-mono">{afiliado.telefono || "—"}</td>
                            <td className="px-4 py-2 whitespace-nowrap font-bold">{calcularEdad(afiliado.nacimiento)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{afiliado.lugar_nombre || "—"}</td>
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
