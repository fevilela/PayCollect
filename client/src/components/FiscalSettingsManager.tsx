import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function FiscalSettingsManager() {
  const [formData, setFormData] = useState({
    taxRegime: "Simples Nacional",
    fiscalAddress: "",
    certificateType: "A1",
    certificateFile: null as File | null,
    cfop: "5102",
    cst: "102",
  });

  const { toast } = useToast();

  // Carregar dados do backend ao montar o componente
  useEffect(() => {
    fetch("/api/fiscal/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setFormData({
            taxRegime: data.taxRegime || "Simples Nacional",
            fiscalAddress: data.fiscalAddress || "",
            certificateType: data.certificateType || "A1",
            certificateFile: null,
            cfop: data.cfop || "5102",
            cst: data.cst || "102",
          });
        }
      })
      .catch(() => {
        toast({
          title: "Erro",
          description: "Falha ao carregar configurações.",
          variant: "destructive",
        });
      });
  }, []);

  // Controle do arquivo selecionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData((prev) => ({ ...prev, certificateFile: e.target.files![0] }));
    }
  };

  // Atualizar campos do formulário
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Enviar dados para o backend (incluindo upload)
  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append("taxRegime", formData.taxRegime);
      data.append("fiscalAddress", formData.fiscalAddress);
      data.append("certificateType", formData.certificateType);
      data.append("cfop", formData.cfop);
      data.append("cst", formData.cst);

      if (formData.certificateFile) {
        data.append("certificateFile", formData.certificateFile);
      }

      const res = await fetch("/api/fiscal/settings", {
        method: "PUT",
        body: data,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao salvar configurações.");
      }

      toast({
        title: "Sucesso",
        description: "Configurações fiscais salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar os dados.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 max-w-md p-4 border rounded">
      <div>
        <Label>Regime Tributário</Label>
        <select
          value={formData.taxRegime}
          onChange={(e) => handleChange("taxRegime", e.target.value)}
          className="w-full rounded border px-3 py-2"
        >
          <option>Simples Nacional</option>
          <option>Lucro Presumido</option>
          <option>Lucro Real</option>
        </select>
      </div>

      <div>
        <Label>Endereço Fiscal</Label>
        <Input
          placeholder="Rua, Número, Bairro, Cidade, UF"
          value={formData.fiscalAddress}
          onChange={(e) => handleChange("fiscalAddress", e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Tipo de Certificado</Label>
          <select
            value={formData.certificateType}
            onChange={(e) => handleChange("certificateType", e.target.value)}
            className="w-full rounded border px-3 py-2"
          >
            <option value="A1">Certificado A1 (Arquivo)</option>
            <option value="A3">Certificado A3 (Token/Cartão)</option>
          </select>
        </div>

        <div className="flex-1">
          <Label>Arquivo/Upload Certificado</Label>
          <input
            type="file"
            accept=".pfx,.p12,.pem"
            onChange={handleFileChange}
            className="w-full rounded border p-1"
          />
          {formData.certificateFile && (
            <small className="block pt-1 text-xs text-muted-foreground">
              Selecionado: {formData.certificateFile.name}
            </small>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Label>CFOP Padrão (Vendas)</Label>
          <Input
            value={formData.cfop}
            onChange={(e) => handleChange("cfop", e.target.value)}
            placeholder="5102"
          />
        </div>

        <div className="flex-1">
          <Label>CST Padrão</Label>
          <Input
            value={formData.cst}
            onChange={(e) => handleChange("cst", e.target.value)}
            placeholder="102"
          />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Salvar
      </Button>
    </div>
  );
}
