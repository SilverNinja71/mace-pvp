// ==========================================
// The picture pipeline for Medium and High: the scene is drawn into a floating-point (HDR) target,
// bright parts are blurred into bloom, then one final pass does the filmic tone curve, colour grade,
// vignette and sRGB. Low skips all of this and draws straight to the screen.
// A NaN or Inf pixel becomes 0 before the blur can smear it across the screen, and a black-frame
// watchdog switches to the direct path if some GPU/browser can't draw this at all.
// ==========================================

import * as THREE from 'three';

const SAFE = `vec3 safeHdr(vec3 c){
  bvec3 bad = bvec3(isnan(c.r) || isinf(c.r), isnan(c.g) || isinf(c.g), isnan(c.b) || isinf(c.b));
  return clamp(vec3(bad.x ? 0.0 : c.r, bad.y ? 0.0 : c.g, bad.z ? 0.0 : c.b), 0.0, 32.0);
}
`;
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

function quadMat(fragmentShader, uniforms) {
    return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false, fog: false, blending: THREE.NoBlending });
}

const BLOOM_LEVELS = 4;

export class PostFX {
    // opts: { samples, bloom } samples = MSAA samples of the HDR target
    constructor(renderer, opts) {
        this.r = renderer;
        this.opts = opts;
        this.enabled = true;
        this.w = 0; this.h = 0;
        const gl = renderer.getContext();
        this.supported = renderer.capabilities.isWebGL2 && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
        if (!this.supported) { this.enabled = false; return; }
        this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, samples: opts.samples, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
        this.mips = [];
        for (let i = 0; i < BLOOM_LEVELS; i++) {
            this.mips.push(new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }));
        }
        // one triangle that covers the screen
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
        this.quad = new THREE.Mesh(g, null);
        this.quad.frustumCulled = false;
        this.qScene = new THREE.Scene();
        this.qScene.add(this.quad);
        this.qCam = new THREE.Camera();

        this.mBright = quadMat(SAFE + `uniform sampler2D t; uniform float threshold; varying vec2 vUv;
            void main(){ vec3 c = safeHdr(texture2D(t, vUv).rgb);
              float l = max(max(c.r, c.g), c.b);
              float k = clamp(l - threshold + 0.4, 0.0, 0.8); k = k * k / 1.6;
              k = max(k, l - threshold) / max(l, 0.0001);
              gl_FragColor = vec4(min(c * k, vec3(12.0)), 1.0); }`, { t: { value: null }, threshold: { value: 1.25 } });
        // dual-filter blur: fast, and wide for the number of samples
        this.mDown = quadMat(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
            void main(){ vec3 c = texture2D(t, vUv).rgb * 4.0;
              c += texture2D(t, vUv - px).rgb + texture2D(t, vUv + px).rgb;
              c += texture2D(t, vUv + vec2(px.x, -px.y)).rgb + texture2D(t, vUv + vec2(-px.x, px.y)).rgb;
              gl_FragColor = vec4(c / 8.0, 1.0); }`, { t: { value: null }, px: { value: new THREE.Vector2() } });
        this.mUp = quadMat(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
            void main(){ vec3 c = texture2D(t, vUv + vec2(-px.x * 2.0, 0.0)).rgb;
              c += texture2D(t, vUv + vec2(-px.x, px.y)).rgb * 2.0;
              c += texture2D(t, vUv + vec2(0.0, px.y * 2.0)).rgb;
              c += texture2D(t, vUv + vec2(px.x, px.y)).rgb * 2.0;
              c += texture2D(t, vUv + vec2(px.x * 2.0, 0.0)).rgb;
              c += texture2D(t, vUv + vec2(px.x, -px.y)).rgb * 2.0;
              c += texture2D(t, vUv + vec2(0.0, -px.y * 2.0)).rgb;
              c += texture2D(t, vUv + vec2(-px.x, -px.y)).rgb * 2.0;
              gl_FragColor = vec4(c / 12.0, 1.0); }`, { t: { value: null }, px: { value: new THREE.Vector2() } });
        this.mUp.blending = THREE.CustomBlending;
        this.mUp.blendEquation = THREE.AddEquation; this.mUp.blendSrc = THREE.OneFactor; this.mUp.blendDst = THREE.OneFactor;
        this.mFinal = quadMat(SAFE + `uniform sampler2D t; uniform sampler2D tBloom; uniform float bloom; uniform float exposure; uniform float vignette; uniform float saturation;
            varying vec2 vUv;
            vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
            void main(){
              vec3 c = safeHdr(texture2D(t, vUv).rgb);
              c += safeHdr(texture2D(tBloom, vUv).rgb) * bloom;
              c = aces(c * exposure);
              float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
              c = clamp(mix(vec3(l), c, saturation), 0.0, 1.0);
              vec2 q = vUv - 0.5; c *= 1.0 - vignette * smoothstep(0.1, 0.55, dot(q, q));
              c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
              c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
              gl_FragColor = vec4(c, 1.0); }`,
        { t: { value: null }, tBloom: { value: null }, bloom: { value: opts.bloom ? 0.32 : 0 }, exposure: { value: 1.0 }, vignette: { value: 0.22 }, saturation: { value: 1.12 } });
        this.watch = { last: 0, bad: 0, n: 0, px: new Uint8Array(4) };
    }

    setSize(wPx, hPx) {
        if (!this.supported) return;
        wPx = Math.max(2, Math.round(wPx)); hPx = Math.max(2, Math.round(hPx));
        if (wPx === this.w && hPx === this.h) return;
        this.w = wPx; this.h = hPx;
        this.rt.setSize(wPx, hPx);
        // bloom starts at half size, capped so 4K screens don't pay more than 1080p for a blur
        const k = Math.min(0.5, 540 / hPx);
        let w = Math.max(2, Math.round(wPx * k)), h = Math.max(2, Math.round(hPx * k));
        for (const m of this.mips) { m.setSize(w, h); w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); }
    }

    // Everything drawn after this goes into the HDR target
    begin() {
        this.r.setRenderTarget(this.rt);
        this.r.clear();
    }

    pass(mat, target) {
        this.quad.material = mat;
        this.r.setRenderTarget(target);
        this.r.render(this.qScene, this.qCam);
    }

    // Blur and put the finished picture on the screen
    finish() {
        const r = this.r;
        const was = r.autoClear;
        r.autoClear = false;
        if (this.opts.bloom) {
            this.mBright.uniforms.t.value = this.rt.texture;
            this.pass(this.mBright, this.mips[0]);
            for (let i = 1; i < BLOOM_LEVELS; i++) {
                const src = this.mips[i - 1];
                this.mDown.uniforms.t.value = src.texture;
                this.mDown.uniforms.px.value.set(1 / src.width, 1 / src.height);
                this.pass(this.mDown, this.mips[i]);
            }
            for (let i = BLOOM_LEVELS - 1; i > 0; i--) {
                const src = this.mips[i];
                this.mUp.uniforms.t.value = src.texture;
                this.mUp.uniforms.px.value.set(0.5 / src.width, 0.5 / src.height);
                this.pass(this.mUp, this.mips[i - 1]);
            }
        }
        this.mFinal.uniforms.t.value = this.rt.texture;
        this.mFinal.uniforms.tBloom.value = this.mips[0].texture;
        this.pass(this.mFinal, null);
        r.autoClear = was;
    }

    // Checks the finished frame now and then. True when it has been black twice in a row:
    // the sky alone is never black, so the HDR path isn't working on this GPU.
    isBlack(now) {
        const W = this.watch;
        const gap = W.n < 6 ? 1000 : 6000;
        if (now - W.last < gap) return false;
        W.last = now; W.n++;
        const gl = this.r.getContext();
        if (gl.isContextLost()) return false;
        const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        let lit = 0;
        for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.25], [0.8, 0.25], [0.2, 0.8], [0.8, 0.8]]) {
            gl.readPixels((fx * w) | 0, (fy * h) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, W.px);
            if (W.px[0] + W.px[1] + W.px[2] > 8) lit++;
        }
        W.bad = lit ? 0 : W.bad + 1;
        return W.bad >= 2;
    }

    dispose() {
        if (!this.supported) return;
        this.rt.dispose();
        for (const m of this.mips) m.dispose();
        for (const m of [this.mBright, this.mDown, this.mUp, this.mFinal]) m.dispose();
        this.quad.geometry.dispose();
    }
}
