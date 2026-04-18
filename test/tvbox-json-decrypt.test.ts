import { createCipheriv } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decodeTvboxJson, parseTvboxJson } from '../src';

function encryptEcb(text: string, key: string): string {
  const normalizedKey = Buffer.from(
    key.trim().padEnd(16, '0').slice(0, 16),
    'utf8',
  );
  const cipher = createCipheriv('aes-128-ecb', normalizedKey, null);
  cipher.setAutoPadding(true);

  return Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString(
    'hex',
  );
}

async function fetchBodyTextWithOkhttp(url: string): Promise<{
  bodyText: string;
  ok: boolean;
}> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'okhttp',
    },
  });

  return {
    bodyText: await response.text(),
    ok: response.ok,
  };
}

describe('decodeTvboxJson', () => {
  it('returns plain JSON as-is', () => {
    const json = '{"sites":[{"name":"demo"}]}';

    expect(decodeTvboxJson(json)).toBe(json);
  });

  it('decodes wrapped base64 JSON', () => {
    const wrapped = `ABCDEFG0**${Buffer.from('{"hello":"world"}', 'utf8').toString('base64')}`;

    expect(parseTvboxJson<{ hello: string }>(wrapped)).toEqual({
      hello: 'world',
    });
  });

  it('parses wrapped base64 JSON with comments', () => {
    const commentedJson = `{
  "sites": [
    {"key":"demo1"},
    // {"key":"disabled"}
    {"key":"demo2"}
  ]
}`;
    const wrapped = `ABCDEFG0**${Buffer.from(commentedJson, 'utf8').toString('base64')}`;

    expect(parseTvboxJson<{ sites: Array<{ key: string }> }>(wrapped)).toEqual({
      sites: [{ key: 'demo1' }, { key: 'demo2' }],
    });
  });

  it('decodes AES-ECB payloads with configKey', () => {
    const json = '{"sites":[{"key":"demo"}]}';
    const encrypted = encryptEcb(json, 'secret');

    expect(decodeTvboxJson(encrypted, 'secret')).toBe(json);
  });

  it('fetches https://www.饭太硬.com/tv with okhttp UA and parses its body directly', async () => {
    const response = await fetchBodyTextWithOkhttp('https://www.饭太硬.com/tv');
    const parsedConfig = parseTvboxJson<{ sites?: Array<unknown> }>(
      response.bodyText,
    );

    expect(response.ok).toBe(true);
    expect(Array.isArray(parsedConfig.sites)).toBe(true);
    expect(parsedConfig.sites?.length ?? 0).toBeGreaterThan(0);
  });
});
