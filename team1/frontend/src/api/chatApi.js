import API from "./axiosConfig";

// Identity is derived from the JWT (auto-attached by axiosConfig) on the
// backend via req.user.id — the client never needs to send a userId.
export async function postChat({ message }) {
  const res = await API.post("/chat", { message });
  return res.data;
}

export async function resetChat() {
  const res = await API.post("/chat/reset", {});
  return res.data;
}
