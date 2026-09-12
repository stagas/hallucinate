import { landscapeBounds, outsideRooftop, outsideRooftopLanding, outsideRooftopStairs, roomBounds, tent,
  upstairsRoofHeight, upstairsRoofThickness, upstairsWallHeight } from './scene-data.ts'

import { characterFloor } from './character-data.ts'
import { imageTextureHaze, tShirtHaze } from './geometry.ts'

const tentX = glslFloat(tent.x)
const tentZ = glslFloat(tent.z)
const tentRadius = glslFloat(tent.radius)
const tentVisibleRadiusSq = glslFloat((tent.radius + 0.15) ** 2)
const tentInteriorRadiusSq = glslFloat((tent.radius - 0.86) ** 2)
const tentWallTop = characterFloor + tent.wallHeight
const tentTop = characterFloor + tent.height
const tentWallTopGlsl = glslFloat(tentWallTop)
const tentRoofHeightGlsl = glslFloat(tentTop - tentWallTop)
const tentRoofShellBottom = glslFloat(tentWallTop - 0.15)
const tentRoofShellTop = glslFloat(tentTop + 0.15)
const rooftopLeft = glslFloat(outsideRooftop.x - outsideRooftop.width / 2 - 0.05)
const rooftopRight = glslFloat(outsideRooftop.x + outsideRooftop.width / 2 + 0.05)
const rooftopBack = glslFloat(outsideRooftop.z - outsideRooftop.depth / 2 - 0.05)
const rooftopFront = glslFloat(outsideRooftop.z + outsideRooftop.depth / 2 + 0.05)
const rooftopBottom = glslFloat(characterFloor + outsideRooftop.height - 0.36)
const stairLeft = glslFloat(outsideRooftopStairs.x - outsideRooftopStairs.width / 2 - 0.16)
const stairRight = glslFloat(outsideRooftopStairs.x + outsideRooftopStairs.width / 2 + 0.16)
const stairBack = glslFloat(outsideRooftopStairs.z - outsideRooftopStairs.depth / 2 - 0.05)
const stairFront = glslFloat(outsideRooftopStairs.z + outsideRooftopStairs.depth / 2 + 0.05)
const landingLeft = glslFloat(outsideRooftopLanding.x - outsideRooftopLanding.width / 2 - 0.05)
const landingRight = glslFloat(outsideRooftopLanding.x + outsideRooftopLanding.width / 2 + 0.05)
const landingBack = glslFloat(outsideRooftopLanding.z - outsideRooftopLanding.depth / 2 - 0.05)
const landingFront = glslFloat(outsideRooftopLanding.z + outsideRooftopLanding.depth / 2 + 0.05)
const elevatedOutdoorBottom = glslFloat(characterFloor - 0.12)
const upstairsLeft = glslFloat(roomBounds.left - 0.18)
const upstairsRight = glslFloat(roomBounds.right + 0.18)
const upstairsBack = glslFloat(roomBounds.back - 0.18)
const upstairsFront = glslFloat(roomBounds.front + 0.18)
const upstairsBottom = glslFloat(characterFloor + outsideRooftop.height - 0.02)
const upstairsTop = glslFloat(characterFloor + outsideRooftop.height + upstairsWallHeight + 0.14)
const upstairsRoofBottom = glslFloat(upstairsRoofHeight - upstairsRoofThickness - 0.01)
const treeShadowLeft = glslFloat(landscapeBounds.left)
const treeShadowFront = glslFloat(landscapeBounds.front)
const treeShadowWidth = glslFloat(landscapeBounds.right - landscapeBounds.left)
const treeShadowDepth = glslFloat(landscapeBounds.front - landscapeBounds.back)
const imageTextureThreshold = glslFloat(imageTextureHaze - 0.5)
const tShirtHazeGlsl = glslFloat(tShirtHaze)

function glslFloat(value: number) {
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.0')
}

export const vertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 color;
layout(location = 2) in float glow;
layout(location = 3) in float strobe;
layout(location = 4) in vec2 pattern;
layout(location = 5) in float haze;

uniform mat4 viewProjection;

out vec3 shade;
out float light;
out vec2 patternUv;
out float hazeAmount;
out float flashGate;
out vec3 worldPosition;
flat out float strobeId;

void main() {
  gl_Position = viewProjection * vec4(position, 1.0);
  shade = color;
  light = glow;
  patternUv = pattern;
  hazeAmount = haze;
  flashGate = step(0.5, haze);
  worldPosition = position;
  strobeId = strobe;
}
`

export const characterBoxVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 boxPosition;
layout(location = 1) in float boxShade;
layout(location = 2) in vec3 instanceA;
layout(location = 3) in vec3 instanceB;
layout(location = 4) in vec3 instanceSide;
layout(location = 5) in vec3 instanceUp;
layout(location = 6) in vec3 instanceColor;
layout(location = 7) in float instanceGlow;
layout(location = 8) in float instanceStrobe;

uniform mat4 viewProjection;

out vec3 shade;
out float light;
out vec2 patternUv;
out float hazeAmount;
out vec3 worldPosition;
flat out float strobeId;

void main() {
  vec3 along = mix(instanceA, instanceB, boxPosition.z);
  vec3 position = along + instanceSide * boxPosition.x + instanceUp * boxPosition.y;
  gl_Position = viewProjection * vec4(position, 1.0);
  shade = instanceColor * boxShade;
  light = instanceGlow;
  patternUv = vec2(0.0);
  hazeAmount = 0.0;
  worldPosition = position;
  strobeId = instanceStrobe;
}
`

export const videoPreviewVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

uniform mat4 viewProjection;

out vec2 imageUv;

void main() {
  gl_Position = viewProjection * vec4(position, 1.0);
  imageUv = uv;
}
`

export const videoPreviewFragment = `#version 300 es
precision highp float;

uniform sampler2D image;

in vec2 imageUv;

layout(location = 0) out vec4 pixel;
layout(location = 1) out vec4 bloomPixel;

void main() {
  vec3 color = texture(image, imageUv).rgb;

  pixel = vec4(color, 1.0);
  bloomPixel = vec4(0.0, 0.0, 0.0, 1.0);
}
`

export const characterBoxFragment = `#version 300 es
precision highp float;

uniform int renderZone;
uniform int bloomPass;

in vec3 shade;
in float light;
in vec2 patternUv;
in float hazeAmount;
in vec3 worldPosition;
flat in float strobeId;

layout(location = 0) out vec4 pixel;
layout(location = 1) out vec4 bloomPixel;

bool sceneVisible() {
  bool outsidePoint = worldPosition.x < -7.05 || worldPosition.x > 7.05 || worldPosition.z < -24.05 || worldPosition.z > 4.05;
  bool rooftopPoint = worldPosition.x > ${rooftopLeft} && worldPosition.x < ${rooftopRight}
    && worldPosition.z > ${rooftopBack} && worldPosition.z < ${rooftopFront} && worldPosition.y > ${rooftopBottom};
  bool stairPoint = worldPosition.x > ${stairLeft} && worldPosition.x < ${stairRight}
    && worldPosition.z > ${stairBack} && worldPosition.z < ${stairFront} && worldPosition.y > ${elevatedOutdoorBottom};
  bool landingPoint = worldPosition.x > ${landingLeft} && worldPosition.x < ${landingRight}
    && worldPosition.z > ${landingBack} && worldPosition.z < ${landingFront} && worldPosition.y > ${rooftopBottom};
  bool elevatedOutdoorPoint = rooftopPoint || stairPoint || landingPoint;
  bool upstairsPoint = worldPosition.x > ${upstairsLeft} && worldPosition.x < ${upstairsRight}
    && worldPosition.z > ${upstairsBack} && worldPosition.z < ${upstairsFront}
    && worldPosition.y > ${upstairsBottom} && worldPosition.y < ${upstairsTop};
  bool upstairsRoofPoint = rooftopPoint && worldPosition.y > ${upstairsRoofBottom};
  vec2 tentOffset = worldPosition.xz - vec2(${tentX}, ${tentZ});
  bool tentPoint = dot(tentOffset, tentOffset) < ${tentVisibleRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentInterior = dot(tentOffset, tentOffset) < ${tentInteriorRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool shell = (
    abs(worldPosition.z - 4.0) < 0.18
    || abs(worldPosition.z + 24.0) < 0.18
    || abs(worldPosition.x - 7.0) < 0.18
    || abs(worldPosition.x + 7.0) < 0.18
  ) && worldPosition.y > -2.15 && worldPosition.y < 5.15;
  bool door = abs(worldPosition.z - 4.0) < 0.22
    && worldPosition.x > -5.75 && worldPosition.x < -3.75
    && worldPosition.y > -2.15 && worldPosition.y < 0.75;

  if (renderZone == 0) {
    return (!outsidePoint && !elevatedOutdoorPoint) || door;
  }
  if (renderZone == 2) {
    return tentPoint;
  }
  if (renderZone == 3) {
    return upstairsPoint;
  }
  if (renderZone == 4) {
    return true;
  }

  return (outsidePoint && !tentInterior) || (elevatedOutdoorPoint && (!upstairsPoint || upstairsRoofPoint))
    || (shell && light < 0.12) || door;
}

void main() {
  if (!sceneVisible()) {
    discard;
  }

  float alpha = strobeId < 0.0 ? clamp(-strobeId, 0.0, 1.0) : 1.0;

  if (bloomPass == 1) {
    if (light < 0.15) {
      discard;
    }

    pixel = vec4(shade * light * 2.2 * alpha, alpha);
    bloomPixel = vec4(0.0);
    return;
  }

  pixel = vec4(shade + shade * light * 2.2, alpha);
  bloomPixel = light < 0.15
    ? vec4(0.0, 0.0, 0.0, alpha)
    : max(vec4(shade * light * 2.2 * alpha, alpha), vec4(0.0, 0.0, 0.0, alpha));
}
`

export const fragment = `#version 300 es
precision highp float;

uniform float time;
uniform float outsideNight;
uniform vec3 cameraEye;
uniform int renderZone;
uniform int bloomPass;
uniform int characterPass;
uniform int bloomWrite;
uniform int doorCoverVisible;
uniform sampler2D treeShadowMap;
uniform sampler2D graffitiMap;
uniform sampler2D objectTextureMap;

in vec3 shade;
in float light;
in vec2 patternUv;
in float hazeAmount;
in vec3 worldPosition;
flat in float strobeId;

layout(location = 0) out vec4 pixel;
layout(location = 1) out vec4 bloomPixel;

bool sceneVisible() {
  if (strobeId > 9000.0 && doorCoverVisible == 0) {
    return false;
  }
  if (renderZone == 0 && hazeAmount > 1.5) {
    return false;
  }

  bool outsidePoint = worldPosition.x < -7.05 || worldPosition.x > 7.05 || worldPosition.z < -24.05 || worldPosition.z > 4.05;
  bool rooftopPoint = worldPosition.x > ${rooftopLeft} && worldPosition.x < ${rooftopRight}
    && worldPosition.z > ${rooftopBack} && worldPosition.z < ${rooftopFront} && worldPosition.y > ${rooftopBottom};
  bool stairPoint = worldPosition.x > ${stairLeft} && worldPosition.x < ${stairRight}
    && worldPosition.z > ${stairBack} && worldPosition.z < ${stairFront} && worldPosition.y > ${elevatedOutdoorBottom};
  bool landingPoint = worldPosition.x > ${landingLeft} && worldPosition.x < ${landingRight}
    && worldPosition.z > ${landingBack} && worldPosition.z < ${landingFront} && worldPosition.y > ${rooftopBottom};
  bool elevatedOutdoorPoint = rooftopPoint || stairPoint || landingPoint;
  bool upstairsPoint = worldPosition.x > ${upstairsLeft} && worldPosition.x < ${upstairsRight}
    && worldPosition.z > ${upstairsBack} && worldPosition.z < ${upstairsFront}
    && worldPosition.y > ${upstairsBottom} && worldPosition.y < ${upstairsTop};
  bool upstairsRoofPoint = rooftopPoint && worldPosition.y > ${upstairsRoofBottom};
  vec2 tentOffset = worldPosition.xz - vec2(${tentX}, ${tentZ});
  float tentDistance = length(tentOffset);
  float tentRoofT = clamp((worldPosition.y - ${tentWallTopGlsl}) / ${tentRoofHeightGlsl}, 0.0, 1.0);
  float tentRoofRadius = mix(${tentRadius}, 0.0, tentRoofT);
  bool tentPoint = dot(tentOffset, tentOffset) < ${tentVisibleRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentInterior = dot(tentOffset, tentOffset) < ${tentInteriorRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentRoofShell = worldPosition.y > ${tentRoofShellBottom} && worldPosition.y < ${tentRoofShellTop} && abs(tentDistance - tentRoofRadius) < 0.24;
  bool shell = (
    abs(worldPosition.z - 4.0) < 0.18
    || abs(worldPosition.z + 24.0) < 0.18
    || abs(worldPosition.x - 7.0) < 0.18
    || abs(worldPosition.x + 7.0) < 0.18
  ) && worldPosition.y > -2.15 && worldPosition.y < 5.15;
  bool door = abs(worldPosition.z - 4.0) < 0.22
    && worldPosition.x > -5.75 && worldPosition.x < -3.75
    && worldPosition.y > -2.15 && worldPosition.y < 0.75;
  bool graffiti = hazeAmount > 5.5;
  bool doorCover = strobeId > 9000.0;
  bool exteriorDoorCover = strobeId > 9001.5;

  if (renderZone == 0) {
    return (!outsidePoint && !elevatedOutdoorPoint) || door;
  }
  if (renderZone == 2) {
    return tentPoint;
  }
  if (renderZone == 3) {
    return upstairsPoint && !exteriorDoorCover;
  }
  if (renderZone == 4) {
    return true;
  }

  return (outsidePoint && (!tentInterior || tentRoofShell || graffiti))
    || (elevatedOutdoorPoint && (!upstairsPoint || upstairsRoofPoint))
    || (shell && light < 0.12) || door || doorCover;
}

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
}

float outsideSurfaceMask() {
  bool outsidePoint = worldPosition.x < -7.05 || worldPosition.x > 7.05 || worldPosition.z < -24.05 || worldPosition.z > 4.05;
  bool rooftopPoint = worldPosition.x > ${rooftopLeft} && worldPosition.x < ${rooftopRight}
    && worldPosition.z > ${rooftopBack} && worldPosition.z < ${rooftopFront} && worldPosition.y > ${rooftopBottom};
  bool stairPoint = worldPosition.x > ${stairLeft} && worldPosition.x < ${stairRight}
    && worldPosition.z > ${stairBack} && worldPosition.z < ${stairFront} && worldPosition.y > ${elevatedOutdoorBottom};
  bool landingPoint = worldPosition.x > ${landingLeft} && worldPosition.x < ${landingRight}
    && worldPosition.z > ${landingBack} && worldPosition.z < ${landingFront} && worldPosition.y > ${rooftopBottom};
  bool elevatedOutdoorPoint = rooftopPoint || stairPoint || landingPoint;
  bool upstairsPoint = worldPosition.x > ${upstairsLeft} && worldPosition.x < ${upstairsRight}
    && worldPosition.z > ${upstairsBack} && worldPosition.z < ${upstairsFront}
    && worldPosition.y > ${upstairsBottom} && worldPosition.y < ${upstairsTop};
  bool upstairsRoofPoint = rooftopPoint && worldPosition.y > ${upstairsRoofBottom};
  vec2 tentOffset = worldPosition.xz - vec2(${tentX}, ${tentZ});
  float tentDistance = length(tentOffset);
  float tentRoofT = clamp((worldPosition.y - ${tentWallTopGlsl}) / ${tentRoofHeightGlsl}, 0.0, 1.0);
  float tentRoofRadius = mix(${tentRadius}, 0.0, tentRoofT);
  bool tentInterior = dot(tentOffset, tentOffset) < ${tentInteriorRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentRoofShell = worldPosition.y > ${tentRoofShellBottom} && worldPosition.y < ${tentRoofShellTop} && abs(tentDistance - tentRoofRadius) < 0.24;

  return (outsidePoint && (!tentInterior || tentRoofShell))
    || (elevatedOutdoorPoint && (!upstairsPoint || upstairsRoofPoint)) ? 1.0 : 0.0;
}

vec3 outsideModeColor(vec3 color) {
  if (hazeAmount == ${tShirtHazeGlsl}) {
    return color;
  }

  if (characterPass == 1) {
    vec3 nightColor = color * vec3(0.9) + vec3(0.04, 0.045, 0.055);

    return mix(color, nightColor, outsideSurfaceMask() * outsideNight);
  }

  vec3 nightColor = color * vec3(0.62) + vec3(0.018, 0.022, 0.032);

  return mix(color, nightColor, outsideSurfaceMask() * outsideNight);
}

bool nightUplightSurface() {
  return strobeId < -1.5;
}

vec3 nightUplightColor() {
  return vec3(0.0, 0.024, 0.32) * clamp(light, 0.0, 1.8) * outsideNight;
}

vec3 surfaceEmission(float strobe) {
  if (nightUplightSurface()) {
    return nightUplightColor();
  }

  return shade * light * 2.2 * strobe;
}

vec2 grassBladeLayer(vec2 point, float scale, float angle, float width) {
  point += vec2(noise(point * 0.37 + 12.0), noise(point * 0.41 - 9.0)) * 0.9;
  float s = sin(angle);
  float c = cos(angle);
  vec2 bladePoint = vec2(point.x * c - point.y * s, point.x * s + point.y * c) * scale;
  vec2 cell = floor(bladePoint);
  vec2 local = fract(bladePoint);
  float jitter = hash(cell + vec2(3.0, 19.0));
  float sway = (hash(cell + vec2(27.0, 5.0)) - 0.5) * 0.24;
  local.x = fract(local.x + sway * local.y + (jitter - 0.5) * 0.18);
  local.y = fract(local.y + (hash(cell + vec2(41.0, 73.0)) - 0.5) * 0.22);
  float bend = (hash(cell) - 0.5) * 0.48;
  float center = 0.5 + bend * local.y;
  float bladeWidth = width * mix(0.55, 1.45, hash(cell + vec2(11.0, 29.0)));
  float bladeLength = mix(0.48, 1.0, hash(cell + vec2(83.0, 7.0)));
  float edge = fwidth(local.x) * 2.1;
  float line = 1.0 - smoothstep(bladeWidth, bladeWidth + edge, abs(local.x - center));
  float sideShadow = 1.0 - smoothstep(bladeWidth * 1.6, bladeWidth * 1.6 + edge,
    abs(local.x - center - bladeWidth * mix(2.0, 4.0, jitter)));
  float rootShadow = 1.0 - smoothstep(0.1, 0.34, local.y);
  float lengthMask = smoothstep(0.04, 0.22, local.y) * (1.0 - smoothstep(bladeLength * 0.78, bladeLength, local.y));
  float gate = step(0.18, hash(cell + vec2(17.0, 41.0)));

  return vec2(line * lengthMask, (sideShadow * lengthMask + rootShadow * line * 0.55) * gate) * gate;
}

vec2 treeShadowUv(vec3 point) {
  return vec2(
    (point.x - ${treeShadowLeft}) / ${treeShadowWidth},
    (${treeShadowFront} - point.z) / ${treeShadowDepth}
  );
}

vec3 grassColor() {
  vec2 field = worldPosition.xz * 0.11;
  vec2 shadowUv = treeShadowUv(worldPosition);
  float cameraDistance = length(worldPosition.xz - cameraEye.xz);
  float detail = noise(worldPosition.xz * 2.6) * 0.10 + noise(worldPosition.xz * 0.55) * 0.16;
  float band = sin(field.x * 2.7 + noise(field * 2.0) * 2.4) * 0.5 + 0.5;
  float hill = smoothstep(0.22, 0.92, noise(field + vec2(4.0, 9.0)) * 0.7 + band * 0.3);
  float far = smoothstep(10.0, 55.0, cameraDistance);
  float horizon = smoothstep(34.0, 60.0, cameraDistance);
  float shadow = texture(treeShadowMap, shadowUv).a;
  float bladeFade = 1.0 - smoothstep(8.0, 24.0, cameraDistance);
  vec2 warpedGround = worldPosition.xz + vec2(noise(worldPosition.xz * 0.08), noise(worldPosition.zx * 0.09)) * 4.0;
  vec2 bladeShape = grassBladeLayer(warpedGround, 3.4, 0.18, 0.06)
    + grassBladeLayer(warpedGround + vec2(8.7, 3.1), 4.9, -0.47, 0.048)
    + grassBladeLayer(warpedGround + vec2(2.3, 11.4), 6.8, 0.74, 0.038)
    + grassBladeLayer(warpedGround + vec2(14.1, -5.5), 8.3, -1.02, 0.03);
  float blades = bladeShape.x;
  float bladeShadow = bladeShape.y;
  blades = clamp(blades, 0.0, 1.0) * bladeFade;
  bladeShadow = clamp(bladeShadow, 0.0, 1.0) * bladeFade;
  vec3 closeGrass = shade * (0.82 + detail);
  vec3 distantAfternoon = mix(vec3(0.035, 0.20, 0.055), vec3(0.08, 0.34, 0.095), hill);
  vec3 distantNight = mix(vec3(0.008, 0.055, 0.025), vec3(0.025, 0.13, 0.055), hill);
  vec3 hillAfternoon = mix(vec3(0.018, 0.12, 0.035), vec3(0.065, 0.25, 0.06), hill);
  vec3 hillNight = mix(vec3(0.004, 0.035, 0.018), vec3(0.018, 0.095, 0.04), hill);
  vec3 distantGrass = mix(distantAfternoon, distantNight, outsideNight);
  vec3 hillGrass = mix(hillAfternoon, hillNight, outsideNight);
  vec3 grass = mix(mix(closeGrass, distantGrass, far), hillGrass, horizon * 0.55);
  grass *= 1.0 - bladeShadow * 0.46;
  grass = mix(grass, grass * vec3(0.5, 0.76, 0.42), blades * 0.34);
  grass += vec3(0.03, 0.16, 0.035) * blades;

  float modeLight = mix(1.0, 0.45, outsideNight);
  float shadowLight = mix(0.25, 1.0, outsideNight);

  return grass * modeLight * mix(1.0, shadowLight, shadow);
}

void main() {
  if (!sceneVisible()) {
    discard;
  }

  bool waterSurface = hazeAmount > 2.5 && hazeAmount < 3.5;
  float white = step(0.3, min(shade.r, min(shade.g, shade.b)));
  float trailAlpha = strobeId < 0.0 ? clamp(-strobeId, 0.0, 1.0) : 1.0;
  float strobe = 1.0;
  vec4 glowPixel = vec4(0.0);

  if (strobeId >= 0.0 && white > 0.0) {
    float random = fract(sin(strobeId * 17.13 + time * 9.27) * 43758.5453);

    strobe = step(0.82, random);
  }

  if (nightUplightSurface()) {
    glowPixel = vec4(nightUplightColor() * 0.5, trailAlpha);
  }
  else if (light >= 0.15) {
    glowPixel = vec4(shade * light * 2.2 * strobe * trailAlpha, trailAlpha);
  }

  if (bloomPass == 1) {
    if (glowPixel.a == 0.0) {
      discard;
    }

    pixel = glowPixel;
    bloomPixel = vec4(0.0);
    return;
  }

  if (hazeAmount > ${imageTextureThreshold}) {
    vec3 image = texture(objectTextureMap, patternUv).rgb;
    vec3 base = outsideModeColor(image * shade);

    pixel = vec4(base + surfaceEmission(strobe), trailAlpha);
    bloomPixel = bloomWrite == 1 ? max(glowPixel, vec4(0.0, 0.0, 0.0, trailAlpha)) : vec4(0.0, 0.0, 0.0, trailAlpha);
    return;
  }

  if (hazeAmount > 5.5) {
    vec4 paint = texture(graffitiMap, patternUv);

    if (hazeAmount > 6.5) {
      vec3 base = shade;

      pixel = vec4(mix(base, paint.rgb, paint.a), 1.0);
      bloomPixel = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    if (paint.a < 0.04) {
      discard;
    }

    pixel = paint;
    bloomPixel = vec4(0.0);
    return;
  }

  if (hazeAmount > 4.5) {
    float receiverShadow = texture(treeShadowMap, patternUv).a;
    float shadowAlpha = receiverShadow * 0.42 * (1.0 - outsideNight);

    if (shadowAlpha < 0.01) {
      discard;
    }

    pixel = vec4(vec3(0.002, 0.018, 0.004), shadowAlpha);
    bloomPixel = vec4(0.0);
    return;
  }

  vec3 base = waterSurface ? outsideModeColor(shade) : hazeAmount > 1.5 ? grassColor() : outsideModeColor(shade);
  vec3 emissive = surfaceEmission(strobe);
  float alpha = (waterSurface ? 0.46 : hazeAmount > 3.5 ? 0.34 : 1.0) * trailAlpha;

  pixel = vec4(base + emissive, alpha);
  bloomPixel = bloomWrite == 1 ? max(glowPixel, vec4(0.0, 0.0, 0.0, alpha)) : vec4(0.0, 0.0, 0.0, alpha);
}
`

export const roomDepthFragment = `#version 300 es
precision highp float;

uniform int renderZone;
uniform int doorCoverVisible;

in float light;
in float hazeAmount;
in vec3 worldPosition;
flat in float strobeId;

out vec4 pixel;

bool sceneVisible() {
  if (strobeId > 9000.0 && doorCoverVisible == 0) {
    return false;
  }
  if (renderZone == 0 && hazeAmount > 1.5) {
    return false;
  }

  bool outsidePoint = worldPosition.x < -7.05 || worldPosition.x > 7.05 || worldPosition.z < -24.05 || worldPosition.z > 4.05;
  bool rooftopPoint = worldPosition.x > ${rooftopLeft} && worldPosition.x < ${rooftopRight}
    && worldPosition.z > ${rooftopBack} && worldPosition.z < ${rooftopFront} && worldPosition.y > ${rooftopBottom};
  bool stairPoint = worldPosition.x > ${stairLeft} && worldPosition.x < ${stairRight}
    && worldPosition.z > ${stairBack} && worldPosition.z < ${stairFront} && worldPosition.y > ${elevatedOutdoorBottom};
  bool landingPoint = worldPosition.x > ${landingLeft} && worldPosition.x < ${landingRight}
    && worldPosition.z > ${landingBack} && worldPosition.z < ${landingFront} && worldPosition.y > ${rooftopBottom};
  bool elevatedOutdoorPoint = rooftopPoint || stairPoint || landingPoint;
  bool upstairsPoint = worldPosition.x > ${upstairsLeft} && worldPosition.x < ${upstairsRight}
    && worldPosition.z > ${upstairsBack} && worldPosition.z < ${upstairsFront}
    && worldPosition.y > ${upstairsBottom} && worldPosition.y < ${upstairsTop};
  bool upstairsRoofPoint = rooftopPoint && worldPosition.y > ${upstairsRoofBottom};
  vec2 tentOffset = worldPosition.xz - vec2(${tentX}, ${tentZ});
  float tentDistance = length(tentOffset);
  float tentRoofT = clamp((worldPosition.y - ${tentWallTopGlsl}) / ${tentRoofHeightGlsl}, 0.0, 1.0);
  float tentRoofRadius = mix(${tentRadius}, 0.0, tentRoofT);
  bool tentPoint = dot(tentOffset, tentOffset) < ${tentVisibleRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentInterior = dot(tentOffset, tentOffset) < ${tentInteriorRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentRoofShell = worldPosition.y > ${tentRoofShellBottom} && worldPosition.y < ${tentRoofShellTop} && abs(tentDistance - tentRoofRadius) < 0.24;
  bool shell = (
    abs(worldPosition.z - 4.0) < 0.18
    || abs(worldPosition.z + 24.0) < 0.18
    || abs(worldPosition.x - 7.0) < 0.18
    || abs(worldPosition.x + 7.0) < 0.18
  ) && worldPosition.y > -2.15 && worldPosition.y < 5.15;
  bool door = abs(worldPosition.z - 4.0) < 0.22
    && worldPosition.x > -5.75 && worldPosition.x < -3.75
    && worldPosition.y > -2.15 && worldPosition.y < 0.75;
  bool graffiti = hazeAmount > 5.5;
  bool doorCover = strobeId > 9000.0;
  bool exteriorDoorCover = strobeId > 9001.5;

  if (renderZone == 0) {
    return (!outsidePoint && !elevatedOutdoorPoint) || door;
  }
  if (renderZone == 2) {
    return tentPoint;
  }
  if (renderZone == 3) {
    return upstairsPoint && !exteriorDoorCover;
  }
  if (renderZone == 4) {
    return true;
  }

  return (outsidePoint && (!tentInterior || tentRoofShell || graffiti))
    || (elevatedOutdoorPoint && (!upstairsPoint || upstairsRoofPoint))
    || (shell && light < 0.12) || door || doorCover;
}

void main() {
  if (!sceneVisible()) {
    discard;
  }

  pixel = vec4(0.0);
}
`

export const lightFragment = `#version 300 es
precision highp float;

uniform float time;
uniform sampler2D smokeMap;
uniform int renderZone;

in vec3 shade;
in float light;
in vec2 patternUv;
in float hazeAmount;
in float flashGate;
in vec3 worldPosition;
flat in float strobeId;

layout(location = 0) out vec4 pixel;
layout(location = 1) out vec4 bloomPixel;

bool sceneVisible() {
  bool outsidePoint = worldPosition.x < -7.05 || worldPosition.x > 7.05 || worldPosition.z < -24.05 || worldPosition.z > 4.05;
  bool rooftopPoint = worldPosition.x > ${rooftopLeft} && worldPosition.x < ${rooftopRight}
    && worldPosition.z > ${rooftopBack} && worldPosition.z < ${rooftopFront} && worldPosition.y > ${rooftopBottom};
  bool stairPoint = worldPosition.x > ${stairLeft} && worldPosition.x < ${stairRight}
    && worldPosition.z > ${stairBack} && worldPosition.z < ${stairFront} && worldPosition.y > ${elevatedOutdoorBottom};
  bool landingPoint = worldPosition.x > ${landingLeft} && worldPosition.x < ${landingRight}
    && worldPosition.z > ${landingBack} && worldPosition.z < ${landingFront} && worldPosition.y > ${rooftopBottom};
  bool elevatedOutdoorPoint = rooftopPoint || stairPoint || landingPoint;
  bool upstairsPoint = worldPosition.x > ${upstairsLeft} && worldPosition.x < ${upstairsRight}
    && worldPosition.z > ${upstairsBack} && worldPosition.z < ${upstairsFront}
    && worldPosition.y > ${upstairsBottom} && worldPosition.y < ${upstairsTop};
  bool upstairsRoofPoint = rooftopPoint && worldPosition.y > ${upstairsRoofBottom};
  vec2 tentOffset = worldPosition.xz - vec2(${tentX}, ${tentZ});
  bool tentPoint = dot(tentOffset, tentOffset) < ${tentVisibleRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentInterior = dot(tentOffset, tentOffset) < ${tentInteriorRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool door = abs(worldPosition.z - 4.0) < 0.22
    && worldPosition.x > -5.75 && worldPosition.x < -3.75
    && worldPosition.y > -2.15 && worldPosition.y < 0.75;

  return renderZone == 4 ? true
    : renderZone == 3 ? upstairsPoint
    : renderZone == 0 ? ((!outsidePoint && !elevatedOutdoorPoint) || door)
    : renderZone == 2 ? tentPoint
    : ((outsidePoint && !tentInterior) || (elevatedOutdoorPoint && (!upstairsPoint || upstairsRoofPoint)));
}

float smokeDensity(vec2 uv) {
  vec2 drift = vec2(strobeId * 0.173, time * 0.0018);
  float cloud = texture(smokeMap, uv * vec2(1.0, 1.75) + drift).r;
  float detail = texture(smokeMap, uv * vec2(2.7, 4.8) + drift * 0.37 + vec2(0.31, 0.17)).r;
  float smoke = smoothstep(0.28, 0.74, cloud * 0.78 + detail * 0.22);
  float body = smoothstep(0.03, 0.18, uv.y) * (1.0 - smoothstep(0.94, 1.0, uv.y));

  return (0.26 + smoke * 0.9) * body;
}

void main() {
  if (!sceneVisible()) {
    discard;
  }

  float white = step(0.3, min(shade.r, min(shade.g, shade.b)));
  float red = step(0.45, shade.r) * (1.0 - step(0.14, shade.g)) * (1.0 - step(0.1, shade.b));
  float random = fract(sin(strobeId * 17.13 + time * 9.27) * 43758.5453);
  float redRandom = fract(sin(strobeId * 31.7 + floor(time / 90.0) * 13.11) * 43758.5453);
  float redControlled = red * step(0.5, strobeId);
  float redGate = step(0.28, redRandom);
  float beam = flashGate;
  float beamGate = step(0.56, random);
  float strobe = mix(1.0, step(0.82, random), white) * mix(1.0, redGate, redControlled) * mix(1.0, beamGate, beam);
  float density = 1.0;

  if (hazeAmount > 0.5) {
    density = smokeDensity(patternUv);
  }

  if (strobeId > 700.0) {
    float pulse = 0.66 + sin(time * 7.3) * 0.22 + sin(time * 13.7 + patternUv.x * 4.0) * 0.14;

    if (patternUv.y > pulse) {
      discard;
    }
  }

  vec3 emission = shade * light * 2.2 * strobe * density;
  float alpha = clamp(light * strobe * density, 0.0, 1.0);

  pixel = vec4(shade + emission, alpha);
  bloomPixel = vec4(emission * 0.72, alpha);
}
`

export const hairVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 localPosition;
layout(location = 1) in vec3 instanceCenter;
layout(location = 2) in vec3 instanceSide;
layout(location = 3) in vec3 instanceUp;
layout(location = 4) in vec3 instanceForward;
layout(location = 5) in vec3 instanceColor;

uniform mat4 viewProjection;

out vec3 shade;
out vec3 worldPosition;

void main() {
  vec3 position = instanceCenter
    + instanceSide * localPosition.x
    + instanceUp * localPosition.y
    + instanceForward * localPosition.z;
  gl_Position = viewProjection * vec4(position, 1.0);
  shade = instanceColor;
  worldPosition = position;
}
`

export const hairFragment = `#version 300 es
precision highp float;

uniform int renderZone;

in vec3 shade;
in vec3 worldPosition;

layout(location = 0) out vec4 pixel;
layout(location = 1) out vec4 bloomPixel;

bool sceneVisible() {
  bool outsidePoint = worldPosition.x < -7.05 || worldPosition.x > 7.05 || worldPosition.z < -24.05 || worldPosition.z > 4.05;
  bool rooftopPoint = worldPosition.x > ${rooftopLeft} && worldPosition.x < ${rooftopRight}
    && worldPosition.z > ${rooftopBack} && worldPosition.z < ${rooftopFront} && worldPosition.y > ${rooftopBottom};
  bool stairPoint = worldPosition.x > ${stairLeft} && worldPosition.x < ${stairRight}
    && worldPosition.z > ${stairBack} && worldPosition.z < ${stairFront} && worldPosition.y > ${elevatedOutdoorBottom};
  bool landingPoint = worldPosition.x > ${landingLeft} && worldPosition.x < ${landingRight}
    && worldPosition.z > ${landingBack} && worldPosition.z < ${landingFront} && worldPosition.y > ${rooftopBottom};
  bool elevatedOutdoorPoint = rooftopPoint || stairPoint || landingPoint;
  bool upstairsPoint = worldPosition.x > ${upstairsLeft} && worldPosition.x < ${upstairsRight}
    && worldPosition.z > ${upstairsBack} && worldPosition.z < ${upstairsFront}
    && worldPosition.y > ${upstairsBottom} && worldPosition.y < ${upstairsTop};
  bool upstairsRoofPoint = rooftopPoint && worldPosition.y > ${upstairsRoofBottom};
  vec2 tentOffset = worldPosition.xz - vec2(${tentX}, ${tentZ});
  bool tentPoint = dot(tentOffset, tentOffset) < ${tentVisibleRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool tentInterior = dot(tentOffset, tentOffset) < ${tentInteriorRadiusSq} && worldPosition.y > -2.2 && worldPosition.y < 5.0;
  bool door = abs(worldPosition.z - 4.0) < 0.22
    && worldPosition.x > -5.75 && worldPosition.x < -3.75
    && worldPosition.y > -2.15 && worldPosition.y < 0.75;

  return renderZone == 4 ? true
    : renderZone == 3 ? upstairsPoint
    : renderZone == 0 ? ((!outsidePoint && !elevatedOutdoorPoint) || door)
    : renderZone == 2 ? tentPoint
    : ((outsidePoint && !tentInterior) || (elevatedOutdoorPoint && (!upstairsPoint || upstairsRoofPoint)) || door);
}

void main() {
  if (!sceneVisible()) {
    discard;
  }

  pixel = vec4(shade, 1.0);
  bloomPixel = vec4(0.0);
}
`

export const strobeVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec4 local;
layout(location = 1) in vec4 paint;
layout(location = 2) in vec3 instanceTop;
layout(location = 3) in vec3 instanceHit;
layout(location = 4) in vec3 instanceBeamRadius;
layout(location = 5) in vec3 instanceColor;
layout(location = 6) in vec2 instanceMeta;

uniform mat4 viewProjection;

out vec3 shade;
out float light;
out vec2 patternUv;
out float hazeAmount;
out float flashGate;
out vec3 worldPosition;
flat out float strobeId;

void main() {
  float pool = step(0.5, local.w);
  vec3 beamTop = instanceTop + vec3(local.x * instanceBeamRadius.x, 0.0, local.y * instanceBeamRadius.x);
  vec3 beamBottom = instanceHit + vec3(local.x * instanceBeamRadius.y, 0.0, local.y * instanceBeamRadius.z);
  vec3 beamPosition = mix(beamTop, beamBottom, local.z);
  vec3 poolPosition = instanceHit + vec3(local.x, 0.02, local.y);
  vec3 position = mix(beamPosition, poolPosition, pool);
  float glow = mix(instanceMeta.y * paint.z, paint.z, pool);
  gl_Position = viewProjection * vec4(position, 1.0);
  shade = instanceColor;
  light = glow;
  patternUv = paint.xy;
  hazeAmount = paint.w;
  flashGate = max(step(0.5, paint.w), pool * step(0.6, instanceMeta.y));
  worldPosition = position;
  strobeId = instanceMeta.x;
}
`

export const smokeVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec3 center;
layout(location = 1) in vec3 offset;
layout(location = 3) in float seed;
layout(location = 4) in vec2 pattern;

uniform float time;
uniform mat4 viewProjection;
uniform vec3 cameraRight;
uniform vec3 cameraUp;

out vec2 patternUv;
out vec2 localUv;
out float opacity;
out float patchSeed;

void main() {
  float cycle = fract(time * 0.018 + seed * 0.137 + center.y * 0.19);
  float fade = smoothstep(0.0, 0.18, cycle) * (1.0 - smoothstep(0.78, 1.0, cycle));
  vec2 drift = vec2(sin(seed * 2.41), cos(seed * 3.17));
  vec3 place = center;

  place.y = -1.45 + pow(cycle, 1.45) * 4.8;
  place.x += drift.x * (cycle - 0.5) * 1.45 + sin(time * 0.11 + seed * 6.1) * 0.22;
  place.z += drift.y * (cycle - 0.5) * 1.9 + cos(time * 0.09 + seed * 4.7) * 0.28;

  vec3 position = place + cameraRight * offset.x + cameraUp * offset.y;

  gl_Position = viewProjection * vec4(position, 1.0);
  localUv = pattern;
  patternUv = pattern + vec2(seed * 0.071 + time * 0.012, time * 0.026);
  opacity = offset.z * fade;
  patchSeed = seed;
}
`

export const smokeFragment = `#version 300 es
precision highp float;

uniform float time;
uniform sampler2D smokeMap;

in vec2 patternUv;
in vec2 localUv;
in float opacity;
in float patchSeed;

layout(location = 0) out vec4 pixel;
layout(location = 1) out vec4 bloomPixel;

void main() {
  float swirl = time * 0.42 + patchSeed * 1.71;
  vec2 local = localUv - 0.5;
  vec2 warp = vec2(
    sin(local.y * 9.0 + swirl) * 0.11 + sin(local.x * 5.0 - swirl * 0.7) * 0.06,
    cos(local.x * 8.0 - swirl * 0.83) * 0.1 + sin(local.y * 6.0 + swirl * 0.51) * 0.06
  );
  vec2 uv = patternUv + warp;
  float edgeNoise = texture(smokeMap, uv * vec2(1.9, 1.3) + vec2(time * 0.018, patchSeed * 0.013)).r;
  float radius = 0.38 + (edgeNoise - 0.5) * 0.18;
  float edge = 1.0 - smoothstep(radius * 0.55, radius, length(local + warp * 0.32));
  float cloudA = texture(smokeMap, uv * vec2(1.5, 1.1)).r;
  float cloudB = texture(smokeMap, uv * vec2(3.6, 2.4) + vec2(patchSeed * 0.037, -time * 0.031)).r;
  float cloud = cloudA * 0.7 + cloudB * 0.3;
  float body = (0.22 + smoothstep(0.16, 0.72, cloud) * 0.78) * edge;
  float alpha = body * opacity;

  pixel = vec4(vec3(0.58, 0.55, 0.5), alpha);
  bloomPixel = vec4(0.0);
}
`

export const postVertex = `#version 300 es
precision highp float;

layout(location = 0) in vec2 position;

out vec2 uv;

void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const postBloomGlsl = `
vec3 bright(vec4 texel) {
  float redGlow = texel.a * smoothstep(0.58, 1.0, texel.r);
  float greenGlow = texel.a * smoothstep(0.035, 0.18, texel.g) * step(texel.r * 2.6, texel.g)
    * step(texel.b * 1.8, texel.g);
  float blueGlow = texel.a * smoothstep(0.045, 0.24, texel.b) * step(texel.r * 1.4, texel.b);

  return redGlow * vec3(1.0, 0.035, 0.012) + greenGlow * vec3(0.04, 0.65, 0.08)
    + blueGlow * vec3(0.0, 0.067, 1.0);
}

vec3 bloomGlow(vec2 point) {
  vec2 texel = 1.0 / bloomResolution;
  vec2 near = texel * 3.2;
  vec2 far = texel * 7.0;
  vec3 glow = bright(texture(bloom, point)) * 0.72;

  glow += bright(texture(bloom, point + vec2(near.x, 0.0))) * 0.18;
  glow += bright(texture(bloom, point - vec2(near.x, 0.0))) * 0.18;
  glow += bright(texture(bloom, point + vec2(0.0, near.y))) * 0.15;
  glow += bright(texture(bloom, point - vec2(0.0, near.y))) * 0.15;
  glow += bright(texture(bloom, point + vec2(far.x, 0.0))) * 0.09;
  glow += bright(texture(bloom, point - vec2(far.x, 0.0))) * 0.09;
  glow += bright(texture(bloom, point + vec2(0.0, far.y))) * 0.07;
  glow += bright(texture(bloom, point - vec2(0.0, far.y))) * 0.07;

  return glow;
}
`

const postDitherGlsl = `
uniform int ditherEnabled;

float outputNoise(vec2 point) {
  return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 ditherPostColor(vec3 color) {
  return ditherEnabled == 1 ? clamp(color + (outputNoise(gl_FragCoord.xy) - 0.5) / 255.0, 0.0, 1.0) : color;
}
`

export const postPlainFragment = `#version 300 es
precision highp float;

uniform sampler2D scene;
uniform sampler2D bloom;
uniform vec2 bloomResolution;

in vec2 uv;

out vec4 pixel;

${postBloomGlsl}
${postDitherGlsl}

void main() {
  vec3 base = texture(scene, uv).rgb;
  vec3 color = base + bloomGlow(uv) * 4.4;

  color = vec3(1.0) - exp(-color * 1.05);
  color *= vec3(1.02, 0.98, 0.96);

  pixel = vec4(ditherPostColor(pow(color, vec3(0.9))), 1.0);
}
`

export const postFragment = `#version 300 es
precision highp float;

uniform sampler2D scene;
uniform sampler2D bloom;
uniform sampler2D feedback;
uniform vec2 bloomResolution;
uniform float feedbackAmount;
uniform float time;
uniform int renderSky;
uniform int tripKind;
uniform vec3 skyForward;
uniform vec3 skyRight;
uniform vec3 skyUp;
uniform vec3 moonDirection;
uniform float moonProgress;
uniform vec3 sunDirection;
uniform float sunProgress;
uniform float daylight;

in vec2 uv;

out vec4 pixel;

${postBloomGlsl}
${postDitherGlsl}

float tripSfract(float n) {
  return smoothstep(0.0, 1.0, fract(n));
}

float tripRand(vec2 n) {
  return fract(abs(sin(dot(n, vec2(5.3357, -5.8464)))) * 256.75 + 0.325);
}

float tripNoise(vec2 n) {
  float h1 = mix(tripRand(vec2(floor(n.x), floor(n.y))), tripRand(vec2(ceil(n.x), floor(n.y))), tripSfract(n.x));
  float h2 = mix(tripRand(vec2(floor(n.x), ceil(n.y))), tripRand(vec2(ceil(n.x), ceil(n.y))), tripSfract(n.x));

  return mix(h1, h2, tripSfract(n.y));
}

vec2 directionSkyPoint(vec3 direction) {
  return vec2(atan(direction.x, direction.z) / 6.2831853 + 0.5, asin(direction.y) / 3.14159265 + 0.5);
}

float sunDistance(vec2 point) {
  vec2 center = directionSkyPoint(normalize(sunDirection));
  vec2 delta = vec2(abs(fract(point.x - center.x + 0.5) - 0.5), point.y - center.y);

  return length(delta * vec2(2.1, 1.0));
}

float sunDiscAmount(vec2 point) {
  return smoothstep(0.044, 0.029, sunDistance(point)) * daylight;
}

float sunWarmth() {
  float dawn = 1.0 - smoothstep(0.0, 0.28, sunProgress);
  float dusk = smoothstep(0.72, 1.0, sunProgress);

  return max(dawn, dusk);
}

vec3 sunTint(float warmth) {
  return mix(vec3(0.7, 0.86, 1.0), vec3(1.0, 0.36, 0.62), warmth);
}

vec3 skySunColor(vec2 point, float warmth) {
  float distance = sunDistance(point);
  float halo = smoothstep(0.11, 0.0, distance) * 0.34;
  float disc = sunDiscAmount(point);
  float core = smoothstep(0.023, 0.01, distance);
  float sun = max(halo, max(disc * 0.92, core));
  vec3 color = vec3(sun, pow(sun, 1.5), pow(sun, 4.0));

  return color * sunTint(warmth) * daylight;
}

vec3 skySunBloom(vec2 point, float warmth) {
  float distance = sunDistance(point);
  float bloom = smoothstep(0.16, 0.0, distance) * 0.16 + smoothstep(0.07, 0.0, distance) * 0.26;
  vec3 color = vec3(bloom, pow(bloom, 1.5), pow(bloom, 4.0));

  return color * sunTint(warmth) * daylight;
}

vec3 tripBackground(vec3 dir) {
  float sky = dot(dir, vec3(0.0, -1.0, 0.0)) * 0.5 + 0.5;
  vec2 p = vec2(dir.x + dir.z, dir.y - dir.z);
  float clouds = tripNoise(p * 8.0) * tripNoise(p * 9.0) * tripNoise(p * 10.0) * tripNoise(p * 11.0) * sky;
  vec3 total = vec3(sky * 0.6 + 0.05 + clouds, sky * 0.8 + 0.075 + clouds, sky + 0.2 + clouds);
  vec2 groundUv = dir.xz / max(abs(dir.y), 0.05);
  vec3 ground = texture(scene, fract(groundUv * 0.08 + vec2(time * 0.018, 0.0))).rrr * vec3(1.1, 1.0, 0.9);

  return mix(total, ground, clamp((sky - 0.6) * 64.0, 0.0, 1.0));
}

float tripModel(vec3 pos) {
  vec3 p = pos + vec3(time * 0.2, 0.0, 0.0)
    + vec3(tripNoise(pos.xz), 0.0, tripNoise(pos.xz + 8.0)) * 0.2;
  float height = 0.1 * pow(tripNoise(p.xz + vec2(time * 0.7, time * 0.6)) * 0.5
    + tripNoise(p.xz * 8.0 + vec2(time)) * 0.35
    + tripNoise(p.xz * 16.0 + vec2(0.0, time * 0.5)) * 0.1
    + tripNoise(p.xz * 24.0) * 0.05, 0.25);

  return p.y - height;
}

float tripIntersection(vec3 ro, vec3 rd) {
  float h = 0.002;
  float t = 0.0;

  for (int i = 0; i < 54; i++) {
    if (h < 0.001 || t > 10.0) {
      break;
    }

    h = tripModel(ro + rd * t);
    t += h * 0.8;
  }

  return t < 10.0 ? t : -1.0;
}

vec3 tripNormal(vec3 pos) {
  const float eps = 0.002;
  const vec3 v1 = vec3(1.0, -1.0, -1.0);
  const vec3 v2 = vec3(-1.0, -1.0, 1.0);
  const vec3 v3 = vec3(-1.0, 1.0, -1.0);
  const vec3 v4 = vec3(1.0, 1.0, 1.0);

  return normalize(v1 * tripModel(pos + v1 * eps) + v2 * tripModel(pos + v2 * eps)
    + v3 * tripModel(pos + v3 * eps) + v4 * tripModel(pos + v4 * eps));
}

vec3 tripColor(vec2 point) {
  vec2 p = (-bloomResolution.xy + 2.0 * point * bloomResolution.xy) / bloomResolution.y;
  vec2 dir = vec2(sin(time * 0.13), cos(time * 0.11)) * 0.2;
  vec3 ro = vec3(0.0, 0.5, 0.0);
  vec3 ta = ro + normalize(vec3(dir.x, 0.08 + dir.y * 0.2, 1.0));
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = normalize(cross(uu, ww));
  vec3 rd = normalize(mat3(uu, vv, ww) * vec3(p.xy, 2.0));
  vec3 col = tripBackground(rd);
  float t = tripIntersection(ro, rd);

  if (t > -0.5) {
    vec3 pos = ro + t * rd;
    vec3 nor = tripNormal(pos);
    vec3 ref = tripBackground(reflect(rd, nor));
    vec3 mal = mix(tripBackground(refract(rd, nor, 0.8)), ref, clamp(dot(ref, vec3(0.333333)) * 1.5, 0.0, 1.0));

    col = mix(tripBackground(rd), mal, 1.0 - clamp(t * t / 90.0, 0.0, 1.0));
  }

  return pow(clamp(col, 0.0, 1.0), vec3(0.4545));
}

float cloudHash(vec2 point) {
  return fract(sin(dot(point, vec2(269.5, 183.3))) * 27182.845);
}

float cloudNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  float a = cloudHash(cell);
  float b = cloudHash(cell + vec2(1.0, 0.0));
  float c = cloudHash(cell + vec2(0.0, 1.0));
  float d = cloudHash(cell + vec2(1.0, 1.0));

  return mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y);
}

float cloudFbm(vec2 point) {
  float total = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    total += cloudNoise(point) * amplitude;
    point = point * 2.0 + 11.0;
    amplitude *= 0.55;
  }

  return total;
}

vec3 afternoonSky(vec2 point) {
  float sunHeight = clamp(sunDirection.y, 0.0, 1.0);
  float pink = sunWarmth();
  float lift = smoothstep(0.34, 0.95, point.y);
  float warmth = 1.0 - smoothstep(0.12, 0.62, point.y);
  float noon = smoothstep(0.22, 0.88, sunHeight);
  vec3 noonHorizon = vec3(0.72, 0.9, 1.0);
  vec3 noonHigh = vec3(0.18, 0.52, 0.96);
  vec3 morningHorizon = vec3(1.0, 0.48, 0.66);
  vec3 morningHigh = vec3(0.46, 0.58, 0.94);
  vec3 noonSky = mix(noonHorizon, noonHigh, lift);
  vec3 pinkSky = mix(morningHorizon, morningHigh, lift);
  vec3 sky = mix(pinkSky, noonSky, noon);

  sky = mix(sky, mix(noonHorizon, morningHorizon, pink), warmth * mix(0.34, 0.74, pink));

  // reconstruct the world view direction from the equirectangular sky uv and
  // project it onto a flat cloud plane high above, so clouds read as a fixed
  // distant layer that rotates rigidly with the camera instead of distorting
  float azimuth = (point.x - 0.5) * 6.2831853;
  float elevation = (point.y - 0.5) * 3.14159265;
  vec3 dir = vec3(cos(elevation) * sin(azimuth), sin(elevation), cos(elevation) * cos(azimuth));
  float toPlane = 1.0 / max(dir.y, 0.04);
  vec2 plane = dir.xz * toPlane;
  vec2 drift = vec2(time * 0.004, 0.0);
  float shape = cloudFbm(plane * 1.6 + drift);
  float detail = cloudFbm(plane * 3.4 + drift * 1.7 + 19.0);
  float coverage = shape + detail * 0.2 - 0.5;
  float body = smoothstep(0.0, 0.14, coverage);
  float lit = smoothstep(0.02, 0.28, coverage);
  // fade where the plane projection stretches too far near the horizon and as
  // the view tips below the plane
  float band = smoothstep(0.5, 0.62, point.y) * (1.0 - smoothstep(0.86, 0.97, point.y));
  float density = clamp(body * body * band, 0.0, 1.0);
  vec3 cloudLit = mix(vec3(0.96, 0.98, 1.0), vec3(1.0, 0.86, 0.91), pink);
  vec3 cloudDark = mix(vec3(0.58, 0.66, 0.76), vec3(0.7, 0.54, 0.67), pink);
  vec3 sunsetPink = vec3(1.0, 0.56, 0.72);
  vec3 cloud = mix(cloudDark, cloudLit, lit);

  cloud = mix(cloud, sunsetPink, warmth * pink * 0.58);
  float disc = sunDiscAmount(point);
  vec3 sun = skySunColor(point, pink);
  float cloudCover = density * (1.0 - disc * 0.38);

  return mix(sky + sun, cloud + sun * disc * 0.22, cloudCover);
}

vec3 hashStar(vec2 cell) {
  vec3 value = fract(vec3(cell.xyx) * vec3(0.1031, 0.103, 0.0973));
  value += dot(value, value.yzx + 33.33);

  return fract((value.xxy + value.yzz) * value.zyx);
}

vec3 nightSky(vec2 point) {
  vec2 moonAnchor = vec2(0.55, 0.62);
  vec2 moonCenter = directionSkyPoint(normalize(moonDirection));
  vec2 nightPoint = vec2(fract(point.x - moonCenter.x + moonAnchor.x), point.y - moonCenter.y + moonAnchor.y);
  float starCell = 445.0;
  vec2 cell = floor(nightPoint * vec2(starCell, starCell * 0.5));
  vec2 local = fract(nightPoint * vec2(starCell, starCell * 0.5)) - 0.5;
  vec3 seed = hashStar(cell);
  float size = seed.y * seed.y * seed.y;
  float radius = mix(0.500, 0.01, pow(size, 0.15));
  float star = step(0.955, seed.x) * smoothstep(radius, 0.0, length(local));
  vec3 blue = vec3(0.44, 0.62, 1.0);
  vec3 cyan = vec3(0.62, 0.95, 1.0);
  vec3 red = vec3(1.0, 0.48, 0.38);
  vec3 yellow = vec3(1.0, 0.86, 0.38);
  vec3 white = vec3(0.95, 0.97, 1.0);
  vec3 starColor = seed.z < 0.18 ? blue : seed.z < 0.34 ? cyan : seed.z < 0.55 ? red
    : seed.z < 0.76 ? yellow : white;
  float twinkle = mix(0.72, 1.35, hashStar(cell + 19.0).x);
  vec3 low = vec3(0.015, 0.01, 0.035);
  vec3 high = vec3(0.0, 0.0, 0.012);
  vec2 moonDelta = vec2(abs(fract(nightPoint.x - moonAnchor.x + 0.5) - 0.5), nightPoint.y - moonAnchor.y);
  float moonDistance = length(moonDelta * vec2(1.0, .5));
  float moon = smoothstep(0.008, 0.006, moonDistance);
  float moonGlow = smoothstep(0.03, 0.008, moonDistance) * 0.18;
  float moonVisible = smoothstep(0.0, 0.08, moonProgress) * (1.0 - smoothstep(0.92, 1.0, moonProgress));
  vec3 sky = mix(low, high, smoothstep(0.0, 1.0, point.y));
  vec3 moonColor = vec3(0.94, 0.92, 0.82);

  return sky + starColor * star * twinkle + moonColor * moonGlow * moonVisible + moonColor * moon * moonVisible;
}

float skyscraperMask(vec2 point, float count, float layer) {
  vec2 scaled = point * vec2(count, 1.0);
  vec2 cell = floor(scaled);
  vec2 local = fract(scaled);
  vec3 seed = hashStar(cell + layer * 31.7);
  float width = mix(0.44, 0.92, seed.y);
  float height = mix(0.28, 0.76, pow(seed.x, 0.72));
  float roof = step(0.78, seed.z) * smoothstep(height + 0.065, height, point.y)
    * smoothstep(height - 0.02, height + 0.06, point.y)
    * smoothstep(0.48, 0.5, 1.0 - abs(local.x - 0.5) * 2.0);
  float body = step(point.y, height) * step(abs(local.x - 0.5) * 2.0, width);

  return max(body, roof);
}

vec3 skyscraperWindows(vec2 point, float count, float layer) {
  vec2 scaled = point * vec2(count, 1.0);
  vec2 cell = floor(scaled);
  vec2 local = fract(scaled);
  vec2 grid = fract(vec2(local.x * 5.0, point.y * 42.0 + layer * 3.0));
  vec3 seed = hashStar(floor(vec2(scaled.x * 5.0, point.y * 42.0)) + layer * 67.0);
  float pane = step(0.18, grid.x) * step(grid.x, 0.58) * step(0.16, grid.y) * step(grid.y, 0.52);
  float lit = step(0.48, seed.x) * pane;
  vec3 warm = vec3(1.0, 0.76, 0.32);
  vec3 cool = vec3(0.36, 0.74, 1.0);
  vec3 pink = vec3(1.0, 0.28, 0.78);

  return lit * (seed.y < 0.62 ? warm : seed.y < 0.86 ? cool : pink) * mix(0.85, 2.4, seed.z);
}

vec3 loftSkyline(vec2 point) {
  vec3 sky = nightSky(point);
  vec3 color = sky;
  float haze = smoothstep(0.62, 0.08, point.y);

  for (int i = 0; i < 3; i++) {
    float layer = float(i);
    float count = mix(38.0, 82.0, layer / 2.0);
    float mask = skyscraperMask(point + vec2(layer * 0.071, 0.0), count, layer);
    vec3 body = mix(vec3(0.002, 0.004, 0.014), vec3(0.026, 0.034, 0.064), layer / 2.0);
    vec3 windows = skyscraperWindows(point + vec2(layer * 0.071, 0.0), count, layer);
    float depth = mix(0.45, 1.0, layer / 2.0);

    color = mix(color, body * depth + windows, mask * mix(0.76, 1.0, layer / 2.0));
  }

  color += vec3(0.2, 0.07, 0.28) * haze * 0.34;

  return color;
}

vec3 dayCycleSky(vec2 point) {
  return mix(nightSky(point), afternoonSky(point), daylight);
}

vec2 skyPoint(vec2 point) {
  vec2 screen = point * 2.0 - 1.0;
  float aspect = bloomResolution.x / bloomResolution.y;
  vec3 direction = normalize(skyForward + skyRight * screen.x * aspect + skyUp * screen.y);

  return vec2(atan(direction.x, direction.z) / 6.2831853 + 0.5, asin(direction.y) / 3.14159265 + 0.5);
}

vec3 sceneWithSky(vec2 point) {
  vec4 source = texture(scene, point);
  vec3 color = source.rgb;

  if (renderSky == 1) {
    float sky = 1.0 - smoothstep(0.02, 0.12, distance(color, vec3(0.28, 0.55, 0.92)));
    vec2 skyUv = skyPoint(point);

    color = mix(color, dayCycleSky(skyUv), sky);
  }
  else if (renderSky == 2) {
    vec2 skyUv = skyPoint(point);
    skyUv.x = fract(skyUv.x + 0.55);

    color = mix(nightSky(skyUv), color, source.a);
  }

  return color;
}

void main() {
  vec4 source = texture(scene, uv);
  vec3 base = source.rgb;
  vec3 glow = bloomGlow(uv);
  float skyMask = 0.0;

  if (renderSky == 1) {
    float sky = 1.0 - smoothstep(0.02, 0.12, distance(base, vec3(0.28, 0.55, 0.92)));
    vec2 skyUv = skyPoint(uv);

    skyMask = sky;
    base = mix(base, dayCycleSky(skyUv), sky);
    glow += skySunBloom(skyUv, sunWarmth()) * mix(0.42, 1.0, sky);
  }
  else if (renderSky == 2) {
    vec2 skyUv = skyPoint(uv);
    skyUv.x = fract(skyUv.x + 0.55);
    vec3 skyline = nightSky(skyUv);

    base = mix(skyline, base, source.a);
  }

  vec3 color = base + glow * 4.4;
  color = vec3(1.0) - exp(-color * 1.05);
  color *= vec3(1.02, 0.98, 0.96);

  vec3 current = pow(color, vec3(0.9));
  vec2 feedbackUv = (uv - 0.5) * 0.992 + 0.5;
  vec3 history = vec3(0.0);

  if (feedbackAmount > 0.001) {
    history = texture(feedback, feedbackUv).rgb * feedbackAmount * (1.0 - skyMask);
  }

  vec3 tripped = max(current, history);

  if (tripKind == 1 && feedbackAmount > 0.001) {
    vec2 wobble = vec2(
      tripNoise(uv * 12.0 + vec2(time * 0.7, time * 0.4)),
      tripNoise(uv * 13.0 + vec2(-time * 0.45, time * 0.62))
    ) - 0.5;
    vec2 liquidUv = uv + wobble * feedbackAmount * 0.055;
    vec3 liquidScene = sceneWithSky(liquidUv);
    vec3 liquidBloom = bright(texture(bloom, liquidUv)) * 2.8;
    vec3 liquid = vec3(1.0) - exp(-(liquidScene + liquidBloom) * 1.05);

    tripped = mix(tripped, liquid, smoothstep(0.0, 0.85, feedbackAmount) * 0.82);
  }
  else if (tripKind == 2 && feedbackAmount > 0.001) {
    vec2 texel = 1.0 / bloomResolution;
    float amount = smoothstep(0.0, 0.85, feedbackAmount);
    float height = 22.5;
    float edgeFalloff = smoothstep(0.05, 0.72, length(uv - 0.5));
    float n0 = tripNoise(uv * 18.0 + vec2(time * 0.45, -time * 0.31));
    float nx = tripNoise((uv + vec2(texel.x, 0.0)) * 18.0 + vec2(time * 0.45, -time * 0.31));
    float ny = tripNoise((uv + vec2(0.0, texel.y)) * 18.0 + vec2(time * 0.45, -time * 0.31));
    vec2 normal = normalize(vec2(n0 - nx, n0 - ny) * height + vec2(0.001));
    vec2 light = normalize(vec2(abs(sin(time * 0.05)), -abs(cos(time * 0.025))));
    float shade = 0.72 + dot(-light, normal) * 0.24;
    vec2 radial = (uv - 0.5) * 0.0075;
    vec2 bump = normal * texel * 24.0 * amount * edgeFalloff;
    vec2 redUv = uv - radial * 0.5 + bump;
    vec2 greenUv = uv + bump * 0.55;
    vec2 blueUv = uv + radial + bump;
    vec3 displaced = vec3(sceneWithSky(redUv).r, sceneWithSky(greenUv).g, sceneWithSky(blueUv).b);
    vec3 bloomDisplaced = vec3(texture(bloom, redUv).r, texture(bloom, greenUv).g, texture(bloom, blueUv).b) * 3.4;
    vec3 painted = vec3(1.0) - exp(-(displaced * shade + bloomDisplaced) * 1.05);
    float noise = 0.94 + tripRand(floor(uv * bloomResolution.xy) + floor(time * 60.0)) * 0.08;

    tripped = mix(tripped, painted * noise, amount * 0.78);
  }

  pixel = vec4(ditherPostColor(tripped), 1.0);
}
`
