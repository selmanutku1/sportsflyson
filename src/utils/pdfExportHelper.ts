import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

/**
 * Converts an HTMLImageElement's source to a safe Base64 data URL so that
 * SVG <foreignObject> rendering in html-to-image never fails on CORS or cache-busting.
 */
async function inlineImageAsDataUrl(img: HTMLImageElement): Promise<void> {
  const src = img.getAttribute('src') || img.src || '';
  if (!src || src.startsWith('data:')) {
    return;
  }

  try {
    const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Empty'));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    img.src = dataUrl;
    img.removeAttribute('srcset');
  } catch {
    // Fallback: draw already-loaded image element to an offscreen canvas if possible
    try {
      if (img.complete && img.naturalWidth > 0) {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          img.src = c.toDataURL('image/png');
        }
      }
    } catch {
      // Ignore if cross-origin tainted
    }
  }
}

/**
 * Prepares a cloned DOM tree inside a fixed 1120px desktop stage (>= 1024px 'lg' breakpoint)
 * so that all responsive grids (sm:, md:, lg:), tables, SVGs, and images render with zero
 * distortion or clipping regardless of whether the user is on mobile, tablet, or desktop.
 */
async function prepareCloneForPdfCapture(
  sourceEl: HTMLElement,
  stageWidthPx: number = 1040,
  enforceFullA4Height: boolean = false
): Promise<{
  stageWrapper: HTMLDivElement;
  clonedRoot: HTMLElement;
  captureWidth: number;
  captureHeight: number;
}> {
  // Exact A4 printable ratio (200mm width x 287mm height = 1 : 1.435)
  const targetA4HeightPx = Math.round(stageWidthPx * (287 / 200));

  // Create an offscreen desktop-width stage (>= 1024px so Tailwind lg: breakpoints stay active inside SVG foreignObject)
  const stageWrapper = document.createElement('div');
  stageWrapper.className = 'pdf-export-stage light';
  stageWrapper.style.position = 'fixed';
  stageWrapper.style.left = '0';
  stageWrapper.style.top = '0';
  stageWrapper.style.width = `${stageWidthPx}px`;
  stageWrapper.style.minWidth = `${stageWidthPx}px`;
  stageWrapper.style.maxWidth = `${stageWidthPx}px`;
  stageWrapper.style.backgroundColor = '#ffffff';
  stageWrapper.style.color = '#0f172a';
  stageWrapper.style.zIndex = '-99999';
  stageWrapper.style.opacity = '1';
  stageWrapper.style.pointerEvents = 'none';
  stageWrapper.style.overflow = 'visible';

  const clonedRoot = sourceEl.cloneNode(true) as HTMLElement;
  clonedRoot.style.width = `${stageWidthPx}px`;
  clonedRoot.style.minWidth = `${stageWidthPx}px`;
  clonedRoot.style.maxWidth = `${stageWidthPx}px`;
  clonedRoot.style.minHeight = enforceFullA4Height ? `${targetA4HeightPx}px` : 'auto';
  clonedRoot.style.height = 'auto';
  clonedRoot.style.maxHeight = 'none';
  clonedRoot.style.display = 'flex';
  clonedRoot.style.flexDirection = 'column';
  clonedRoot.style.justifyContent = 'flex-start'; // Force override to prevent overlap
  clonedRoot.style.alignItems = 'stretch';
  clonedRoot.style.padding = '16px 20px';
  clonedRoot.style.border = 'none';
  clonedRoot.style.borderRadius = '0px';
  clonedRoot.style.position = 'relative';
  clonedRoot.style.overflow = 'visible';
  clonedRoot.style.margin = '0';
  clonedRoot.style.boxSizing = 'border-box';
  clonedRoot.style.backgroundColor = '#ffffff';
  clonedRoot.style.color = '#0f172a';
  clonedRoot.style.transform = 'none';
  clonedRoot.style.zoom = '100%';

  // Force all descendants to be visible to avoid clipping in html2canvas
  const allElements = clonedRoot.querySelectorAll('*');
  allElements.forEach((el) => {
    (el as HTMLElement).style.overflow = 'visible';
  });

  // Remove elements that should be hidden in print/PDF
  const ignoredNodes = clonedRoot.querySelectorAll(
    '.print\\:hidden, .pdf-export-hide, [data-html2canvas-ignore="true"], [data-print-ignore]'
  );
  ignoredNodes.forEach((node) => node.remove());

  stageWrapper.appendChild(clonedRoot);
  document.body.appendChild(stageWrapper);

  // Wait one frame for browser layout of the stage
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // Inline all images cleanly without corrupting data: URLs
  const sourceImages = Array.from(sourceEl.querySelectorAll('img'));
  const clonedImages = Array.from(clonedRoot.querySelectorAll('img'));

  for (let i = 0; i < clonedImages.length; i++) {
    const clonedImg = clonedImages[i];
    const sourceImg = sourceImages[i];

    if (clonedImg.src && clonedImg.src.startsWith('data:')) {
      continue;
    }

    let inlined = false;
    if (sourceImg && sourceImg.complete && sourceImg.naturalWidth > 0) {
      try {
        const c = document.createElement('canvas');
        c.width = sourceImg.naturalWidth;
        c.height = sourceImg.naturalHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(sourceImg, 0, 0);
          clonedImg.src = c.toDataURL('image/png');
          clonedImg.removeAttribute('srcset');
          inlined = true;
        }
      } catch {
        // Ignore canvas CORS taint
      }
    }

    if (!inlined) {
      try {
        await inlineImageAsDataUrl(clonedImg);
      } catch {
        // Keep original image src if inlining fails
      }
    }
  }

  // Lock explicit pixel dimensions and namespace on all SVG elements so SVG-inside-SVG foreignObject never distorts aspect ratios
  const svgs = Array.from(clonedRoot.querySelectorAll('svg'));
  svgs.forEach((svg) => {
    if (!svg.getAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));
      svg.style.width = `${w}px`;
      svg.style.height = `${h}px`;
      svg.style.maxWidth = 'none';
      svg.style.flexShrink = '0';
    }
  });

  // Ensure all SVG <text> elements in the clone have explicit fill, fontSize, fontWeight, and fontFamily attributes
  const sourceTexts = Array.from(sourceEl.querySelectorAll('svg text'));
  const clonedTexts = Array.from(clonedRoot.querySelectorAll('svg text'));
  for (let i = 0; i < clonedTexts.length; i++) {
    const cText = clonedTexts[i] as SVGTextElement;
    const sText = sourceTexts[i] as SVGTextElement;
    if (sText) {
      try {
        const comp = window.getComputedStyle(sText);
        if (comp.fill && comp.fill !== 'none' && (!cText.getAttribute('fill') || cText.getAttribute('fill') === 'currentColor')) {
          cText.setAttribute('fill', comp.fill);
        }
        if (!cText.getAttribute('font-size') && comp.fontSize) {
          cText.setAttribute('font-size', comp.fontSize);
        }
        if (!cText.getAttribute('font-weight') && comp.fontWeight) {
          cText.setAttribute('font-weight', comp.fontWeight);
        }
        if (!cText.getAttribute('font-family') && comp.fontFamily) {
          cText.setAttribute('font-family', comp.fontFamily);
        }
      } catch {
        // Ignore style access issues
      }
    }
    // Universal safeguard: if fill is still missing or transparent, default to #ffffff or inherit
    if (!cText.getAttribute('fill')) {
      const cls = cText.getAttribute('class') || '';
      if (cls.includes('fill-white') || cls.includes('text-white')) {
        cText.setAttribute('fill', '#ffffff');
      } else if (cls.includes('fill-slate-600') || cls.includes('fill-slate-500')) {
        cText.setAttribute('fill', '#475569');
      } else if (cls.includes('fill-rose-700')) {
        cText.setAttribute('fill', '#be123c');
      } else if (cls.includes('fill-emerald-800')) {
        cText.setAttribute('fill', '#065f46');
      } else {
        cText.setAttribute('fill', '#0f172a');
      }
    }
  }

  // Wait one more frame after locking SVG dimensions
  await new Promise((r) => requestAnimationFrame(r));
  
  // Explicitly force height to full scrollHeight to ensure capture captures everything
  clonedRoot.style.height = `${clonedRoot.scrollHeight}px`;
  await new Promise((r) => requestAnimationFrame(r));

  const rect = clonedRoot.getBoundingClientRect();
  const captureWidth = Math.ceil(rect.width || stageWidthPx);
  const captureHeight = Math.ceil(
    Math.max(clonedRoot.scrollHeight, clonedRoot.offsetHeight, rect.height)
  );

  return {
    stageWrapper,
    clonedRoot,
    captureWidth,
    captureHeight,
  };
}

/**
 * Renders a prepared DOM element to a high-DPI HTMLCanvasElement with multi-tier fallback.
 */
async function captureElementToCleanCanvas(
  sourceEl: HTMLElement,
  stageWidthPx: number = 1040,
  enforceFullA4Height: boolean = false
): Promise<{ canvas: HTMLCanvasElement; clonedRootHeight: number; blockBreakYsPx: number[] }> {
  const { stageWrapper, clonedRoot, captureWidth, captureHeight } =
    await prepareCloneForPdfCapture(sourceEl, stageWidthPx, enforceFullA4Height);

  try {
    const pixelRatio = 2;
    const rootTop = clonedRoot.getBoundingClientRect().top;
    const candidateBreakNodes = Array.from(
      clonedRoot.querySelectorAll(
        '.a4-avoid-break, .rounded-2xl, .rounded-xl, tr, .border-b, .grid > div'
      )
    );
    const breakSet = new Set<number>();
    candidateBreakNodes.forEach((node) => {
      const r = node.getBoundingClientRect();
      const relBottom = Math.round((r.bottom - rootTop) * pixelRatio);
      if (relBottom > 100 && relBottom < captureHeight * pixelRatio - 40) {
        breakSet.add(relBottom);
      }
    });
    const blockBreakYsPx = Array.from(breakSet).sort((a, b) => a - b);

    let canvas: HTMLCanvasElement | null = null;

    // Strategy 1: High-fidelity html2canvas rasterization directly on clonedRoot with desktop viewport
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = (html2canvasModule.default || html2canvasModule) as (
        el: HTMLElement,
        opts?: any
      ) => Promise<HTMLCanvasElement>;

      canvas = await html2canvas(clonedRoot, {
        scale: pixelRatio,
        width: captureWidth,
        height: captureHeight,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 12000,
        windowWidth: stageWidthPx,
        windowHeight: captureHeight,
      });
    } catch (h2cErr) {
      console.warn('[PDF Export] Strategy 1 (html2canvas on clone) failed, falling back to source element:', h2cErr);
    }

    // Strategy 2: html2canvas on live source element directly if visible
    if (!canvas && sourceEl && sourceEl.offsetHeight > 100) {
      try {
        const html2canvasModule = await import('html2canvas');
        const html2canvas = (html2canvasModule.default || html2canvasModule) as (
          el: HTMLElement,
          opts?: any
        ) => Promise<HTMLCanvasElement>;

        canvas = await html2canvas(sourceEl, {
          scale: pixelRatio,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 12000,
          windowWidth: stageWidthPx,
          windowHeight: captureHeight,
        });
      } catch (sourceH2cErr) {
        console.warn('[PDF Export] Strategy 2 (html2canvas on source) failed, falling back to html-to-image:', sourceH2cErr);
      }
    }

    // Strategy 3: html-to-image fallback as last resort
    if (!canvas) {
      try {
        canvas = await toCanvas(clonedRoot, {
          width: captureWidth,
          height: captureHeight,
          canvasWidth: captureWidth * pixelRatio,
          canvasHeight: captureHeight * pixelRatio,
          pixelRatio,
          backgroundColor: '#ffffff',
          cacheBust: false,
          skipFonts: true,
          fontEmbedCSS: '',
          style: {
            width: `${captureWidth}px`,
            height: `${captureHeight}px`,
            margin: '0',
            transform: 'none',
          },
        });
      } catch (toCanvasErr) {
        console.error('[PDF Export] All rasterization strategies failed for element:', toCanvasErr);
        throw new Error('Karne sayfası görselleştirilemedi. Lütfen sayfayı yenileyip tekrar deneyiniz.');
      }
    }

    return {
      canvas,
      clonedRootHeight: captureHeight,
      blockBreakYsPx,
    };
  } finally {
    if (stageWrapper.parentNode) {
      stageWrapper.parentNode.removeChild(stageWrapper);
    }
  }
}

/**
 * Exports an array of A4 page elements into a crisp, distortion-free A4 portrait PDF.
 */
export async function exportReportPagesToA4Pdf(options: {
  pageIds: string[];
  fileName: string;
  onPageProgress?: (pageIndex: number, totalPages: number) => void;
}): Promise<void> {
  const { pageIds, fileName, onPageProgress } = options;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const marginMm = 5;
  const availW = pdfWidth - marginMm * 2; // 200 mm
  const availH = pdfHeight - marginMm * 2; // 287 mm

  let addedPages = 0;

  for (let i = 0; i < pageIds.length; i++) {
    if (onPageProgress) {
      onPageProgress(i + 1, pageIds.length);
    }

    const pageId = pageIds[i];
    const pageEl = document.getElementById(pageId);
    if (!pageEl) {
      console.warn(`[PDF Export] Element with id "${pageId}" not found in DOM, skipping.`);
      continue;
    }

    try {
      // Capture at fixed 1040px desktop width (>=1024px lg breakpoint) with full A4 height ratio
      const { canvas } = await captureElementToCleanCanvas(pageEl, 1040, true);

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      const scale = Math.min(availW / canvas.width, availH / canvas.height);
      const renderW = +(canvas.width * scale).toFixed(2);
      const renderH = +(canvas.height * scale).toFixed(2);
      const offsetX = +(marginMm + (availW - renderW) / 2).toFixed(2);
      const offsetY = +(marginMm + (availH - renderH) / 2).toFixed(2);

      if (addedPages > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
      addedPages++;
    } catch (pageErr) {
      console.error(`[PDF Export] Error rendering page "${pageId}":`, pageErr);
    }
  }

  if (addedPages === 0) {
    throw new Error('Karne sayfaları bulunamadı veya görselleştirilemedi. Lütfen karneyi ekranda açıp tekrar deneyiniz.');
  }

  pdf.save(fileName);
}

/**
 * Checks whether a horizontal pixel row in a canvas is predominantly white/light background,
 * allowing safe pagination without slicing through text or graphics.
 */
function findCleanHorizontalCutRow(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  idealCutY: number,
  minCutY: number
): number {
  const searchRange = Math.max(20, idealCutY - minCutY);
  const startY = Math.max(0, idealCutY - searchRange);
  const heightToScan = idealCutY - startY;
  if (heightToScan <= 2) return idealCutY;

  try {
    const imgData = ctx.getImageData(0, startY, canvasWidth, heightToScan).data;
    const stride = canvasWidth * 4;

    // Scan upwards from idealCutY to find a row where almost all pixels are white/near-white (#f8fafc..#ffffff)
    for (let offsetY = heightToScan - 1; offsetY >= 0; offsetY--) {
      const rowStart = offsetY * stride;
      let nonBgPixels = 0;
      // Sample every 4th pixel horizontally for speed
      for (let x = 24; x < canvasWidth - 24; x += 4) {
        const idx = rowStart + x * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        // Consider pure white (#ffffff) or slate-50/100 (#f1f5f9 / #f8fafc) as safe background
        const isLightBg = r >= 240 && g >= 242 && b >= 245;
        if (!isLightBg) {
          nonBgPixels++;
          if (nonBgPixels > 3) break;
        }
      }
      if (nonBgPixels <= 3) {
        return startY + offsetY;
      }
    }
  } catch {
    // Fallback to idealCutY if getImageData fails
  }

  return idealCutY;
}

/**
 * Exports a single tall report card container (e.g. SporcuKarnesiView #sporcu-karne-print-area)
 * into a multi-page A4 PDF using smart whitespace row detection so text and charts are never sliced mid-line.
 */
export async function exportContainerToSmartA4Pdf(options: {
  containerEl: HTMLElement;
  fileName: string;
}): Promise<void> {
  const { containerEl, fileName } = options;

  const { canvas } = await captureElementToCleanCanvas(containerEl, 1120);
  const fullCtx = canvas.getContext('2d');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const marginMm = 6;
  const usableW = pdfWidth - marginMm * 2; // 198 mm
  const usableH = pdfHeight - marginMm * 2; // 285 mm

  const pxPerMm = canvas.width / usableW;
  const maxPageSlicePx = Math.floor(usableH * pxPerMm);

  let yOffsetPx = 0;
  let pageIndex = 0;

  while (yOffsetPx < canvas.height - 10) {
    const remainingPx = canvas.height - yOffsetPx;
    let sliceHeightPx = remainingPx;

    if (remainingPx > maxPageSlicePx) {
      const idealCutY = yOffsetPx + maxPageSlicePx;
      const minCutY = yOffsetPx + Math.floor(maxPageSlicePx * 0.72);
      const safeCutY = fullCtx
        ? findCleanHorizontalCutRow(fullCtx, canvas.width, idealCutY, minCutY)
        : idealCutY;
      sliceHeightPx = Math.max(200, safeCutY - yOffsetPx);
    }

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const pageCtx = pageCanvas.getContext('2d');

    if (pageCtx) {
      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0,
        yOffsetPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      const sliceImg = pageCanvas.toDataURL('image/jpeg', 0.96);
      const sliceMmH = sliceHeightPx / pxPerMm;

      if (pageIndex > 0) {
        pdf.addPage();
      }
      pdf.addImage(sliceImg, 'JPEG', marginMm, marginMm, usableW, sliceMmH, undefined, 'FAST');
    }

    yOffsetPx += sliceHeightPx;
    pageIndex++;
  }

  pdf.save(fileName);
}

/**
 * Builder class for generating a single combined multi-athlete A4 PDF
 * where each athlete's 7-page report card is captured and appended sequentially.
 */
export class BatchA4PdfBuilder {
  private pdf: jsPDF;
  private addedPages: number = 0;
  private readonly pdfWidth: number;
  private readonly pdfHeight: number;
  private readonly marginMm: number = 5;
  private readonly availW: number;
  private readonly availH: number;

  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    this.pdfWidth = this.pdf.internal.pageSize.getWidth();
    this.pdfHeight = this.pdf.internal.pageSize.getHeight();
    this.availW = this.pdfWidth - this.marginMm * 2;
    this.availH = this.pdfHeight - this.marginMm * 2;
  }

  async appendReportPages(
    pageIds: string[],
    onPageProgress?: (pageIndex: number, totalPages: number) => void
  ): Promise<void> {
    for (let i = 0; i < pageIds.length; i++) {
      if (onPageProgress) {
        onPageProgress(i + 1, pageIds.length);
      }

      const pageEl = document.getElementById(pageIds[i]);
      if (!pageEl) continue;

      try {
        const { canvas } = await captureElementToCleanCanvas(pageEl, 1040, false);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const scale = Math.min(this.availW / canvas.width, this.availH / canvas.height);
        const renderW = +(canvas.width * scale).toFixed(2);
        const renderH = +(canvas.height * scale).toFixed(2);
        const offsetX = +(this.marginMm + (this.availW - renderW) / 2).toFixed(2);
        const offsetY = +(this.marginMm + (this.availH - renderH) / 2).toFixed(2);

        if (this.addedPages > 0) {
          this.pdf.addPage();
        }
        this.pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');
        this.addedPages++;
      } catch (pageErr) {
        console.error(`[Batch PDF] Error capturing page "${pageIds[i]}":`, pageErr);
      }
    }
  }

  save(fileName: string): void {
    if (this.addedPages > 0) {
      this.pdf.save(fileName);
    }
  }
}

