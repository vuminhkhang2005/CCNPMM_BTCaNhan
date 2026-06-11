let accessToken = "";

export const getAccessToken = () => accessToken;

export const setAccessToken = (token = "") => {
  accessToken = token || "";
};

export const clearAccessToken = () => {
  accessToken = "";
};

export const clearLegacyStoredAccessToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("access_token");
};
