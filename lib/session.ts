const PARTICIPANT_STORAGE_KEY = "recipeStudyParticipantId";

export function getStoredParticipantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
}

export function setStoredParticipantId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, id);
}

export function clearStoredParticipantId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
}
