import jsPDF from "jspdf";

// Load Tamil font for proper rendering in browser canvas.
// Note: jsPDF cannot reliably render Tamil glyphs directly, so we draw text to a canvas
// and embed it as an image.
export const loadTamilFont = async (): Promise<void> => {
  const fontUrl = "/fonts/NotoSansTamil-Regular.ttf";

  // Trigger a fetch so the browser has the file cached/available.
  await fetch(fontUrl).then((r) => r.arrayBuffer()).catch(() => undefined);

  return new Promise((resolve) => {
    const font = new FontFace("NotoSansTamil", `url(${fontUrl})`);
    font
      .load()
      .then(() => {
        document.fonts.add(font);
        resolve();
      })
      .catch(() => resolve());
  });
};

// Calculate text width for a given font size
const measureTextWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontWeight: "normal" | "bold",
  scale: number
): number => {
  const fontFamily = "NotoSansTamil, Noto Sans Tamil, sans-serif";
  ctx.font = `${fontWeight} ${fontSize * scale}px ${fontFamily}`;
  return ctx.measureText(text).width / scale;
};

// Auto-shrink text to fit within maxWidth
export const getAutoShrinkFontSize = (
  text: string,
  baseFontSize: number,
  maxWidth: number,
  fontWeight: "normal" | "bold" = "normal",
  minFontSize: number = 6
): number => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scale = 4;
  
  let fontSize = baseFontSize;
  let width = measureTextWidth(ctx, text, fontSize, fontWeight, scale);
  
  while (width > maxWidth && fontSize > minFontSize) {
    fontSize -= 0.5;
    width = measureTextWidth(ctx, text, fontSize, fontWeight, scale);
  }
  
  return fontSize;
};

// Render Tamil/Unicode text via canvas for correct glyph shaping.
export const addTamilText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontWeight: "normal" | "bold" = "normal",
  align: "left" | "center" | "right" = "left",
  maxWidth?: number,
  autoShrink: boolean = false,
  lineHeightMultiplier: number = 1.0
): number => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // High scale factor prevents blur (Tamil has fine details).
  const scale = 4;
  const fontFamily = "NotoSansTamil, Noto Sans Tamil, sans-serif";
  
  // Auto-shrink font if needed
  let actualFontSize = fontSize;
  if (autoShrink && maxWidth) {
    actualFontSize = getAutoShrinkFontSize(text, fontSize, maxWidth, fontWeight);
  }
  
  const scaledFontSize = actualFontSize * scale;

  ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const textWidth = ctx.measureText(text).width / scale;

  let xPos = x;
  if (align === "center") {
    xPos = (pageWidth - textWidth) / 2;
  } else if (align === "right") {
    xPos = pageWidth - x - textWidth;
  }

  // Wrap by spaces (best-effort) when maxWidth is provided and not auto-shrinking.
  if (maxWidth && textWidth > maxWidth && !autoShrink) {
    const words = text.split(" ");
    let currentLine = "";
    let currentY = y;
    const lineHeight = actualFontSize * lineHeightMultiplier; // Configurable line height

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
      const testWidth = ctx.measureText(testLine).width / scale;

      if (testWidth > maxWidth && currentLine) {
        // Render current line
        const lineTextWidth = ctx.measureText(currentLine).width;
        canvas.width = Math.ceil(lineTextWidth) + 20 * scale;
        canvas.height = Math.ceil(scaledFontSize * 1.4);
        ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
        ctx.fillStyle = "#000";
        ctx.textBaseline = "top";
        ctx.fillText(currentLine, 0, scaledFontSize * 0.2);

        doc.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          xPos,
          currentY,
          canvas.width / scale,
          canvas.height / scale
        );

        currentY += lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    // Render last line
    if (currentLine) {
      ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
      const lineTextWidth = ctx.measureText(currentLine).width;
      canvas.width = Math.ceil(lineTextWidth) + 20 * scale;
      canvas.height = Math.ceil(scaledFontSize * 1.4);
      ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "top";
      ctx.fillText(currentLine, 0, scaledFontSize * 0.2);

      doc.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        xPos,
        currentY,
        canvas.width / scale,
        canvas.height / scale
      );
      currentY += lineHeight;
    }

    return currentY;
  }

  // Single line rendering
  const measuredWidth = ctx.measureText(text).width;
  canvas.width = Math.ceil(measuredWidth) + 20 * scale;
  canvas.height = Math.ceil(scaledFontSize * 1.4);
  ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  ctx.fillText(text, 0, scaledFontSize * 0.2);

  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    xPos,
    y,
    canvas.width / scale,
    canvas.height / scale
  );

  return y + actualFontSize * 0.45;
};
