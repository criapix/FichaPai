// Gera ícones PNG simples (fundo azul com cruz médica branca) sem dependências.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// CRC32 (tabela)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size) {
  const bg = [31, 95, 139];   // azul do tema
  const fg = [255, 255, 255]; // cruz branca
  // dimensões da cruz centralizada
  const arm = Math.round(size * 0.18); // meia-largura do braço
  const len = Math.round(size * 0.30); // meio-comprimento
  const cx = size / 2, cy = size / 2;

  const raw = Buffer.alloc((size * 3 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filtro 0
    for (let x = 0; x < size; x++) {
      const dx = Math.abs(x + 0.5 - cx), dy = Math.abs(y + 0.5 - cy);
      const naCruz = (dx <= arm && dy <= len) || (dy <= arm && dx <= len);
      const cor = naCruz ? fg : bg;
      raw[p++] = cor[0]; raw[p++] = cor[1]; raw[p++] = cor[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  // demais bytes (compress, filter, interlace) = 0

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

for (const size of [192, 512]) {
  writeFileSync(join(ROOT, "icons", `icon-${size}.png`), makePng(size));
  console.log(`icons/icon-${size}.png gerado.`);
}
