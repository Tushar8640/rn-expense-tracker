const sharp = require("sharp");
const path = require("path");

const SIZES = {
  "icon.png": 1024,
  "adaptive-icon.png": 1024,
  "favicon.png": 48,
  "splash-icon.png": 200,
};

const svgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4B7A5B"/>
      <stop offset="100%" style="stop-color:#3A5F47"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  
  <!-- Wallet/card shape -->
  <rect x="260" y="320" width="504" height="340" rx="40" fill="white" opacity="0.95"/>
  <rect x="260" y="320" width="504" height="100" rx="40" fill="#E8F0EB"/>
  
  <!-- Taka symbol -->
  <text x="512" y="560" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="#4B7A5B" text-anchor="middle" dominant-baseline="middle">৳</text>
  
  <!-- Small coin circles -->
  <circle cx="680" y="280" r="60" fill="#E8A87C" opacity="0.9"/>
  <circle cx="620" y="260" r="45" fill="#D4E4DA" opacity="0.8"/>
  
  <!-- Up arrow (growth) -->
  <polygon points="700,240 730,280 710,280 710,320 690,320 690,280 670,280" fill="white" opacity="0.9"/>
</svg>
`;

async function generate() {
  const assetsDir = path.join(__dirname, "..", "assets");

  for (const [filename, size] of Object.entries(SIZES)) {
    const svg = Buffer.from(svgIcon(size));
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(assetsDir, filename));
    console.log(`✅ Generated ${filename} (${size}x${size})`);
  }

  console.log("\n🎉 All icons generated!");
}

generate().catch(console.error);
