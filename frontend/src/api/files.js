import api from "../lib/axios";

export async function getFileExplorerData() {
  const response = await api.get("/files/explorer");
  return response.data;
}
