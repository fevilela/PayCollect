import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { db } from "../db";
import { fiscalDocuments, orders, orderItems, products, fiscalSettings } from "../../shared/schema";
import { eq } from "drizzle-orm";

export class DANFEGenerator {
  static async generateNFCe(documentId: number): Promise<Buffer> {
    const doc = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, documentId))
      .limit(1);

    if (!doc[0]) throw new Error("Documento fiscal não encontrado");

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, doc[0].orderId!))
      .limit(1);

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, doc[0].orderId!))
      .innerJoin(products, eq(orderItems.productId, products.id));

    const settings = await db.select().from(fiscalSettings).limit(1);

    const pdfDoc = new PDFDocument({
      size: [226.77, 841.89], // 80mm width for thermal printer
      margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);

      // Header - Company Info
      pdfDoc.fontSize(10).text(settings[0]?.companyName || "Empresa", { align: "center" });
      pdfDoc.fontSize(8).text(`CNPJ: ${settings[0]?.cnpj || "00.000.000/0000-00"}`, { align: "center" });
      pdfDoc.fontSize(8).text(settings[0]?.fiscalAddress || "Endereço da Empresa", { align: "center" });
      pdfDoc.moveDown(0.5);

      // Document Title
      pdfDoc.fontSize(12).text("DANFE NFC-e", { align: "center", underline: true });
      pdfDoc.fontSize(8).text("Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica", {
        align: "center"
      });
      pdfDoc.moveDown(0.5);

      // Document Info
      pdfDoc.fontSize(8).text(`Número: ${doc[0].number} - Série: ${doc[0].series}`);
      pdfDoc.text(`Emissão: ${new Date(doc[0].issuedAt!).toLocaleString("pt-BR")}`);
      pdfDoc.moveDown(0.5);

      // Items Table Header
      pdfDoc.fontSize(7).text("─".repeat(55));
      pdfDoc.text("Item | Descrição | Qtd | Vlr Unit | Total");
      pdfDoc.text("─".repeat(55));

      // Items
      items.forEach((item, index) => {
        const product = item.products;
        const orderItem = item.order_items;
        const total = parseFloat(orderItem.priceAtTime.toString()) * orderItem.quantity;

        pdfDoc.text(
          `${index + 1} | ${product.name.substring(0, 20)} | ${orderItem.quantity} | ` +
          `R$ ${parseFloat(orderItem.priceAtTime.toString()).toFixed(2)} | R$ ${total.toFixed(2)}`
        );
      });

      pdfDoc.text("─".repeat(55));
      pdfDoc.moveDown(0.5);

      // Totals
      pdfDoc.fontSize(8).text(`Total de Itens: ${items.length}`);
      pdfDoc.text(`Valor Total: R$ ${parseFloat(doc[0].totalAmount.toString()).toFixed(2)}`);
      pdfDoc.text(`Total Tributos: R$ ${parseFloat(doc[0].totalTax.toString()).toFixed(2)}`);
      pdfDoc.moveDown(0.5);

      // Payment Method
      pdfDoc.text(`Forma de Pagamento: ${order[0]?.paymentMethod || "Não informado"}`);
      pdfDoc.moveDown(1);

      // QR Code (if available)
      if (doc[0].qrCode || doc[0].accessKey) {
        const qrData = doc[0].qrCode || doc[0].accessKey || "";
        QRCode.toDataURL(qrData, { width: 150 })
          .then((url) => {
            pdfDoc.image(url, {
              fit: [150, 150],
              align: "center",
            });

            // Access Key
            pdfDoc.moveDown(0.5);
            pdfDoc.fontSize(7).text(`Chave de Acesso:`, { align: "center" });
            pdfDoc.text(doc[0].accessKey || "N/A", { align: "center" });
            pdfDoc.moveDown(0.5);

            // Footer
            pdfDoc.fontSize(6).text("Consulte pela chave de acesso em:", { align: "center" });
            pdfDoc.text("https://www.nfce.fazenda.gov.br/consulta", { align: "center" });
            pdfDoc.moveDown(0.5);
            pdfDoc.text("─".repeat(55), { align: "center" });
            pdfDoc.text(`Protocolo de Autorização: ${doc[0].accessKey || "Offline"}`, {
              align: "center"
            });

            pdfDoc.end();
          })
          .catch(reject);
      } else {
        pdfDoc.end();
      }
    });
  }

  static async generateDANFESimplified(documentId: number): Promise<string> {
    const doc = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, documentId))
      .limit(1);

    if (!doc[0]) throw new Error("Documento fiscal não encontrado");

    const settings = await db.select().from(fiscalSettings).limit(1);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: monospace; width: 80mm; margin: 0 auto; font-size: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separator { border-top: 1px dashed #000; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px; }
  </style>
</head>
<body>
  <div class="center bold">${settings[0]?.companyName || "Empresa"}</div>
  <div class="center">CNPJ: ${settings[0]?.cnpj || "00.000.000/0000-00"}</div>
  <div class="center">${settings[0]?.fiscalAddress || ""}</div>
  <div class="separator"></div>

  <div class="center bold">DANFE NFC-e</div>
  <div class="center">Documento Auxiliar da NFC-e</div>
  <div class="separator"></div>

  <div>Número: ${doc[0].number} - Série: ${doc[0].series}</div>
  <div>Emissão: ${new Date(doc[0].issuedAt!).toLocaleString("pt-BR")}</div>
  <div class="separator"></div>

  <div>Valor Total: R$ ${parseFloat(doc[0].totalAmount.toString()).toFixed(2)}</div>
  <div>Total Tributos: R$ ${parseFloat(doc[0].totalTax.toString()).toFixed(2)}</div>
  <div class="separator"></div>

  <div class="center">Chave de Acesso:</div>
  <div class="center" style="font-size: 9px;">${doc[0].accessKey || "N/A"}</div>
  <div class="separator"></div>

  <div class="center" style="font-size: 10px;">Consulte em:</div>
  <div class="center" style="font-size: 10px;">www.nfce.fazenda.gov.br</div>
</body>
</html>
`;

    return html;
  }
}
