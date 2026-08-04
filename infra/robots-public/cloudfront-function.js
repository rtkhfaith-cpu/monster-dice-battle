function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';
  var q = uri.indexOf('?');
  if (q >= 0) uri = uri.substring(0, q);
  var host = '';
  if (request.headers && request.headers.host && request.headers.host.value) {
    host = request.headers.host.value.toLowerCase();
  }
  if (uri === '/robots.txt') {
    return {
      statusCode: 200,
      statusDescription: 'OK',
      headers: {
        'content-type': { value: 'text/plain; charset=utf-8' },
        'cache-control': { value: 'public, max-age=300' },
        'x-content-type-options': { value: 'nosniff' },
        'x-robots-tag': { value: 'noindex, nofollow' }
      },
      body: 'User-agent: *\nDisallow: /\n'
    };
  }
  if (host === 'rtkhfaith.com' || host === 'www.rtkhfaith.com') {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: {
        'content-type': { value: 'text/plain; charset=utf-8' },
        'x-content-type-options': { value: 'nosniff' },
        'x-robots-tag': { value: 'noindex, nofollow' }
      },
      body: 'Not Found\n'
    };
  }
  var auth = request.headers.authorization && request.headers.authorization.value;
  if (auth !== 'Basic __BASIC_AUTH_B64__') {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': { value: 'Basic realm="Login"' },
        'content-type': { value: 'text/plain; charset=utf-8' },
        'cache-control': { value: 'no-store' }
      },
      body: 'Unauthorized\n'
    };
  }
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}
