export interface Hotel {
  id: string
  name: string
  city: string
  lowRate: number
  highRate: number
}

export type NewHotel = Omit<Hotel, 'id'>

export interface City {
  id: string
  name: string
}

const API_BASE: string = import.meta.env.VITE_API_BASE

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const url = `${API_BASE}${path}`

  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    throw new Error(`${method} ${url} failed with status ${response.status}`)
  }

  // 204 No Content: there is no body to parse
  if (response.status === 204) {
    return undefined as T
  }

  const body: { data: T } = await response.json()
  return body.data
}

export const getHotels = (signal?: AbortSignal): Promise<Hotel[]> => request<Hotel[]>('/hotels', { signal })

export const getCities = (): Promise<City[]> => request<City[]>('/cities')

// The server answers a missing hotel with 200 and `{}` (no `data`) instead of a 404
export const getHotel = async (id: string): Promise<Hotel | null> => {
  const hotel = await request<Hotel | undefined>(`/hotels/${id}`)
  return hotel ?? null
}

export const createHotel = (hotel: NewHotel): Promise<Hotel> =>
  request<Hotel>('/hotels', { method: 'POST', body: JSON.stringify(hotel) })

export const updateHotel = (id: string, changes: Partial<NewHotel>): Promise<Hotel> =>
  request<Hotel>(`/hotels/${id}`, { method: 'PUT', body: JSON.stringify(changes) })

export const deleteHotel = (id: string): Promise<void> =>
  request<void>(`/hotels/${id}`, { method: 'DELETE' })
