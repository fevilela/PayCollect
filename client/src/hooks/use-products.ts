import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export const useProducts = () =>
  useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      try {
        const response = await api.get("/api/products");
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
      }
    },
  });

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (product: any) =>
      api.post("/api/products", product).then((r: any) => r.data),
    onSuccess: (data) => {
      console.log("Produto criado com sucesso:", data); // Debug
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Erro na criação:", error); // Debug
    },
  });
};

export const useDeleteProduct = () =>
  useMutation({
    mutationFn: (id: number) =>
      api.delete(`/api/products/${id}`).then((r: any) => r.data),
  });
