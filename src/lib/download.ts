/** Hand the browser a generated file without a round trip to a server. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the download a tick to start before the URL is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
