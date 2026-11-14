import { apiUrl } from "./api";
import { showToast } from "./toast";

export function parseFilenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;

  // 1. Try RFC 5987 / RFC 6266 filename*=UTF-8''<encoded>
  const utf8Match = header.match(/filename\*=UTF-8''([^;\r\n]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // Fallback to plain match if decode fails
    }
  }

  // 2. Try plain filename="quoted" or filename=unquoted
  const plainMatch = header.match(/filename=(?:["']([^"']+)["']|([^;\r\n]+))/i);
  if (plainMatch) {
    const val = plainMatch[1] || plainMatch[2];
    if (val) {
      return val.trim();
    }
  }

  return fallback;
}

export async function downloadFile(path: string, fallbackName: string): Promise<boolean> {
  const url = apiUrl(path);
  let objectUrl: string | null = null;
  try {
    const res = await fetch(url, { method: "GET", credentials: "include" });
    if (!res.ok) {
      let errorMessage = `Download failed (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) errorMessage = errJson.error.message;
      } catch {
        // Error response was not a JSON envelope.
      }
      showToast(errorMessage, "danger");
      return false;
    }

    const filename = parseFilenameFromContentDisposition(
      res.headers.get("content-disposition"),
      fallbackName,
    );
    const blob = await res.blob();
    if (blob.size === 0) throw new Error("The server returned an empty download.");

    objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // The download event is not observable from a plain anchor in all browsers.
    // Revoke after a conservative delay; mobile fallback is provided by the UI
    // path if the browser blocks a blob download.
    window.setTimeout(() => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }, 15000);
    showToast(`Downloaded ${filename}`, "success");
    return true;
  } catch (err: unknown) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const message = err instanceof Error ? err.message : "Network error during download";
    showToast(message, "danger");
    return false;
  }
}
