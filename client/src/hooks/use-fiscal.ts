import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export const useFiscalDocuments = () =>
  useQuery({
    queryKey: ["fiscal-documents"],
    queryFn: () =>
      api.get("/api/fiscal/documents").then((r: any) => r.data || []),
  });

export const useUpdateFiscalSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api.put("/api/fiscal/settings", data).then((r: any) => r.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["fiscal-settings"] }),
  });
};

export const useFiscalSettings = () =>
  useQuery({
    queryKey: ["fiscal-settings"],
    queryFn: () =>
      api.get("/api/fiscal/settings").then((r: any) => r.data || {}),
  });

export const useCalculateTaxes = () =>
  useMutation({
    mutationFn: (orderId: number) =>
      api
        .post("/api/fiscal/calculate-taxes", { orderId })
        .then((r: any) => r.data),
  });

export const useEmitDocument = () =>
  useMutation({
    mutationFn: ({ orderId, type }: { orderId: number; type: string }) =>
      api
        .post("/api/fiscal/emit-document", { orderId, type })
        .then((r: any) => r.data),
  });

export const useAuditLogs = () =>
  useQuery({
    queryKey: ["audit-logs"],
    queryFn: () =>
      api.get("/api/fiscal/audit-logs").then((r: any) => r.data || []),
  });
