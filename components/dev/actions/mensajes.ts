'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { mensajeDevSchema, MensajeDev, MensajeDevFormData } from '../zod';

// ── Obtener todos los mensajes ──────────────────────────────────────────────
export async function getMensajesDev(): Promise<MensajeDev[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dev_mensajes')
    .select('*')
    .is('user_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getMensajesDev]', error.message);
    return [];
  }

  return (data as MensajeDev[]) || [];
}

// ── Obtener mensajes activos vigentes (para mostrar en el layout) ───────────
export async function getMensajesActivosDev(): Promise<MensajeDev[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ahora = new Date().toISOString();

  let query = supabase
    .from('dev_mensajes')
    .select('*')
    .eq('activo', true)
    .lte('fecha_inicio', ahora)
    .gte('fecha_fin', ahora);

  if (user?.id) {
    query = query.or(`user_id.is.null,user_id.eq.${user.id}`);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[getMensajesActivosDev]', error.message);
    return [];
  }

  return (data as MensajeDev[]) || [];
}

// ── Crear mensaje ───────────────────────────────────────────────────────────
export async function crearMensajeDev(
  formData: MensajeDevFormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = mensajeDevSchema.safeParse(formData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('dev_mensajes').insert({
    titulo: parsed.data.titulo,
    mensaje: parsed.data.mensaje,
    fecha_inicio: parsed.data.fecha_inicio,
    fecha_fin: parsed.data.fecha_fin,
    estado: parsed.data.estado,
    activo: parsed.data.activo,
    user_id: parsed.data.user_id || null,
  });

  if (error) {
    console.error('[crearMensajeDev]', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/protected/dev');
  return { ok: true };
}

// ── Editar mensaje ──────────────────────────────────────────────────────────
export async function editarMensajeDev(
  id: string,
  formData: MensajeDevFormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = mensajeDevSchema.safeParse(formData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('dev_mensajes')
    .update({
      titulo: parsed.data.titulo,
      mensaje: parsed.data.mensaje,
      fecha_inicio: parsed.data.fecha_inicio,
      fecha_fin: parsed.data.fecha_fin,
      estado: parsed.data.estado,
      activo: parsed.data.activo,
      user_id: parsed.data.user_id || null,
    })
    .eq('id', id);

  if (error) {
    console.error('[editarMensajeDev]', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/protected/dev');
  return { ok: true };
}

// ── Eliminar mensaje ────────────────────────────────────────────────────────
export async function eliminarMensajeDev(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('dev_mensajes').delete().eq('id', id);

  if (error) {
    console.error('[eliminarMensajeDev]', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/protected/dev');
  return { ok: true };
}
