"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { obtenerPadronAction } from "./actions/padron";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { descargarExcelAoA } from "./reportes/descargarExcel";

type PadronFilaExcel = {
  dpi: string;
  nombre_completo: string;
  genero: string;
};

function normalizaPadronFilaExcel(v: unknown): PadronFilaExcel | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const dpi = o.dpi;
  const nombre = o.nombre_completo;
  if (typeof dpi !== "string" || typeof nombre !== "string") return null;
  const generoRaw = o.genero;
  const genero =
    typeof generoRaw === "string" ? generoRaw : String(generoRaw ?? "");
  return { dpi, nombre_completo: nombre, genero };
}

const CHUNK_PADRON_EXCEL = 2000;

export default function Padron() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exportandoExcel, setExportandoExcel] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["padron", page, pageSize, debouncedSearch],
    queryFn: () => obtenerPadronAction(page, pageSize, debouncedSearch),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev, // keeps previous data while fetching
  });

  const padronList = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const exportarTodoPadronExcel = async (): Promise<void> => {
    if (totalCount <= 0 || isLoading || isError) return;
    setExportandoExcel(true);
    try {
      const acumuladas: PadronFilaExcel[] = [];
      let paginaActual = 1;
      while (acumuladas.length < totalCount) {
        const resultado = await obtenerPadronAction(
          paginaActual,
          CHUNK_PADRON_EXCEL,
          debouncedSearch,
        );
        const dados = resultado.data ?? [];
        if (!dados.length) break;
        for (const fila of dados) {
          const n = normalizaPadronFilaExcel(fila);
          if (n) acumuladas.push(n);
        }
        if (dados.length < CHUNK_PADRON_EXCEL) break;
        paginaActual += 1;
        if (paginaActual > Math.ceil(totalCount / CHUNK_PADRON_EXCEL) + 2) break;
      }
      if (!acumuladas.length) {
        toast.error("No hay filas válidas para exportar.");
        return;
      }
      const filas: (string | number)[][] = [
        ["No.", "DPI", "Nombre Completo", "Género"],
        ...acumuladas.map((r, idx) => [
          idx + 1,
          r.dpi,
          r.nombre_completo,
          String(r.genero ?? ""),
        ]),
      ];
      descargarExcelAoA({
        nombreArchivoBase: debouncedSearch.trim()
          ? "padron-electoral-busqueda"
          : "padron-electoral",
        nombreHoja: "Padrón",
        filas,
      });
      toast.success(`Excel (${acumuladas.length} filas).`);
    } catch {
      toast.error("No se pudo generar el Excel.");
    } finally {
      setExportandoExcel(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">Padrón Electoral</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">
              {totalCount.toLocaleString()} registros
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={
              exportandoExcel ||
              isLoading ||
              isError ||
              totalCount === 0
            }
            onClick={() => {
              void exportarTodoPadronExcel();
            }}
            className="gap-2 shrink-0 font-bold border-green-200 bg-green-50/70 text-green-900 hover:bg-green-100"
            aria-label="Descargar padrón en Excel"
          >
            {exportandoExcel ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
            )}
            Excel
          </Button>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre o DPI..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1); // Reset page on type
            }}
            className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider w-16">
                  No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  DPI
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Nombre Completo
                </th>
                <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                  Género
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-red-500">
                    Error al cargar los datos del padrón.
                  </td>
                </tr>
              ) : padronList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron resultados en el padrón.
                  </td>
                </tr>
              ) : (
                padronList.map((persona: any, index: number) => (
                  <tr key={persona.dpi} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {persona.dpi}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {persona.nombre_completo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        persona.genero === 'M' || persona.genero === 'MASCULINO' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-pink-100 text-pink-800'
                      }`}>
                        {persona.genero}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex justify-center items-center py-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-2xl border-gray-100 shadow-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center justify-center min-w-[120px] h-12 px-6 rounded-2xl border border-gray-100 shadow-sm bg-white">
              <span className="text-xl font-black text-slate-900">
                {page} / {totalPages}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-2xl border-gray-100 shadow-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div className="relative ml-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="appearance-none outline-none h-12 pl-6 pr-12 rounded-2xl border border-gray-100 shadow-sm bg-white text-blue-600 font-black text-xl hover:bg-gray-50 cursor-pointer"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={1000}>1000</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
