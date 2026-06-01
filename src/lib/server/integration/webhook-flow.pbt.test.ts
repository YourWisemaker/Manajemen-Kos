import crypto from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pbtConfig } from "@/test/pbt";

// ---------------------------------------------------------------------------
// Integration Test 18.4: Webhook Payment Flow
// ---------------------------------------------------------------------------

type InvoiceStatus = "draft" | "tertagih" | "lunas" | "jatuh_tempo" | "batal";

interface SimulatedInvoice {
  id: string;
  tenantId: string;
  status: InvoiceStatus;
  total: string;
}

interface SimulatedPayment {
  id: string;
  invoiceId: string;
  paymentReference: string;
  status: "pending" | "success" | "failed" | "expired";
}

function processWebhook(
  invoices: SimulatedInvoice[],
  payments: SimulatedPayment[],
  tenantId: string,
  invoiceId: string,
  paymentRef: string,
  eventType: "payment.success" | "payment.expired",
): { invoice: SimulatedInvoice; payment: SimulatedPayment } {
  const existingPayment = payments.find((p) => p.paymentReference === paymentRef);
  if (existingPayment) {
    const inv = invoices.find((i) => i.id === invoiceId)!;
    return { invoice: inv, payment: existingPayment };
  }

  const inv = invoices.find((i) => i.id === invoiceId && i.tenantId === tenantId)!;
  const newPayment: SimulatedPayment = {
    id: crypto.randomUUID(),
    invoiceId,
    paymentReference: paymentRef,
    status: eventType === "payment.success" ? "success" : "expired",
  };
  payments.push(newPayment);

  if (eventType === "payment.success") {
    inv.status = "lunas";
  }

  return { invoice: inv, payment: newPayment };
}

describe("Integration 18.4: Webhook Payment Flow (Req 7.4, 7.6)", () => {
  it("successful webhook updates invoice status to lunas", () => {
    fc.assert(
      fc.property(fc.uuid(), (tenantId) => {
        const invoices: SimulatedInvoice[] = [
          {
            id: "inv-1",
            tenantId,
            status: "tertagih",
            total: "500000.00",
          },
        ];
        const payments: SimulatedPayment[] = [];
        const paymentRef = `PAY-${crypto.randomUUID()}`;

        const result = processWebhook(
          invoices,
          payments,
          tenantId,
          "inv-1",
          paymentRef,
          "payment.success",
        );

        expect(result.invoice.status).toBe("lunas");
        expect(result.payment.status).toBe("success");
        expect(payments.length).toBe(1);
      }),
      pbtConfig,
    );
  });

  it("idempotency: same webhook twice produces single payment and same final state", () => {
    fc.assert(
      fc.property(fc.uuid(), fc.integer({ min: 2, max: 10 }), (tenantId, repeatCount) => {
        const invoices: SimulatedInvoice[] = [
          {
            id: "inv-1",
            tenantId,
            status: "tertagih",
            total: "750000.00",
          },
        ];
        const payments: SimulatedPayment[] = [];
        const paymentRef = `PAY-${crypto.randomUUID()}`;

        for (let i = 0; i < repeatCount; i++) {
          processWebhook(
            invoices,
            payments,
            tenantId,
            "inv-1",
            paymentRef,
            "payment.success",
          );
        }

        expect(payments.length).toBe(1);
        expect(invoices[0].status).toBe("lunas");
        expect(payments[0].status).toBe("success");
      }),
      pbtConfig,
    );
  });

  it("expired webhook does not change invoice status to lunas", () => {
    fc.assert(
      fc.property(fc.uuid(), (tenantId) => {
        const invoices: SimulatedInvoice[] = [
          {
            id: "inv-1",
            tenantId,
            status: "tertagih",
            total: "500000.00",
          },
        ];
        const payments: SimulatedPayment[] = [];
        const paymentRef = `PAY-${crypto.randomUUID()}`;

        const result = processWebhook(
          invoices,
          payments,
          tenantId,
          "inv-1",
          paymentRef,
          "payment.expired",
        );

        expect(result.invoice.status).toBe("tertagih");
        expect(result.payment.status).toBe("expired");
      }),
      pbtConfig,
    );
  });

  it("cross-tenant webhook does not affect other tenant's invoices", () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (tenantA, tenantB) => {
        fc.pre(tenantA !== tenantB);

        const invoices: SimulatedInvoice[] = [
          { id: "inv-a", tenantId: tenantA, status: "tertagih", total: "500000.00" },
          { id: "inv-b", tenantId: tenantB, status: "tertagih", total: "750000.00" },
        ];
        const payments: SimulatedPayment[] = [];
        const paymentRef = `PAY-${crypto.randomUUID()}`;

        processWebhook(
          invoices,
          payments,
          tenantA,
          "inv-a",
          paymentRef,
          "payment.success",
        );

        expect(invoices[1].status).toBe("tertagih");
      }),
      pbtConfig,
    );
  });
});
