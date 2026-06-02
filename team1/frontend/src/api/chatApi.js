import API from "./axiosConfig";

export async function postChat({ userId, message }) {
  const res = await API.post("/chat", { userId, message });
  return res.data;
}

export async function resetChat(userId) {
  const res = await API.post("/chat/reset", { userId });
  return res.data;
}
