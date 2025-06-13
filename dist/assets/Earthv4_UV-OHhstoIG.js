import{l as M,m as _,U as E,r as e,_ as R,n as A,o as I,p as P,R as O,u as W,j as n,C as f,e as k}from"./index-NsWderJn.js";import{u as V,p as L}from"./ModelLoader-6MzQfhzt.js";function G(o,r,u,a){const c=class extends _{constructor(l={}){const t=Object.entries(o);super({uniforms:t.reduce((i,[s,m])=>{const x=E.clone({[s]:{value:m}});return{...i,...x}},{}),vertexShader:r,fragmentShader:u}),this.key="",t.forEach(([i])=>Object.defineProperty(this,i,{get:()=>this.uniforms[i].value,set:s=>this.uniforms[i].value=s})),Object.assign(this,l),a&&a(this)}};return c.key=M.generateUUID(),c}function H(o,r){const u=o+"Geometry";return e.forwardRef(({args:a,children:c,...v},l)=>{const t=e.useRef(null);return e.useImperativeHandle(l,()=>t.current),e.useLayoutEffect(()=>void(r==null?void 0:r(t.current))),e.createElement("mesh",R({ref:t},v),e.createElement(u,{attach:"geometry",args:a}),c)})}const $=H("sphere"),p="src/models/earth_final-transformed.glb",d="https://files.creative-directors.com/creative-website/creative25/glbs/earth_final-transformed.glb",B=d,J="http://files.creative-directors.com/creative-website/creative25/textures/water-texture_Small.jpeg",y=J;console.log(`Loading water texture from: ${y}`);console.log(`Loading model from: ${B}`);const K=`
  uniform float uTime;
  uniform float uNoiseFrequency;
  uniform float uNoiseAmplitude;
  uniform float uNoiseSpeed;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  // Simplex 3D noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.853734720909014 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857; // 1.0/7.0
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;

    // Use uniforms for noise properties
    float displacement = snoise(position * uNoiseFrequency + uTime * uNoiseSpeed) * uNoiseAmplitude;
    displacement += snoise(position * uNoiseFrequency * 2.5 + uTime * uNoiseSpeed * 1.5) * uNoiseAmplitude * 0.5;

    vec3 newPosition = position - normal * displacement; // Inverted displacement

    // Calculate world position and normal for reflection
    vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal); // Assuming no non-uniform scaling

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`,Q=`
  uniform sampler2D uTexture;
  uniform bool uUseTexture; // To control texture usage
  uniform vec3 uColor;
  uniform float uOpacity;

  uniform float uRoughness;
  uniform float uMetalness;

  // Caustics Uniforms
  uniform float uTime;
  uniform float uCausticsFrequency;
  uniform float uCausticsSpeed;
  uniform float uCausticsIntensity;
  uniform float uCausticsSharpness;
  uniform float uCausticsEdgeThickness;
  uniform float uCausticsDistortionFrequency; // New
  uniform float uCausticsDistortionAmplitude; // New

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  // Simplex 3D noise (copied from vertex shader)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.853734720909014 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857; // 1.0/7.0
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  // Hash function to create pseudo-random vectors
  vec2 hash( vec2 p ) {
      p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
      return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }

  // Voronoi noise function returning distance to closest (F1) and second closest (F2) points
  vec2 voronoi(vec2 x, float time) {
      vec2 p = floor(x);
      vec2 f = fract(x);
      
      float F1 = 10.0; // Initialize with a large value
      float F2 = 10.0; // Initialize with a large value

      for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j)); // Neighbor cell
              vec2 o = hash(p + g); // Random offset for cell center
              
              float cellTime = time + dot(p + g, vec2(0.13, 0.27)) * 10.0; // Vary animation per cell
              vec2 animatedOffset = o + vec2(sin(cellTime * 0.5), cos(cellTime * 0.3)) * 0.4; // Adjust movement

              vec2 r = g + animatedOffset - f;
              float d = dot(r,r); // Squared distance

              if (d < F1) {
                  F2 = F1;
                  F1 = d;
              } else if (d < F2) {
                  F2 = d;
              }
          }
      }
      return vec2(sqrt(F1), sqrt(F2)); // Return actual distances
  }


  void main() {
    vec3 albedo = uColor;
    if (uUseTexture) {
        vec4 texSample = texture2D(uTexture, vUv);
        albedo = mix(uColor, texSample.rgb, texSample.a * 0.6 + 0.4); 
    }

    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);

    vec3 F0 = vec3(0.04); 
    F0 = mix(F0, albedo, uMetalness);

    vec3 diffuseColor = albedo * (1.0 - uMetalness); 
    
    vec3 finalColor = diffuseColor;

    // Caustics UV Distortion
    float distortionTime = uTime * 0.1; // Slower animation for distortion
    vec2 distortionOffset = vec2(
      snoise(vec3(vUv * uCausticsDistortionFrequency, distortionTime)),
      snoise(vec3(vUv * uCausticsDistortionFrequency + vec2(5.2, 1.3), distortionTime)) // Offset for second noise
    ) * uCausticsDistortionAmplitude;
    vec2 distortedUv = vUv + distortionOffset;

    // Caustics Calculation using F2-F1 for edges
    vec2 voronoiDistances = voronoi(distortedUv * uCausticsFrequency, uTime * uCausticsSpeed);
    float f1 = voronoiDistances.x;
    float f2 = voronoiDistances.y;

    float edgeFactor = f2 - f1;
    
    // Gaussian-like profile for softer lines
    float normalizedEdge = edgeFactor / uCausticsEdgeThickness;
    float causticsPattern = exp(-normalizedEdge * normalizedEdge * uCausticsSharpness);
    
    float causticsEffect = causticsPattern * uCausticsIntensity;

    finalColor.rgb += causticsEffect; // Add caustics to the final color

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`,X=G({uTime:0,uColor:new f(2003199),uTexture:null,uUseTexture:!0,uOpacity:.84,uNoiseFrequency:6.4,uNoiseAmplitude:.02,uNoiseSpeed:.5,uRoughness:.57,uMetalness:.2,uCausticsFrequency:14.3,uCausticsSpeed:.16,uCausticsIntensity:.2,uCausticsSharpness:1,uCausticsEdgeThickness:.13,uCausticsDistortionFrequency:19.5,uCausticsDistortionAmplitude:.14},K,Q,o=>{o&&(o.transparent=!0,o.depthWrite=!1)});k({WaterMaterial:X});const oe=e.forwardRef((o,r)=>{const{nodes:u,materials:a}=V(p,d);e.useRef(),e.useRef();const c=e.useRef(),{gl:v,scene:l}=A(),t=e.useRef(),i=e.useRef(),s=I(y),{noiseFrequency:m,noiseAmplitude:x,noiseSpeed:h,waterColor:g,waterOpacity:C,roughness:z,metalness:w,useTextureFlag:F,causticsFrequency:S,causticsSpeed:T,causticsIntensity:b,causticsSharpness:D,causticsEdgeThickness:U,causticsDistortionFrequency:q,causticsDistortionAmplitude:j}=P("Water Shader",{noiseFrequency:{value:3,min:.1,max:20,step:.1},noiseAmplitude:{value:.02,min:.001,max:.1,step:.001},noiseSpeed:{value:.3,min:0,max:2,step:.01},waterColor:"#00b2ff",waterOpacity:{value:.88,min:0,max:1,step:.01},roughness:{value:.34,min:0,max:1,step:.01},metalness:{value:.2,min:0,max:1,step:.01},useTextureFlag:{value:!0,label:"Use Water Texture"},causticsFrequency:{value:10,min:1,max:50,step:.1,folder:"Caustics"},causticsSpeed:{value:.44,min:0,max:1,step:.01,folder:"Caustics"},causticsIntensity:{value:.25,min:0,max:2,step:.01,folder:"Caustics"},causticsSharpness:{value:.02,min:.01,max:10,step:.01,folder:"Caustics"},causticsEdgeThickness:{value:.01,min:.001,max:.5,step:.001,folder:"Caustics"},causticsDistortionFrequency:{value:25,min:.1,max:50,step:.1,folder:"Caustics"},causticsDistortionAmplitude:{value:.04,min:0,max:.5,step:.001,folder:"Caustics"}},{collapsed:!0});return s&&(s.wrapS=s.wrapT=O),W((Y,N)=>{t.current&&(t.current.uniforms.uTime.value+=N)}),n.jsxs("group",{ref:r,...o,dispose:null,children:[n.jsxs("mesh",{name:"ocean",ref:c,rotation:[-.8,.5,-.55],scale:1.82,children:[n.jsx("sphereGeometry",{args:[1.023,128*4,128*4]}),n.jsx("waterMaterial",{ref:t,attach:"material",uTexture:s,uUseTexture:F&&!!s,uColor:new f(g),uOpacity:C,uNoiseFrequency:m,uNoiseAmplitude:x,uNoiseSpeed:h,uRoughness:z,uMetalness:w,uCausticsFrequency:S,uCausticsSpeed:T,uCausticsIntensity:b,uCausticsSharpness:D,uCausticsEdgeThickness:U,uCausticsDistortionFrequency:q,uCausticsDistortionAmplitude:j})]}),n.jsx($,{ref:i,args:[1.023,128*4,128*4],position:[0,0,0],scale:1.7}),n.jsx("mesh",{name:"continent",geometry:u["optimized-verts"].geometry,material:a["Material.001"],position:[.047,.021,0],rotation:[-Math.PI/2,0,-.1],scale:[1.221,1.213,1.214]})]})});L(p,d);export{oe as default};
