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
import { eq, desc } from "drizzle-orm";
import axios from "axios";
import { SignedXml } from "xml-crypto";
import * as forge from "node-forge";
import * as crypto from "crypto";

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

    // Cálculo IBS e CBS - Reforma Tributária 2026
    const aliquotaIbs = product.ibs
      ? parseFloat(product.ibs.toString())
      : 0.125; // Alíquota padrão IBS: 12.5%
    const valorIbs = baseValue * aliquotaIbs;

    const aliquotaCbs = product.cbs
      ? parseFloat(product.cbs.toString())
      : 0.085; // Alíquota padrão CBS: 8.5%
    const valorCbs = baseValue * aliquotaCbs;

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
      ibs: valorIbs,
      cbs: valorCbs,
      totalTax: valorIcms + valorPis + valorCofins + valorIbs + valorCbs,
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
    try {
      const sig = new SignedXml();
      sig.addReference(
        "//*[local-name(.)='infNFe']",
        [
          "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
          "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
        ],
        "http://www.w3.org/2001/04/xmlenc#sha256"
      );
      sig.signingKey = privateKeyPem;
      sig.computeSignature(xml, {
        location: { reference: "//*[local-name(.)='infNFe']", action: "after" },
      });
      return sig.getSignedXml();
    } catch (error: any) {
      console.error("Erro ao assinar XML:", error.message);
      return xml;
    }
  }

  static async consultarStatusServico(uf: string): Promise<any> {
    try {
      const sefazUrl = this.getSefazUrlByUF(uf);
      const client = await soap.createClientAsync(sefazUrl);
      const result = await client.nfeStatusServico();
      return result[0];
    } catch (error: any) {
      console.error("Erro ao consultar status do serviço:", error.message);
      throw error;
    }
  }

  private static getSefazUrlByUF(uf: string): string {
    const urls: { [key: string]: string } = {
      MG: "https://homologacao.nfe.fazenda.mg.gov.br/nfe2/services/NfeStatusServico4",
      SP: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    };
    return urls[uf] || urls["MG"];
  }

  static async emitirNFCeOffline(orderId: number): Promise<any> {
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

    const nfceNumber = await this.getNextNFCeNumber();
    const accessKey = this.generateAccessKey(
      fiscalConfig[0].cnpj || "",
      nfceNumber
    );

    await db.insert(fiscalDocuments).values({
      orderId,
      type: "NFCe",
      number: nfceNumber,
      series: 1,
      status: "offline",
      accessKey,
      totalAmount: order[0].totalAmount.toString(),
      totalTax: totalTax.toString(),
      transmissionStatus: "pending",
    });

    return {
      success: true,
      accessKey,
      number: nfceNumber,
      series: 1,
      status: "offline",
      message: "NFC-e emitida em modo offline. Será transmitida quando houver conexão.",
    };
  }

  private static generateAccessKey(cnpj: string, number: number): string {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const date = new Date();
    const uf = "35"; // SP por padrão
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const model = "65"; // NFC-e
    const series = "001";
    const numberStr = String(number).padStart(9, "0");
    const emissionType = "1";
    const randomCode = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");

    const key = `${uf}${month}${cleanCnpj}${model}${series}${numberStr}${emissionType}${randomCode}`;
    const dv = this.calculateCheckDigit(key);

    return key + dv;
  }

  private static calculateCheckDigit(key: string): string {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    let weightIndex = 0;

    for (let i = key.length - 1; i >= 0; i--) {
      sum += parseInt(key[i]) * weights[weightIndex];
      weightIndex = (weightIndex + 1) % weights.length;
    }

    const remainder = sum % 11;
    const dv = remainder < 2 ? 0 : 11 - remainder;
    return String(dv);
  }

  private static async getNextNFCeNumber(): Promise<number> {
    const lastDoc = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.type, "NFCe"))
      .orderBy(desc(fiscalDocuments.number))
      .limit(1);

    return lastDoc.length > 0 ? (lastDoc[0].number || 0) + 1 : 1;
  }

  static async transmitirNotasOffline(): Promise<any[]> {
    const offlineDocs = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.status, "offline"));

    const results = [];
    for (const doc of offlineDocs) {
      try {
        if (doc.orderId) {
          const result = await this.emitDocument(doc.orderId, doc.type as any);
          results.push({ documentId: doc.id, success: true, result });
        }
      } catch (error: any) {
        results.push({ documentId: doc.id, success: false, error: error.message });
      }
    }
    return results;
  }
}
