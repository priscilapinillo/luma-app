const ARG_OFFSET_MINUTES = 180 // UTC-3 (Argentina, sin horario de verano)

function parseTimestamp(ts: string): Date {
  if (!ts) return new Date(NaN)
  let s = ts.trim()
  if (!s.includes('T')) s = s.replace(' ', 'T')
  // Supabase a veces devuelve "+00" sin ":00"
  if (/[+-]\d{2}$/.test(s)) s += ':00'
  // Sin timezone → Supabase devuelve UTC; forzar Z para no interpretar como hora local
  if (!/[Zz]|[+-]\d{2}:\d{2}$/.test(s)) s += 'Z'
  return new Date(s)
}

/** Guarda fecha+hora Argentina como ISO UTC (.000Z) para timestamptz */
export function localDateTimeToStorageIso(date: string, time: string): string {
  const [h, m] = time.split(':')
  const hh = parseInt(h, 10)
  const mm = parseInt(m || '0', 10)
  const [y, mo, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, hh + 3, mm, 0)).toISOString()
}

/** YYYY-MM-DD en hora Argentina desde timestamp UTC de Supabase */
export function utcTimestampToLocalDate(ts: string): string {
  const d = parseTimestamp(ts)
  if (isNaN(d.getTime())) return ''
  const ar = new Date(d.getTime() - ARG_OFFSET_MINUTES * 60_000)
  return `${ar.getUTCFullYear()}-${String(ar.getUTCMonth() + 1).padStart(2, '0')}-${String(ar.getUTCDate()).padStart(2, '0')}`
}

/** HH:mm en hora Argentina desde timestamp UTC de Supabase */
export function utcTimestampToLocalTime(ts: string): string {
  const d = parseTimestamp(ts)
  if (isNaN(d.getTime())) return '00:00'
  let totalMin = d.getUTCHours() * 60 + d.getUTCMinutes() - ARG_OFFSET_MINUTES
  if (totalMin < 0) totalMin += 1440
  const hh = Math.floor(totalMin / 60) % 24
  const mm = totalMin % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function horaAMin(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

function utcTimestampToLocalTimeMinutes(ts: string): number {
  return horaAMin(utcTimestampToLocalTime(ts))
}

/** Detecta si un slot de reserva se superpone con un bloqueo de calendario */
export function slotConflictsWithBlock(
  fecha: string,
  slotStartMin: number,
  durationMin: number,
  block: { fecha_inicio: string; fecha_fin: string }
): boolean {
  const blockStartDate = utcTimestampToLocalDate(block.fecha_inicio)
  const blockEndDate = utcTimestampToLocalDate(block.fecha_fin)

  if (fecha < blockStartDate || fecha > blockEndDate) return false

  const blockStartMin = utcTimestampToLocalTimeMinutes(block.fecha_inicio)
  const blockEndMin = utcTimestampToLocalTimeMinutes(block.fecha_fin)
  const slotEndMin = slotStartMin + durationMin

  if (blockStartDate === blockEndDate) {
    if (fecha !== blockStartDate) return false
    return slotStartMin < blockEndMin && slotEndMin > blockStartMin
  }

  if (fecha === blockStartDate) return slotEndMin > blockStartMin
  if (fecha === blockEndDate) return slotStartMin < blockEndMin
  return true
}
