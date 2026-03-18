export function showToast(message: React.ReactNode) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:toast", { detail: message }));
  }
}

export function showError(message: React.ReactNode) {
  showToast(message);
}
