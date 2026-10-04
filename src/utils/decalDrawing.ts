import type { GraphicDecal } from '../types/cad';

export function drawDecalText(ctx: CanvasRenderingContext2D, decal: GraphicDecal) {
  const font = decal.fontProps;
  ctx.fillStyle = font?.color || '#ffffff';
  ctx.font = `${font?.fontWeight || 'bold'} ${font?.fontSize || 24}px ${font?.fontFamily || 'sans-serif'}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = Array.from(decal.content), spacing = font?.letterSpacing || 0;
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, value) => sum + value, 0) + Math.max(0, chars.length - 1) * spacing;
  const curvature = font?.arcCurvature || 0;
  const radius = Math.max(40, total) / (Math.max(.001, Math.abs(curvature)) * 1.8);
  const rise = curvature ? (1 - Math.cos(total / 2 / radius)) * radius : 0;
  ctx.save();
  ctx.scale(Math.min(1, decal.width / Math.max(1,total)), Math.min(1, decal.height / Math.max(1,(font?.fontSize || 24) * 1.3 + rise)));
  ctx.translate(0, -rise / 2 * Math.sign(curvature));
  let x = -total / 2;
  chars.forEach((char, index) => {
    const center = x + widths[index] / 2;
    ctx.save();
    if (curvature) { const angle = center / radius; ctx.translate(Math.sin(angle) * radius, (1 - Math.cos(angle)) * radius * Math.sign(curvature)); ctx.rotate(angle * Math.sign(curvature)); }
    else ctx.translate(center, 0);
    ctx.fillText(char, 0, 0); ctx.restore(); x += widths[index] + spacing;
  });
  ctx.restore();
}

export async function prepareArtwork(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await image.decode().catch(() => { throw new Error('This image could not be read. Try another image.'); });
    const factor = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * factor)); canvas.height = Math.max(1, Math.round(image.naturalHeight * factor));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Image processing is unavailable in this browser.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const content = canvas.toDataURL('image/webp', .9);
    if (content.length > 2 * 1024 * 1024) throw new Error('This image has too much detail. Resize it before uploading.');
    const width = 140, height = Math.max(1, Math.min(2000, width * canvas.height / canvas.width));
    return { content, width, height };
  } finally { URL.revokeObjectURL(url); }
}
