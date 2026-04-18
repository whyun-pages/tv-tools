import { createDecipheriv } from 'node:crypto';
import type { TVBoxConfig } from './types';

const TVBOX_PREFIX_PATTERN = /[A-Za-z0-9]{8}\*\*/;

function rightPadding(value: string, fill: string, length: number): string {
  const trimmed = value.trim();

  if (trimmed.length > length) {
    return trimmed.slice(0, length);
  }

  if (trimmed.length === length) {
    return trimmed;
  }

  return trimmed + fill.repeat(length - trimmed.length);
}

function isJson(content: string): boolean {
  try {
    parseJsonValue(content);
    return true;
  } catch {
    return false;
  }
}

function stripJsonComments(input: string): string {
  const content = input.replace(/^\uFEFF/, '');
  let output = '';
  let inString = false;
  let escaping = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < content.length; index += 1) {
    const current = content[index];
    const next = content[index + 1];

    if (inLineComment) {
      if (current === '\n' || current === '\r') {
        inLineComment = false;
        output += current;
      }
      continue;
    }

    if (inBlockComment) {
      if (current === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      output += current;

      if (escaping) {
        escaping = false;
      } else if (current === '\\') {
        escaping = true;
      } else if (current === '"') {
        inString = false;
      }
      continue;
    }

    if (current === '"') {
      inString = true;
      output += current;
      continue;
    }

    if (current === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    output += current;
  }

  return output;
}

function parseJsonValue<T = unknown>(input: string): T {
  return JSON.parse(stripJsonComments(input)) as T;
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, 'hex');
}

function decryptEcb(hex: string, key: string): string {
  const normalizedKey = Buffer.from(rightPadding(key, '0', 16), 'utf8');
  const decipher = createDecipheriv('aes-128-ecb', normalizedKey, null);
  decipher.setAutoPadding(true);

  return Buffer.concat([
    decipher.update(hexToBuffer(hex)),
    decipher.final(),
  ]).toString('utf8');
}

function decryptCbc(hex: string, key: string, iv: string): string {
  const keyBuffer = Buffer.from(rightPadding(key, '0', 16), 'utf8');
  const ivBuffer = Buffer.from(rightPadding(iv, '0', 16), 'utf8');
  const decipher = createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  decipher.setAutoPadding(true);

  return Buffer.concat([
    decipher.update(hexToBuffer(hex)),
    decipher.final(),
  ]).toString('utf8');
}

export function decodeTvboxJson(
  input: string,
  configKey?: string | null,
): string {
  let json = input;
  let content = input;

  try {
    if (isJson(content)) {
      return content;
    }

    const matchedPrefix = content.match(TVBOX_PREFIX_PATTERN);
    if (matchedPrefix) {
      const marker = matchedPrefix[0];
      content = content.slice(content.indexOf(marker) + marker.length);
      content = Buffer.from(content, 'base64').toString('utf8');
    }

    if (content.startsWith('2423')) {
      const data = content.slice(
        content.indexOf('2324') + 4,
        content.length - 26,
      );
      const decodedContent = hexToBuffer(content)
        .toString('utf8')
        .toLowerCase();
      const key = rightPadding(
        decodedContent.slice(
          decodedContent.indexOf('$#') + 2,
          decodedContent.indexOf('#$'),
        ),
        '0',
        16,
      );
      const iv = rightPadding(
        decodedContent.slice(decodedContent.length - 13),
        '0',
        16,
      );
      json = decryptCbc(data, key, iv);
    } else if (configKey && !isJson(content)) {
      json = decryptEcb(content, configKey);
    } else {
      json = content;
    }
  } catch {
    return json;
  }

  return json;
}

export function parseTvboxJson<T = TVBoxConfig>(
  input: string,
  configKey?: string | null,
): T {
  return parseJsonValue<T>(decodeTvboxJson(input, configKey));
}
