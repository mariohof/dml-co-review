/** Gemeinsamer Download-Helfer (PROJ-9 Tech Design E): speichert Text als Datei mit vorgegebenem Namen */
export function downloadTextFile(fileName: string, content: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Verzögert freigeben, damit der Download sicher startet
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Download unveränderter Bytes (Archiv, PROJ-15) */
export function downloadBytes(fileName: string, bytes: Uint8Array, mimeType = "application/octet-stream"): void {
  const blob = new Blob([bytes as BlobPart], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
