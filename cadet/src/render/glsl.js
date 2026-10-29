// CADET — render/glsl.js : GLSL pieces shared by the custom materials (hashes, noise, anti-tiling).
export const NOISE = /* glsl */`
  float cdHash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  vec2 cdHash22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
  float cdNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(cdHash12(i), cdHash12(i + vec2(1.0, 0.0)), u.x), mix(cdHash12(i + vec2(0.0, 1.0)), cdHash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float cdFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * cdNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
  float cdFbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * cdNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; } return s; }
  // texture sampling without visible repetition: two lookups at rotated and offset coordinates, blended by noise
  // (the same derivatives for both, so mipmapping stays right)
  vec4 cdTexNoTile(sampler2D t, vec2 uv, float k) {
    float n = cdNoise(uv * k);
    vec2 uv2 = mat2(0.8, 0.6, -0.6, 0.8) * uv + vec2(0.37, 0.71);
    vec2 dx = dFdx(uv), dy = dFdy(uv);
    vec4 a = textureGrad(t, uv, dx, dy), b = textureGrad(t, uv2, mat2(0.8, 0.6, -0.6, 0.8) * dx, mat2(0.8, 0.6, -0.6, 0.8) * dy);
    return mix(a, b, smoothstep(0.35, 0.65, n));
  }
`;
