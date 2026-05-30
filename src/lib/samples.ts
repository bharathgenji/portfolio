// Sample documents for the extraction playground. Kept short so the demo is fast.
export type Sample = { id: string; label: string; text: string };

export const samples: Sample[] = [
  {
    id: "invoice",
    label: "Invoice",
    text: `ACME ROBOTICS INC.
Invoice #INV-2026-0413
Date: March 14, 2026
Due: April 13, 2026

Bill To: Northwind Logistics, 410 Harbor Blvd, Houston, TX 77002

Description                Qty    Unit Price    Amount
Autonomous sorter unit      3      $12,500       $37,500
Installation & calibration  1      $4,200        $4,200
Annual support plan         1      $6,800        $6,800

Subtotal: $48,500
Tax (8.25%): $4,001.25
Total Due: $52,501.25

Payment terms: Net 30. Remit to account #8847-2291.`,
  },
  {
    id: "contract",
    label: "Contract clause",
    text: `MASTER SERVICES AGREEMENT — Section 7: Term & Termination

This Agreement commences on the Effective Date (January 1, 2026) and continues
for an initial term of twenty-four (24) months. Either party may terminate for
convenience upon ninety (90) days' written notice. In the event of a material
breach, the non-breaching party may terminate immediately if the breach remains
uncured for thirty (30) days after written notice. Upon termination, Client
shall pay all fees accrued through the effective termination date. The
confidentiality obligations in Section 9 survive termination for five (5) years.`,
  },
  {
    id: "email",
    label: "Support email",
    text: `From: priya.menon@northwind-logistics.com
To: support@acmerobotics.com
Subject: Urgent — Sorter unit SN-44192 throwing E-07 fault
Date: Mar 18, 2026 9:42 AM

Hi team,

Since this morning, one of our three sorter units (serial SN-44192, installed
Feb 2026) keeps halting with error code E-07 after ~20 minutes of operation.
The other two units are fine. This is blocking our outbound dock and we have a
4pm CT carrier pickup deadline today. Order #PO-55218 is affected.

Can someone call me at (713) 555-0148 ASAP? Happy to share logs.

Thanks,
Priya Menon
Operations Lead`,
  },
];
