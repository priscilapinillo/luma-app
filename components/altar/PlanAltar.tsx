'use client'
// Qué puede hacer la terapeuta en el Altar de ideas (lo decide app/(app)/altar/layout.tsx).
// La pantalla es solo el primer candado: la base (luma_candado_pizarras) revisa lo mismo en cada guardado.
import { createContext } from 'react'
export const PlanAltar = createContext<{ nivel: 'basico' | 'premium'; userId: string }>({ nivel: 'basico', userId: '' })
