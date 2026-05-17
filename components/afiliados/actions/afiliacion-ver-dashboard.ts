"use server";

import type { UserRPCData } from "@/hooks/sesion/actions";
import { getUserDataAction } from "@/hooks/sesion/actions";
import { listarUsuariosAction } from "./usuarios";
import { obtenerLugaresAction } from "./lugares";

export type AfiliacionVerDashboardPayload = {
  session: UserRPCData;
  todosUsuariosData: Awaited<ReturnType<typeof listarUsuariosAction>>;
  lugaresData: Awaited<ReturnType<typeof obtenerLugaresAction>>;
};

export async function loadAfiliacionVerDashboardAction(): Promise<AfiliacionVerDashboardPayload | null> {
  const session = await getUserDataAction();
  if (!session?.rol) {
    return null;
  }

  const arrAdmins = ["ADMINISTRADOR", "SUPER", "ADMIN"] as const;
  const esCualquierAdmin =
    session.rol === "SUPER" || session.rol === "ADMINISTRADOR" || session.rol === "ADMIN";

  const rolFiltro = esCualquierAdmin ? (["LIDER", ...arrAdmins] as string[]) : ["LIDER"];

  const [todosUsuariosData, lugaresData] = await Promise.all([
    listarUsuariosAction(rolFiltro),
    obtenerLugaresAction(),
  ]);

  return {
    session,
    todosUsuariosData,
    lugaresData,
  };
}
