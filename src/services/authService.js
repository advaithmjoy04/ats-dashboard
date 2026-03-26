import axios from "axios";

const STORAGE_KEY = "auth";

export async function login(email, password) {
  const response = await axios.post("/api/v1/auth/login", { email, password });
  const { token, user } = response.data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  return { token, user };
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  delete axios.defaults.headers.common["Authorization"];
}

export function getCurrentUser() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

const init = () => {
  const auth = getCurrentUser();
  if (auth?.token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${auth.token}`;
  }
};
init();

export default { login, logout, getCurrentUser };
