export async function requestAdmin(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Request failed' }))) as { error?: string };
    throw new Error(error.error ?? 'Request failed');
  }
  return response;
}

export async function requestAdminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await requestAdmin(url, init);
  return response.json() as Promise<T>;
}

export async function requestAdminOk(url: string, init?: RequestInit) {
  await requestAdmin(url, init);
}
