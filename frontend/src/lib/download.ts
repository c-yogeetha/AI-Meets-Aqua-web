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
  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      let errorMessage = `Download failed (HTTP ${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error && errJson.error.message) {
          errorMessage = errJson.error.message;
        }
      } catch {
        // Not a JSON error envelope
      }
      showToast(errorMessage, "danger");
      return false;
    }

    const disposition = res.headers.get("content-disposition");
    const filename = parseFilenameFromContentDisposition(disposition, fallbackName);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 10000);

    showToast(`Downloaded ${filename}`, "success");
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error during download";
    showToast(message, "danger");
    return false;
  }
}
