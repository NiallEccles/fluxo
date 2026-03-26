import LZString from 'lz-string'

export function readYamlFromUrl(): string | null {
  const param = new URLSearchParams(window.location.search).get('y')
  if (!param) return null
  return LZString.decompressFromEncodedURIComponent(param)
}

export function writeYamlToUrl(yaml: string): void {
  const compressed = LZString.compressToEncodedURIComponent(yaml)
  const url = new URL(window.location.href)
  url.searchParams.set('y', compressed)
  window.history.replaceState(null, '', url)
}

export function clearYamlFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('y')
  window.history.replaceState(null, '', url)
}

export function buildShareUrl(yaml: string): string {
  const compressed = LZString.compressToEncodedURIComponent(yaml)
  const url = new URL(window.location.href)
  url.searchParams.set('y', compressed)
  return url.toString()
}
