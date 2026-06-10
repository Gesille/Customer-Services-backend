function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildPrintHtml(
  name:        string,
  location:    string,
  qrDataUrl:   string,
  feedbackUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>QR — ${esc(name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f4f4f0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:24px}
    .sticker{width:320px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 2px 0 #1a1a1a,0 4px 0 #1a1a1a,2px 4px 0 #1a1a1a;border:2.5px solid #1a1a1a}
    .sticker-top{background:#1a1a1a;padding:20px 24px 16px;text-align:center}
    .brand-line{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#888;margin-bottom:6px}
    .restaurant-name{font-size:22px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-.02em}
    .location-badge{display:inline-flex;align-items:center;gap:4px;margin-top:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:100px;padding:3px 10px;font-size:11px;color:#aaa;font-weight:500;letter-spacing:.04em}
    .location-badge::before{content:'◎';font-size:10px}
    .qr-section{padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px}
    .qr-frame{width:220px;height:220px;border:2.5px solid #1a1a1a;border-radius:16px;padding:12px;background:#fff;position:relative}
    .qr-frame::before,.qr-frame::after{content:'';position:absolute;width:18px;height:18px;border-color:#1a1a1a;border-style:solid}
    .qr-frame::before{top:-2px;left:-2px;border-width:3px 0 0 3px;border-radius:4px 0 0 0}
    .qr-frame::after{bottom:-2px;right:-2px;border-width:0 3px 3px 0;border-radius:0 0 4px 0}
    .qr-frame img{width:100%;height:100%;display:block;border-radius:8px}
    .cta{text-align:center}
    .cta-main{font-size:14px;font-weight:700;color:#1a1a1a;letter-spacing:-.01em}
    .cta-sub{font-size:11px;color:#888;margin-top:3px;line-height:1.4}
    .sticker-bottom{border-top:1.5px solid #f0f0f0;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .stars{display:flex;gap:2px}
    .star{width:12px;height:12px;background:#1a1a1a;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
    .powered{font-size:9px;color:#bbb;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
    .print-btn{display:flex;align-items:center;gap:8px;background:#1a1a1a;color:#fff;border:none;border-radius:100px;padding:12px 28px;font-size:14px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;letter-spacing:.01em;transition:background .15s}
    .print-btn:hover{background:#333}
    .hint{font-size:12px;color:#999;text-align:center}
    @media print{body{background:#fff;padding:0;justify-content:flex-start}.sticker{box-shadow:none;page-break-inside:avoid;break-inside:avoid}.print-btn,.hint{display:none}}
  </style>
</head>
<body>
  <div class="sticker">
    <div class="sticker-top">
      <p class="brand-line">Rate your experience</p>
      <h1 class="restaurant-name">${esc(name)}</h1>
      <span class="location-badge">${esc(location)}</span>
    </div>
    <div class="qr-section">
      <div class="qr-frame"><img src="${qrDataUrl}" alt="QR Code"/></div>
      <div class="cta">
        <p class="cta-main">Scan &amp; share your feedback</p>
        <p class="cta-sub">Point your camera — no app needed</p>
      </div>
    </div>
    <div class="sticker-bottom">
      <div class="stars">
        <div class="star"></div><div class="star"></div><div class="star"></div>
        <div class="star"></div><div class="star"></div>
      </div>
      <span class="powered">Your opinion matters</span>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Print sticker</button>
  <p class="hint">Or save as PDF from the print dialog</p>
</body>
</html>`;
}