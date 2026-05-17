import zlib from "zlib";

export async function extractResumeText(file) {
  if (!file || typeof file === "string") return "";

  const name = file.name || "resume";
  const type = file.type || "";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (type.startsWith("text/") || name.toLowerCase().endsWith(".txt")) {
    return buffer.toString("utf8").trim();
  }

  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdfBuffer(buffer);
  }

  if (name.toLowerCase().endsWith(".docx")) {
    return extractTextFromDocxBuffer(buffer);
  }

  return normalizeText(buffer.toString("utf8"));
}

function extractTextFromPdfBuffer(buffer) {
  const raw = buffer.toString("latin1");
  const fontMaps = parsePdfFontMaps(raw);
  const streamText = extractPdfStreams(raw)
    .map((stream) => extractTextOperators(stream, fontMaps))
    .filter(Boolean)
    .join(" ");

  const normalizedStreamText = normalizeText(streamText);
  if (normalizedStreamText.length > 80) return normalizedStreamText.slice(0, 30000);

  const directText = normalizeText(extractTextOperators(raw, fontMaps));
  if (directText.length > 80) return directText.slice(0, 30000);

  return normalizeText(raw).slice(0, 30000);
}

function extractPdfStreams(raw) {
  const streams = [];
  const streamPattern = /(<<[\s\S]*?>>)\s*stream\r?\n?([\s\S]*?)\r?\n?endstream/g;

  for (const match of raw.matchAll(streamPattern)) {
    const dictionary = match[1] || "";
    const body = match[2] || "";
    if (!/FlateDecode/i.test(dictionary)) {
      streams.push(body);
      continue;
    }

    try {
      streams.push(zlib.inflateSync(Buffer.from(body, "latin1")).toString("latin1"));
    } catch {
      streams.push(body);
    }
  }

  return streams;
}

function extractTextOperators(raw, fontMaps = {}) {
  const fragments = [];
  let currentFont = "";
  const literalStringPattern = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
  const arrayPattern = /\[((?:\s*\([^()\\]*(?:\\.[^()\\]*)*\)\s*)+)\]\s*TJ/g;
  const textTokenPattern = /\/(F\d+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f\s]+)>\s*Tj|\[((?:\s*<[\dA-Fa-f\s]+>\s*)+)\]\s*TJ/g;

  for (const match of raw.matchAll(literalStringPattern)) {
    fragments.push(unescapePdfText(match[1]));
  }

  for (const match of raw.matchAll(arrayPattern)) {
    for (const item of match[1].matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g)) {
      fragments.push(unescapePdfText(item[1]));
    }
  }

  for (const match of raw.matchAll(textTokenPattern)) {
    if (match[1]) {
      currentFont = match[1];
      continue;
    }
    if (match[2]) {
      fragments.push(decodeHexPdfText(match[2], fontMaps[currentFont]));
      continue;
    }
    if (match[3]) {
      for (const item of match[3].matchAll(/<([0-9A-Fa-f\s]+)>/g)) {
        fragments.push(decodeHexPdfText(item[1], fontMaps[currentFont]));
      }
    }
  }

  return fragments.join(" ");
}

function parsePdfFontMaps(raw) {
  const maps = {};
  const fontObjects = {};

  for (const match of raw.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
    fontObjects[match[1]] = match[2];
  }

  for (const [fontName, fontObjectId] of Object.entries(fontObjects)) {
    const fontObject = objectBodies(raw, fontObjectId).find((body) => /\/ToUnicode\s+\d+\s+0\s+R/.test(body));
    const toUnicodeId = fontObject?.match(/\/ToUnicode\s+(\d+)\s+0\s+R/)?.[1];
    if (!toUnicodeId) continue;
    const cmapObject = objectBodies(raw, toUnicodeId).find((body) => /stream/.test(body));
    const cmap = streamBody(cmapObject || "");
    if (cmap) maps[fontName] = parseCMap(cmap);
  }

  return maps;
}

function objectBodies(raw, objectId) {
  const pattern = new RegExp(`${objectId}\\s+0\\s+obj([\\s\\S]*?)endobj`, "g");
  return [...raw.matchAll(pattern)].map((match) => match[1] || "");
}

function streamBody(objectText) {
  const match = objectText.match(/stream\r?\n?([\s\S]*?)\r?\n?endstream/);
  if (!match) return "";
  const stream = match[1] || "";
  if (!/FlateDecode/i.test(objectText)) return stream;
  try {
    return zlib.inflateSync(Buffer.from(stream, "latin1")).toString("latin1");
  } catch {
    return stream;
  }
}

function parseCMap(cmap) {
  const map = {};

  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const item of block[1].matchAll(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g)) {
      map[Number.parseInt(item[1], 16)] = unicodeFromHex(item[2]);
    }
  }

  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const item of block[1].matchAll(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g)) {
      const start = Number.parseInt(item[1], 16);
      const end = Number.parseInt(item[2], 16);
      const unicodeStart = Number.parseInt(item[3], 16);
      for (let code = start; code <= end; code += 1) {
        map[code] = String.fromCodePoint(unicodeStart + code - start);
      }
    }
    for (const item of block[1].matchAll(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+\[((?:\s*<[0-9A-Fa-f]+>\s*)+)\]/g)) {
      const start = Number.parseInt(item[1], 16);
      let offset = 0;
      for (const value of item[3].matchAll(/<([0-9A-Fa-f]+)>/g)) {
        map[start + offset] = unicodeFromHex(value[1]);
        offset += 1;
      }
    }
  }

  return map;
}

function extractTextFromDocxBuffer(buffer) {
  const raw = buffer.toString("utf8");
  return normalizeText(raw.replace(/<[^>]+>/g, " ")).slice(0, 30000);
}

function unescapePdfText(value) {
  return String(value || "")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .trim();
}

function decodeHexPdfText(value, fontMap) {
  const hex = String(value || "").replace(/\s+/g, "");
  if (!hex) return "";
  if (fontMap && hex.length % 4 === 0) {
    const chars = [];
    for (let index = 0; index < hex.length; index += 4) {
      const code = Number.parseInt(hex.slice(index, index + 4), 16);
      chars.push(fontMap[code] || "");
    }
    return chars.join("");
  }
  const padded = hex.length % 2 ? `${hex}0` : hex;
  const buffer = Buffer.from(padded, "hex");

  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    const chars = [];
    for (let index = 2; index + 1 < buffer.length; index += 2) {
      chars.push(String.fromCharCode(buffer.readUInt16BE(index)));
    }
    return chars.join("");
  }

  return buffer.toString("latin1");
}

function unicodeFromHex(hex) {
  const value = Number.parseInt(hex, 16);
  if (!Number.isFinite(value)) return "";
  return String.fromCodePoint(value);
}

function normalizeText(value) {
  const cleaned = String(value || "")
    .replace(/[\u2022\u25cf]/g, "\n- ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return addResumeStructure(repairSpacedLetters(cleaned)
    .replace(/\b([A-Z][a-z]+)([A-Z][a-z]+)\b/g, "$1 $2")
    .replace(/\b([B-HJ-Z]) ([a-z]{2,})\b/g, "$1$2")
    .replace(/\bA WS\b/g, "AWS")
    .replace(/\bGP A\b/g, "GPA")
    .replace(/\bJava Script\b/g, "JavaScript")
    .replace(/\bGit Hub\b/g, "GitHub")
    .replace(/\bPyT orch\b/g, "PyTorch")
    .replace(/\bT ensorFlow\b/g, "TensorFlow")
    .replace(/\bT ailwindCSS\b/g, "TailwindCSS")
    .replace(/\bT ableau\b/g, "Tableau")
    .replace(/\bT ypeScript\b/g, "TypeScript")
    .replace(/\bV isualisation\b/g, "Visualisation")
    .replace(/\bW indows\b/g, "Windows")
    .replace(/\bW orkflows\b/g, "Workflows")
    .replace(/\bW eb\b/g, "Web")
    .replace(/\blar ge\b/g, "large")
    .replace(/\bpr oduction\b/g, "production")
    .replace(/\bpr ompting\b/g, "prompting")
    .replace(/\berr or\b/g, "error")
    .replace(/\br esponsive\b/g, "responsive")
    .replace(/\br ecipes\b/g, "recipes")
    .replace(/\bpr eparation\b/g, "preparation")
    .replace(/\bEDUCA TION\b/g, "EDUCATION")
    .replace(/\bRELEV ANT\b/g, "RELEVANT")
    .replace(/\bT echnology\b/g, "Technology")
    .replace(/\bT echnical\b/g, "Technical")
    .replace(/\s+/g, " ")
    .trim());
}

function repairSpacedLetters(text) {
  const tokens = String(text || "").split(" ");
  const output = [];
  let run = [];

  const flush = () => {
    if (!run.length) return;
    if (run.length >= 3) {
      output.push(run.join(""));
    } else {
      output.push(...run);
    }
    run = [];
  };

  for (const token of tokens) {
    if (/^[A-Za-z]$/.test(token)) {
      run.push(token);
    } else {
      flush();
      output.push(token);
    }
  }
  flush();

  return output.join(" ");
}

function addResumeStructure(text) {
  return String(text || "")
    .replace(/\s+(PROFILE)\s+/g, "\nPROFILE\n")
    .replace(/\s+(EDUCATION)\s+/g, "\nEDUCATION\n")
    .replace(/\s+(RELEVANT COURSEWORK)\s+/g, "\nRELEVANT COURSEWORK\n")
    .replace(/\s+(WORK EXPERIENCE|PROFESSIONAL EXPERIENCE)\s+/g, "\nWORK EXPERIENCE\n")
    .replace(/\s+(SKILLS & CERTIFICATIONS|SKILLS AND CERTIFICATIONS|TECHNICAL SKILLS|SKILLS)\s+/g, "\nSKILLS & CERTIFICATIONS\n")
    .replace(/\s+(TECHNICAL PROJECTS|PROJECTS)\s+/g, "\nTECHNICAL PROJECTS\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
