/**
 * Reverse-proxy Amplify branch hosting without CloudFront→CloudFront 403.
 * Forwards Authorization so Amplify Basic Auth still protects the app.
 * /robots.txt is short-circuited by the CloudFront Function (never hits this Lambda).
 */
const ORIGIN = process.env.AMPLIFY_ORIGIN || 'https://master.d4ud0u4vg91jy.amplifyapp.com';

const HOP_BY_HOP = new Set([
  'host',
  'content-length',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'via',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-amzn-trace-id',
  'cloudfront-forwarded-proto',
  'cloudfront-is-desktop-viewer',
  'cloudfront-is-mobile-viewer',
  'cloudfront-is-smarttv-viewer',
  'cloudfront-is-tablet-viewer',
  'cloudfront-viewer-asn',
  'cloudfront-viewer-country',
]);

export async function handler(event) {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || '/';
  const qs = event.rawQueryString ? `?${event.rawQueryString}` : '';
  const target = `${ORIGIN}${path}${qs}`;

  const headers = {};
  for (const [key, value] of Object.entries(event.headers || {})) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers[key] = value;
  }

  const init = { method, headers, redirect: 'manual' };
  if (event.body && method !== 'GET' && method !== 'HEAD') {
    init.body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : event.body;
  }

  const res = await fetch(target, init);
  const buf = Buffer.from(await res.arrayBuffer());

  const outHeaders = {};
  res.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (lk === 'transfer-encoding' || lk === 'connection' || lk === 'content-encoding') {
      return;
    }
    outHeaders[key] = value;
  });

  return {
    statusCode: res.status,
    headers: outHeaders,
    body: buf.toString('base64'),
    isBase64Encoded: true,
  };
}
