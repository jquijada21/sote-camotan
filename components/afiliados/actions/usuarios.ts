"use server";

import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/admin";

export async function listarUsuariosAction(rol_filtro?: string | string[]) {
  const supabase = await createClient();

  const queryPerfiles = supabase
    .from("info_perfil")
    .select(`
      user_id, 
      nombres, 
      apellidos, 
      activo, 
      rol_id,
      nivel_compromiso,
      roles!inner ( id, nombre )
    `)
    .order("nombres", { ascending: true });

  let filtroPerfiles = queryPerfiles;

  if (rol_filtro) {
    if (Array.isArray(rol_filtro)) {
      filtroPerfiles = queryPerfiles.in("roles.nombre", rol_filtro);
    } else {
      filtroPerfiles = queryPerfiles.eq("roles.nombre", rol_filtro);
    }
  }

  const [perfilesRes, authRes, rpcRes] = await Promise.all([
    filtroPerfiles,
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
    supabase.rpc("conteos_afiliados_por_lider"),
  ]);

  if (perfilesRes.error) throw new Error(perfilesRes.error.message);

  const perfiles = perfilesRes.data || [];
  const users = (authRes as any)?.data?.users || [];

  const conteoMap = new Map<string, { total: number; titulares: number; familiares: number }>();

  type RpcRow = { lider_id: string; total: number; titulares: number; familiares: number };
  const rpcOk = !rpcRes.error && Array.isArray(rpcRes.data);

  if (rpcOk) {
    (rpcRes.data as RpcRow[]).forEach((row) => {
      if (row.lider_id) {
        conteoMap.set(row.lider_id, {
          total: Number(row.total) || 0,
          titulares: Number(row.titulares) || 0,
          familiares: Number(row.familiares) || 0,
        });
      }
    });
  } else {
    const conteoRes = await supabase.from("afiliados").select("lider_id, familiar_de");
    if (conteoRes.error) throw new Error(conteoRes.error.message);
    const conteoRaw = conteoRes.data || [];
    conteoRaw.forEach((row) => {
      if (row.lider_id) {
        const current = conteoMap.get(row.lider_id) || { total: 0, titulares: 0, familiares: 0 };
        current.total++;
        if (row.familiar_de) {
          current.familiares++;
        } else {
          current.titulares++;
        }
        conteoMap.set(row.lider_id, current);
      }
    });
  }

  const userMap = new Map(users.map((u: any) => [u.id, u.email]));

  return perfiles.map((p: any) => ({
    id: p.user_id,
    email: (userMap.get(p.user_id) as string)?.replace(/@.*$/, "") || "",
    nombres: p.nombres,
    apellidos: p.apellidos,
    activo: p.activo,
    rol: p.roles?.nombre,
    rol_id: p.rol_id,
    nivel_compromiso: p.nivel_compromiso,
    conteoAfiliados: conteoMap.get(p.user_id)?.total || 0,
    conteoTitulares: conteoMap.get(p.user_id)?.titulares || 0,
    conteoFamiliares: conteoMap.get(p.user_id)?.familiares || 0,
  }));

}
