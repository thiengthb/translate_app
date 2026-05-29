export const getCurrentUserId = (): number | undefined => {
  const token = localStorage.getItem("token");
  if (!token) return undefined;
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return payload.userId != null ? Number(payload.userId) : undefined;
  } catch {
    return undefined;
  }
};
