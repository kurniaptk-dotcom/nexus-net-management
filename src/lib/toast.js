/**
 * Sistem Global Toast Notification Event-Driven
 * Memungkinkan setiap komponen memicu notifikasi tanpa prop drilling / context boilerplate
 */
export function showToast(message, type = "info", duration = 3500) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("xnet_show_toast", {
        detail: {
          id: Math.random().toString(36).substring(2, 9),
          message,
          type, // "success" | "error" | "info" | "warning"
          duration,
        },
      })
    );
  }
}
