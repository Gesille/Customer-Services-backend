function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildPrintHtml(
  name: string,
  location: string,
  qrDataUrl: string,
  feedbackUrl: string,
): string {
  const slug = name.replace(/\s+/g, '-').toLowerCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>QR - ${esc(name)}</title>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  font-family:'Inter',sans-serif;
  background:#f4f4f0;
  min-height:100vh;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  padding:40px 20px;
  gap:24px;
}

.sticker{
  width:320px;
  background:#fff;
  border-radius:24px;
  overflow:hidden;
  border:2px solid #1a1a1a;
  box-shadow:
    0 2px 0 #1a1a1a,
    0 4px 0 #1a1a1a,
    2px 4px 0 #1a1a1a;
}

.sticker-top{
  background:#1a1a1a;
  padding:20px 24px 16px;
  text-align:center;
}

.brand-line{
  color:#888;
  font-size:10px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.2em;
  margin-bottom:6px;
}

.restaurant-name{
  font-size:22px;
  font-weight:900;
  color:#fff;
  line-height:1.1;
}

.location-badge{
  margin-top:8px;
  display:inline-flex;
  padding:4px 10px;
  border-radius:999px;
  background:rgba(255,255,255,.1);
  color:#bbb;
  font-size:11px;
}

.qr-section{
  padding:24px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:16px;
}

.qr-frame{
  width:220px;
  height:220px;
  border:2px solid #1a1a1a;
  border-radius:16px;
  padding:12px;
  background:#fff;
}

.qr-frame img{
  width:100%;
  height:100%;
  display:block;
}

.cta{
  text-align:center;
}

.cta-main{
  font-size:14px;
  font-weight:700;
}

.cta-sub{
  margin-top:4px;
  font-size:11px;
  color:#888;
}

.sticker-bottom{
  border-top:1px solid #eee;
  padding:12px 24px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.powered{
  font-size:10px;
  color:#999;
}

.actions{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:12px;
}

button{
  border:none;
  outline:none;
  cursor:pointer;
  border-radius:999px;
  padding:14px 28px;
  font-size:14px;
  font-weight:700;
  font-family:'Inter',sans-serif;
}

.download-btn{
  background:#1a1a1a;
  color:#fff;
}

.download-btn:disabled{
  opacity:.5;
  cursor:not-allowed;
}

.hint{
  font-size:12px;
  color:#999;
}

@media print{
  .actions{
    display:none;
  }

  body{
    background:#fff;
    padding:0;
  }

  .sticker{
    box-shadow:none;
  }
}
</style>
</head>

<body>

<div id="captureArea">
  <div class="sticker" id="sticker">

    <div class="sticker-top">
      <p class="brand-line">Rate your experience</p>
      <h1 class="restaurant-name">${esc(name)}</h1>
      <div class="location-badge">
        ${esc(location)}
      </div>
    </div>

    <div class="qr-section">
      <div class="qr-frame">
        <img src="${qrDataUrl}" alt="QR Code"/>
      </div>

      <div class="cta">
        <div class="cta-main">
          Scan & Share Your Feedback
        </div>

        <div class="cta-sub">
          Point your camera — no app needed
        </div>
      </div>
    </div>

    <div class="sticker-bottom">
      <span>★★★★★</span>
      <span class="powered">
        Your opinion matters
      </span>
    </div>

  </div>
</div>

<div class="actions">
<button id="downloadBtn" class="download-btn">
  Download PNG
</button>
  
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {

  var button = document.getElementById('downloadBtn');

  if (!button) {
    console.error('downloadBtn not found');
    return;
  }

  button.addEventListener('click', async function () {

    try {
      button.disabled = true;
      button.innerText = 'Generating...';

      var sticker = document.getElementById('sticker');

      var canvas = await html2canvas(sticker, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      canvas.toBlob(function(blob) {

        if (!blob) {
          alert('Failed to generate image');
          return;
        }

        var url = window.URL.createObjectURL(blob);

        var link = document.createElement('a');
        link.href = url;
        link.download = "qr-sticker.png";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(function () {
          window.URL.revokeObjectURL(url);
        }, 500);

      }, 'image/png');

    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed');
    } finally {
      button.disabled = false;
      button.innerText = 'Download PNG';
    }

  });

});
<\/script>
</body>
</html>`;
}