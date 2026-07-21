export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = await res.json()
  if (!json.ok) throw new Error(json.message ?? 'Request failed')
  return json.data as T
}

export async function poster<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.message ?? 'Request failed')
  return json.data as T
}

export async function patcher<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.message ?? 'Request failed')
  return json.data as T
}
