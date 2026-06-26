import { z } from 'zod';

export const mensajeDevSchema = z.object({
  titulo: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }),
  mensaje: z.string().min(5, { message: 'El mensaje debe tener al menos 5 caracteres.' }),
  fecha_inicio: z.string().min(1, { message: 'La fecha de inicio es requerida.' }),
  fecha_fin: z.string().min(1, { message: 'La fecha de fin es requerida.' }),
  estado: z.string().min(1, { message: 'El estado es requerido.' }),
  activo: z.boolean(),
  user_id: z.string().optional().nullable(),
});

export type MensajeDevFormData = z.infer<typeof mensajeDevSchema>;

export type MensajeDev = MensajeDevFormData & {
  id: string;
  created_at: string;
};
