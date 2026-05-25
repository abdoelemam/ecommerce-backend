import PDFDocument from "pdfkit";
import { IOrder } from "../model/order.model.js";

export const createInvoiceBuffer = async (order: IOrder): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 50 });
            
            const buffers: Buffer[] = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header
            doc.fillColor("#444444")
               .fontSize(20)
               .text("EcommercePro", 50, 57)
               .fontSize(10)
               .text("123 Tech Street", 200, 50, { align: "right" })
               .text("Cairo, Egypt", 200, 65, { align: "right" })
               .moveDown();

            // Invoice details
            doc.fillColor("#000000")
               .fontSize(20)
               .text("Invoice", 50, 160);

            doc.fontSize(10)
               .text(`Order Number: ${order._id}`, 50, 200)
               .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 215)
               .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 50, 230);

            // Customer details
            doc.text("Bill To:", 300, 200)
               .text(`Address: ${order.shippingAddress.street}`, 300, 215)
               .text(`${order.shippingAddress.city}`, 300, 230)
               .text(`Phone: ${order.shippingAddress.phone}`, 300, 245);

            // Table Header
            const tableTop = 330;
            doc.font("Helvetica-Bold");
            doc.text("Item", 50, tableTop);
            doc.text("Qty", 280, tableTop, { width: 90, align: "right" });
            doc.text("Price", 370, tableTop, { width: 90, align: "right" });
            doc.text("Total", 400, tableTop, { align: "right" });
            
            doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            doc.font("Helvetica");

            // Items
            let y = tableTop + 25;
            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];
                if (!item) continue;
                
                const productName = (item.productId as any).name || "Product";
                const lineTotal = item.quantity * item.finalPrice;

                doc.text(productName, 50, y);
                doc.text(item.quantity.toString(), 280, y, { width: 90, align: "right" });
                doc.text(`EGP ${item.finalPrice}`, 370, y, { width: 90, align: "right" });
                doc.text(`EGP ${lineTotal}`, 400, y, { align: "right" });

                y += 20;
            }

            doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

            // Totals
            y += 25;
            doc.font("Helvetica-Bold");
            doc.text("Subtotal:", 370, y, { width: 90, align: "right" });
            doc.text(`EGP ${order.totalPrice + (order.discount || 0)}`, 400, y, { align: "right" });
            
            if (order.discount && order.discount > 0) {
                 y += 15;
                 doc.text("Discount:", 370, y, { width: 90, align: "right" });
                 doc.text(`- EGP ${order.discount}`, 400, y, { align: "right" });
            }

            y += 20;
            doc.fontSize(14);
            const final = order.priceAfterDiscount ? order.priceAfterDiscount : order.totalPrice;
            doc.text("Final Total:", 370, y, { width: 90, align: "right" });
            doc.text(`EGP ${final}`, 400, y, { align: "right" });

            // Finalize
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
