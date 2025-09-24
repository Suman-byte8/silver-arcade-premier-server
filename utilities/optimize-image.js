// optimize-image.js
// Node >= 14
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const sharp = require('sharp');

/**
 * optimizeImage
 * @param {string} inputPath - path to input image
 * @param {string} outputPath - desired output path (extension determines format if format not forced)
 * @param {number} targetKB - target file size in KB (best-effort)
 * @param {object} [opts] - optional settings
 * @returns {Promise<{ success: boolean, finalSizeKB: number, attemptedFormat: string, message: string }>}
 */
async function optimizeImage(inputPath, outputPath, targetKB, opts = {}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'imgopt-'));
  try {
    if (!await fs.pathExists(inputPath)) {
      return { success: false, finalSizeKB: 0, attemptedFormat: null, message: 'input not found' };
    }

    // options
    const {
      minQuality = 30,     // minimum encoder quality (0-100)
      maxAttempts = 12,    // iteration limit
      resizeStep = 0.90,   // scale down by 10% when resizing
      formats = ['avif', 'webp', 'jpeg'], // preference order
      preserveAlpha = true
    } = opts;

    // get original metadata
    const inputMeta = await sharp(inputPath).metadata();
    let width = inputMeta.width || null;
    let height = inputMeta.height || null;

    let attempt = 0;
    // start with no resizing scale = 1.0
    let scale = 1.0;

    // function to encode into chosen format with given quality and save to temp file
    async function tryEncode(format, quality, scaleLocal) {
      const tmpFile = path.join(tmpDir, `out.${format}`);
      const pipeline = sharp(inputPath, { sequentialRead: true }).rotate();

      if (scaleLocal < 0.999 && width && height) {
        pipeline.resize(Math.max(1, Math.round(width * scaleLocal)), Math.max(1, Math.round(height * scaleLocal)));
      }

      // remove metadata
      pipeline.withMetadata({});

      // choose encoder options per format
      if (format === 'avif') {
        pipeline.avif({
          quality: Math.round(quality),
          effort: 4,        // 0-9 (higher = slower/better)
          chromaSubsampling: '4:2:0',
          lossless: false
        });
      } else if (format === 'webp') {
        pipeline.webp({
          quality: Math.round(quality),
          nearLossless: false,
          lossless: false,
          reductionEffort: 6
        });
      } else if (format === 'jpeg') {
        pipeline.jpeg({
          quality: Math.round(quality),
          mozjpeg: true,
          progressive: true
        });
      } else {
        // fallback to toFile directly (let sharp infer)
      }

      await pipeline.toFile(tmpFile);
      const stats = await fs.stat(tmpFile);
      return { tmpFile, sizeKB: Math.round(stats.size / 1024) };
    }

    // iterative loop: try formats and qualities then downscale if needed
    let lastSuccessful = null;
    outer: while (attempt < maxAttempts) {
      attempt += 1;
      for (const fmt of formats) {
        // try quality values from high to minQuality (ex: 90, 80, 70 ...)
        for (let q = 90; q >= minQuality; q -= 10) {
          const { tmpFile, sizeKB } = await tryEncode(fmt, q, scale);
          // If output is already at or below target, promote to final output
          if (sizeKB <= targetKB) {
            await fs.move(tmpFile, outputPath, { overwrite: true });
            return { success: true, finalSizeKB: sizeKB, attemptedFormat: fmt, message: `Hit target at quality ${q}, scale ${Math.round(scale*100)}%` };
          }
          // keep track of best smallest candidate
          if (!lastSuccessful || sizeKB < lastSuccessful.sizeKB) {
            lastSuccessful = { tmpFile, sizeKB, fmt, q, scale: scale };
          }
          // delete tmpFile if it's not the best
          // (if it is the best we keep it to maybe promote later)
          if (lastSuccessful.tmpFile !== tmpFile) {
            await fs.remove(tmpFile).catch(()=>{});
          }
        } // q loop
      } // fmt loop

      // If we didn't reach target: reduce scale and try again
      scale = scale * resizeStep;
      // if scaling would make dimension < 1 px, break
      if (width && Math.round(width * scale) < 1) break;
      if (height && Math.round(height * scale) < 1) break;
    } // while attempts

    // If we exit here, we didn't meet targetKB. Use the best candidate we found.
    if (lastSuccessful) {
      await fs.move(lastSuccessful.tmpFile, outputPath, { overwrite: true });
      return { success: false, finalSizeKB: lastSuccessful.sizeKB, attemptedFormat: lastSuccessful.fmt, message: `Best-effort saved; target not reached. quality=${lastSuccessful.q}, scale=${Math.round(lastSuccessful.scale*100)}%` };
    } else {
      return { success: false, finalSizeKB: 0, attemptedFormat: null, message: 'Could not process image' };
    }
  } finally {
    // cleanup tmp dir
    try { await fs.remove(tmpDir); } catch(_) {}
  }
}

module.exports = { optimizeImage };
