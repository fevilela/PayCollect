import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000", // Ajuste se o backend estiver em outra porta
});

export default api;
