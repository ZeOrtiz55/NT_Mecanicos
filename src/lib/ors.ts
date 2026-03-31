const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || ''
const OFICINA_LAT = parseFloat(process.env.NEXT_PUBLIC_OFICINA_LAT || '-23.6533')
const OFICINA_LNG = parseFloat(process.env.NEXT_PUBLIC_OFICINA_LNG || '-49.3836')

export const OFICINA = { lat: OFICINA_LAT, lng: OFICINA_LNG }

interface RotaResult {
  distancia_km: number
  tempo_min: number
}

/**
 * Calcula rota entre dois pontos usando OpenRouteService
 */
export async function calcularRota(
  origemLat: number, origemLng: number,
  destinoLat: number, destinoLng: number,
): Promise<RotaResult | null> {
  if (!ORS_KEY || ORS_KEY === 'SUA_CHAVE_AQUI') return null

  try {
    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_KEY}&start=${origemLng},${origemLat}&end=${destinoLng},${destinoLat}`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const seg = data.features?.[0]?.properties?.segments?.[0]
    if (!seg) return null

    return {
      distancia_km: Math.round((seg.distance / 1000) * 10) / 10,
      tempo_min: Math.round(seg.duration / 60),
    }
  } catch {
    return null
  }
}

/**
 * Calcula rota da oficina até um destino
 */
export async function rotaDaOficina(destinoLat: number, destinoLng: number) {
  return calcularRota(OFICINA.lat, OFICINA.lng, destinoLat, destinoLng)
}

/**
 * Geocodifica um endereço usando OpenRouteService
 */
export async function geocodificar(endereco: string): Promise<{ lat: number; lng: number } | null> {
  if (!ORS_KEY || ORS_KEY === 'SUA_CHAVE_AQUI') return null

  try {
    const res = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(endereco)}&boundary.country=BR&size=1`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const coords = data.features?.[0]?.geometry?.coordinates
    if (!coords) return null

    return { lat: coords[1], lng: coords[0] }
  } catch {
    return null
  }
}
