// CADET — test/helpers/fake-claude.mjs : a stand-in for the Claude API (the Messages API's streaming answer), for the
// AI instructor's tests in Node and in the page (its source is put into the page as it is: no imports here).
// fakeClaude({ answer, status, network, stop, chunks, delayMs, calls }) → a fetch function. It answers any request
// with `answer` streamed in `chunks` pieces as server-sent events (or an HTTP error `status`, or a network failure),
// and records each request ({ url, headers, body }) in `calls`.
export function fakeClaude({ answer = 'いい質問です。揚力は翼の上と下の圧力の差で生まれます。\n根拠：aero.lift', status = 200, network = false, stop = 'end_turn', chunks = 4, delayMs = 0, calls = [], model = 'claude-opus-5-5', errorType = 'authentication_error' } = {}) {
  const enc = new TextEncoder();
  const ev = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
  return async function fetch(url, init = {}) {
    const h = {};
    const src = init.headers || {};
    if (typeof src.forEach === 'function') src.forEach((v, k) => { h[String(k).toLowerCase()] = v; });
    else for (const [k, v] of Object.entries(src)) h[String(k).toLowerCase()] = v;
    let body = null; try { body = JSON.parse(init.body); } catch (e) { body = init.body; }
    calls.push({ url: String(url), method: init.method || 'GET', headers: h, body });
    if (network) throw new TypeError('Failed to fetch');
    if (status !== 200) {
      return new Response(JSON.stringify({ type: 'error', error: { type: errorType, message: 'stand-in error' } }), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_fake' } });
    }
    const n = Math.max(1, chunks), size = Math.ceil(answer.length / n), parts = [];
    for (let i = 0; i < answer.length; i += size) parts.push(answer.slice(i, i + size));
    const events = [ev('message_start', { type: 'message_start', message: { id: 'msg_fake', type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 1 } } }),
      ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }),
      ...parts.map(t => ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })),
      ev('content_block_stop', { type: 'content_block_stop', index: 0 }),
      ev('message_delta', { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 40 } }),
      ev('message_stop', { type: 'message_stop' })];
    let i = 0;
    const stream = new ReadableStream({
      async pull(c) {
        if (i >= events.length) { c.close(); return; }
        if (delayMs) await new Promise(r => setTimeout(r, delayMs));
        c.enqueue(enc.encode(events[i++]));
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream', 'request-id': 'req_fake' } });
  };
}
