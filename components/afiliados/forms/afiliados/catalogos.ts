"use server";

import { createClient } from "@/utils/supabase/server";

export type Politica = { id: number; nombre: string };
export type SubPolitica = { id: number; politica_id: number; nombre: string };
export type Lugar = { id: number; nombre: string; sector_id: number | null; sector_nombre: string | null };

export async function obtenerPoliticasAction(): Promise<Politica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sis_politicas")
    .select("id, nombre")
    .order("nombre");
  if (error) return [];
  return data ?? [];
}

export async function obtenerSubPoliticasAction(politica_id: number): Promise<SubPolitica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sis_politicas_sub")
    .select("id, politica_id, nombre")
    .eq("politica_id", politica_id)
    .order("nombre");
  if (error) return [];
  return data ?? [];
}

export async function crearSubPoliticaAction(politica_id: number, nombre: string): Promise<SubPolitica | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sis_politicas_sub")
    .insert({ politica_id, nombre })
    .select("id, politica_id, nombre")
    .single();
  if (error) return null;
  return data;
}

export async function obtenerLugaresAction(): Promise<Lugar[]> {
  const supabase = await createClient();
  const [lugaresRes, sectoresRes] = await Promise.all([
    supabase.from("lugares").select("id, nombre, sector_id").order("nombre"),
    supabase.from("sectores").select("id, nombre").order("nombre"),
  ]);

  const lugares = lugaresRes.data ?? [];
  const sectores = sectoresRes.data ?? [];
  const sectorMap = new Map(sectores.map((s: any) => [s.id, s.nombre]));

  return lugares.map((l: any) => ({
    id: l.id,
    nombre: l.nombre,
    sector_id: l.sector_id,
    sector_nombre: l.sector_id ? sectorMap.get(l.sector_id) || null : null,
  }));
}

export type Sector = { id: number; nombre: string };

export async function crearLugarAction(nombre: string, sector_id: number): Promise<Lugar | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lugares")
    .insert({ nombre: nombre.trim(), sector_id })
    .select("id, nombre, sector_id")
    .single();
  if (error) return null;
  if (!data) return null;

  // Resolve sector name
  const { data: sector } = await supabase.from("sectores").select("nombre").eq("id", sector_id).single();
  return {
    id: data.id,
    nombre: data.nombre,
    sector_id: data.sector_id,
    sector_nombre: sector?.nombre || null,
  };
}

export async function obtenerSectoresAction(): Promise<Sector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sectores")
    .select("id, nombre");
  if (error) return [];
  
  const sectores = data ?? [];
  return sectores.sort((a, b) => {
    if (a.id === 0) return 1;
    if (b.id === 0) return -1;
    return a.id - b.id;
  });
}

export type Beneficio = { id: number; nombre: string };

export async function obtenerBeneficiosAction(): Promise<Beneficio[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficios")
    .select("id, nombre")
    .order("nombre");
  if (error) return [];
  return data ?? [];
}

export async function crearBeneficioAction(nombre: string): Promise<Beneficio | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("beneficios")
    .insert({ nombre: nombre.trim() })
    .select("id, nombre")
    .single();
  if (error) return null;
  return data;
}

export async function crearSectorAction(nombre: string): Promise<Sector | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sectores")
    .insert({ nombre: nombre.trim() })
    .select("id, nombre")
    .single();
  if (error) return null;
  return data;
}

export async function editarSectorAction(id: number, nombre: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sectores").update({ nombre: nombre.trim() }).eq("id", id);
  return !error;
}

export async function eliminarSectorAction(id: number) {
  const supabase = await createClient();
  const { count } = await supabase.from("lugares").select("id", { count: "exact", head: true }).eq("sector_id", id);
  if (count && count > 0) return { error: "No se puede eliminar el sector porque tiene lugares asignados." };
  
  const { error } = await supabase.from("sectores").delete().eq("id", id);
  return { error: error?.message };
}

export async function editarLugarAction(id: number, nombre: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lugares").update({ nombre: nombre.trim() }).eq("id", id);
  return !error;
}

export async function eliminarLugarAction(id: number) {
  const supabase = await createClient();
  const { count } = await supabase.from("afiliados").select("id", { count: "exact", head: true }).eq("lugar_id", id);
  if (count && count > 0) return { error: "No se puede eliminar el lugar porque está asignado a afiliados." };

  const { error } = await supabase.from("lugares").delete().eq("id", id);
  return { error: error?.message };
}

export async function obtenerPoliticasConSubsAction(): Promise<
  { politica: string; subs: string[] }[]
> {
  const supabase = await createClient();
  const [polRes, subRes] = await Promise.all([
    supabase.from("sis_politicas").select("id, nombre").order("nombre"),
    supabase.from("sis_politicas_sub").select("id, politica_id, nombre").order("nombre"),
  ]);

  const politicas = polRes.data ?? [];
  const subs = subRes.data ?? [];

  return politicas.map((p: any) => ({
    politica: p.nombre,
    subs: subs
      .filter((s: any) => s.politica_id === p.id)
      .map((s: any) => s.nombre),
  }));
}
