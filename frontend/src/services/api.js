const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function checkHealth(signal) {
  const response = await fetch(`${baseUrl}/api/health`, { signal, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || data.status !== 'ok' || data.database !== 'connected') {
    throw new Error('El servicio todavía no está disponible.');
  }
  return data;
}
