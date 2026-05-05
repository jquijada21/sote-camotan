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

  // Ejecutamos TODO en paralelo para eficiencia, pero sin caché compleja que cause fallos en dev
  const [perfilesRes, authRes, conteoRes] = await Promise.all([
    filtroPerfiles,
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
    supabase.from("afiliados").select("lider_id")
  ]);

  if (perfilesRes.error) throw new Error(perfilesRes.error.message);
  if (conteoRes.error) throw new Error(conteoRes.error.message);

  const perfiles = perfilesRes.data || [];
  const users = (authRes as any)?.data?.users || [];
  const conteoRaw = conteoRes.data || [];

  const conteoMap = new Map();
  conteoRaw.forEach((row) => {
    if (row.lider_id) {
      conteoMap.set(row.lider_id, (conteoMap.get(row.lider_id) || 0) + 1);
    }
  });

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
    conteoAfiliados: conteoMap.get(p.user_id) || 0,
  }));
}
