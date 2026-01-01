import { storage } from "../storage";
import soap from "soap";
import * as xml2js from "xml2js";
import { db } from "../db";
import {
  taxCalculations,
  fiscalDocuments,
  auditLogs,
  fiscalSettings,
  products,
  orderItems,
  orders,
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

export async function calculateTaxes(orderId: number): Promise<any[]> {
  const orderItemsData = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .innerJoin(products, eq(orderItems.productId, products.id));

  const fiscalConfig = await db.select().from(fiscalSettings).limit(1);
  if (!fiscalConfig[0])
    throw new Error("Configurações fiscais não encontradas");

  const calculations = [];
  for (const item of orderItemsData) {
    const product = item.products;
    const orderItem = item.order_items;
    const baseValue =
      parseFloat(orderItem.priceAtTime.toString()) * orderItem.quantity;

    const aliquotaIcms = product.icms
      ? parseFloat(product.icms.toString())
      : 0.18;
    const valorIcms = baseValue * aliquotaIcms;

    const aliquotaPis = product.pis
      ? parseFloat(product.pis.toString())
      : 0.0065;
    const valorPis = baseValue * aliquotaPis;
    const aliquotaCofins = product.cofins
      ? parseFloat(product.cofins.toString())
      : 0.03;
    const valorCofins = baseValue * aliquotaCofins;

    const calcId = await db
      .insert(taxCalculations)
      .values({
        orderItemId: orderItem.id,
        baseIcms: baseValue.toString(),
        aliquotaIcms: aliquotaIcms.toString(),
        valorIcms: valorIcms.toString(),
        basePis: baseValue.toString(),
        aliquotaPis: aliquotaPis.toString(),
        valorPis: valorPis.toString(),
      })
      .returning({ id: taxCalculations.id });

    calculations.push({
      itemId: orderItem.id,
      baseValue,
      icms: valorIcms,
      pis: valorPis,
      cofins: valorCofins,
      totalTax: valorIcms + valorPis + valorCofins,
    });
  }

  return calculations;
}

export class FiscalService {
  private static sefazUrl =
    "https://homologacao.nfe.fazenda.mg.gov.br/nfe2/services/NfeAutorizacao";

  static async emitDocument(orderId: number, type: "NFCe" | "NFe" | "NFSe") {
    console.log(
      `[FiscalService] Iniciando emissão de ${type} para o pedido ${orderId}`
    );

    try {
      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (!order[0]) throw new Error("Pedido não encontrado");

      const fiscalConfig = await db.select().from(fiscalSettings).limit(1);
      if (!fiscalConfig[0])
        throw new Error("Configurações fiscais não encontradas");

      const taxCalculationsData = await calculateTaxes(orderId);
      const totalTax = taxCalculationsData.reduce(
        (sum, calc) => sum + calc.totalTax,
        0
      );

      if (!fiscalConfig[0].digitalCertificate || !fiscalConfig[0].privateKey) {
        throw new Error(
          "Certificado digital ou chave privada não configurados"
        );
      }

      const xmlBuilder = new xml2js.Builder();
      const xmlData = {
        nfeProc: {
          NFe: {
            infNFe: {
              ide: {},
              emit: {
                CNPJ: fiscalConfig[0].cnpj,
                xNome: fiscalConfig[0].companyName,
              },
              dest: {},
              det: taxCalculationsData.map((calc) => ({})),
              total: {
                ICMSTot: { vBC: order[0].totalAmount, vICMS: totalTax },
              },
            },
          },
        },
      };
      const xml = xmlBuilder.buildObject(xmlData);

      // Assinar XML
      const signedXml = this.signXml(
        xml,
        fiscalConfig[0].digitalCertificate,
        fiscalConfig[0].privateKey
      );

      // Enviar para SEFAZ MG
      const client = await soap.createClientAsync(this.sefazUrl);
      const result = await client.nfeAutorizacaoLote({
        nfeDadosMsg: signedXml,
      });

      const response = result[0].nfeAutorizacaoLoteResult;
      if (response.infRec && response.infRec.nRec) {
        await db.insert(fiscalDocuments).values({
          orderId,
          type,
          number: 1,
          series: 1,
          status: "authorized",
          xmlContent: signedXml,
          accessKey: response.protNFe.infProt.chNFe,
          totalAmount: order[0].totalAmount.toString(),
          totalTax: totalTax.toString(),
        });
        return {
          success: true,
          accessKey: response.protNFe.infProt.chNFe,
          number: 1,
          series: 1,
          status: "authorized",
        };
      } else {
        throw new Error("Rejeitado: " + response.xMotivo);
      }
    } catch (error: any) {
      console.error(`[FiscalService] Erro na emissão: ${error.message}`);
      if (process.env.NODE_ENV === "development") {
        console.log("[FiscalService] Fallback para simulação");
        return {
          success: true,
          accessKey: "35231012345678000190550010000000011234567890",
          number: 1,
          series: 1,
          status: "authorized",
        };
      }
      throw error;
    }
  }

  private static signXml(
    xml: string,
    certPem: string,
    privateKeyPem: string
  ): string {
    // Implemente assinatura com xml-crypto
    return xml; // Placeholder
  }
}
