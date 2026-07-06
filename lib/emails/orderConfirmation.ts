export function orderConfirmationHtml({
  buyerEmail,
  productName,
  amountTotal,
  orderId,
  storeName,
}: {
  buyerEmail: string;
  productName: string;
  amountTotal: number;
  orderId: string;
  storeName: string;
}) {
  const amount = (amountTotal / 100).toFixed(2);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#0f172a;padding:32px 40px;">
      <p style="margin:0;font-size:20px;font-weight:600;color:#ffffff;">OpenCart</p>
    </div>
    <div style="padding:40px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Order confirmed!</h1>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">Thanks for your purchase, ${buyerEmail}.</p>

      <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Product</td>
            <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${productName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#64748b;">Store</td>
            <td style="padding:8px 0;font-size:13px;color:#0f172a;text-align:right;">${storeName}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;">
            <td style="padding:16px 0 8px;font-size:15px;font-weight:700;color:#0f172a;">Total paid</td>
            <td style="padding:16px 0 8px;font-size:15px;font-weight:700;color:#0f172a;text-align:right;">$${amount}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">Order ID</p>
      <p style="margin:0 0 32px;font-family:monospace;font-size:12px;color:#475569;background:#f1f5f9;padding:10px 14px;border-radius:8px;">${orderId}</p>

      <p style="margin:0;font-size:13px;color:#94a3b8;">Questions? Reply to this email or message the seller directly from your orders page.</p>
    </div>
  </div>
</body>
</html>`;
}
