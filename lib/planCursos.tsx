'use client'
// Qué puede hacer la terapeuta en la sección Cursos, según su plan (lo decide app/(app)/courses/layout.tsx).
// · premium: todo.  · pausa: bajó a Básico y tiene cursos/descargables: mira y atiende a sus alumnas, sin crear, publicar ni vender.
// La pantalla es solo el primer candado: el servidor y la base dicen lo mismo.
import { createContext } from 'react'
export const PlanCursos = createContext<{ nivel: 'premium' | 'basico' | 'sin_acceso'; pausa: boolean }>({ nivel: 'premium', pausa: false })
