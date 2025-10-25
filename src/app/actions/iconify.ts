"use server";

import OpenAI from "openai";

export type IconifyResult = { name: string; b64?: string; error?: string };
export type IconifyState = { results: IconifyResult[] };

/* ---------- BAKED PROMPT (verbatim) ---------- */
const BAKED_PROMPT = [
  "Reinterpret the attached reference as a single-object isometric top-down 3D icon in the 'Scapia 3D Icon – Isometric Matte+Gloss' style.",
  "Keep white background, orthographic camera, base matte with glossy accents, soft shadow.",
  "Generate 1024×1024 PNGs; no captions.",
  "Output should have a transparent background."
].join(" ");

/* ---------- BAKED PRESET JSON (Scapia preset) ---------- */
const PRESET = {
  version: "1.1.0",
  name: "Scapia 3D Icon – Isometric Matte+Gloss",
  id: "scapia-3d-iso-3daf1d84",
  created_utc: "2025-09-22T10:21:09.489194Z",
  notes:
    "Isometric top-down preset. Reduces clay/SSS, adds subtle glossy accents while keeping the soft toy-miniature look on white.",
  style_prompt: [
    "single object 3D icon, soft toy-like miniature with rounded silhouette and generous fillets (6–10% edge radius),",
    "finish is a mix of matte base and subtle glossy accents (like resin/plastic), clean surfaces, no visible seams,",
    "simple panel insets and windows with beveled rims, minimal small details,",
    "studio render on pure white background with soft ground contact shadow,",
    "orthographic isometric top-down view (35° elevation, 45° azimuth), subject centered with slight rightward facing,",
    "avoid chunky clay feel; surfaces should feel molded/finished with crisp highlights and gentle AO."
  ],
  negative_prompt: [
    "clay sculpted look, thick subsurface scattering, fingerprints, tool marks,",
    "photorealism, metallic chrome, glass glare, glitter, noisy microtexture,",
    "harsh shadows, specular hotspots, busy backgrounds, text/logos/stickers"
  ],
  palette: {
    base_off_white: "#EEEAE3",
    graphite_grey: "#2F3336",
    window_tint: "#394048",
    accent_red: "#E74A3A",
    accent_yellow: "#F6C55B",
    accent_blue: "#7AA6D9",
    notes:
      "Default palette aligned to the reference icons; override per icon if needed."
  },
  materials: {
    default: {
      metalness: 0.0,
      roughness: 0.58,
      specular: 0.45,
      subsurface: 0.05,
      ior: 1.47,
      clearcoat: 0.2,
      clearcoat_roughness: 0.25
    },
    gloss_accent: {
      metalness: 0.0,
      roughness: 0.35,
      specular: 0.55,
      subsurface: 0.02,
      ior: 1.48,
      clearcoat: 0.35,
      clearcoat_roughness: 0.18
    },
    glass_like_windows: {
      metalness: 0.0,
      roughness: 0.12,
      specular: 0.6,
      subsurface: 0.0,
      ior: 1.5,
      tint: "window_tint"
    },
    rubber_tires: {
      metalness: 0.0,
      roughness: 0.88,
      specular: 0.2,
      subsurface: 0.0,
      tint: "graphite_grey"
    }
  },
  geometry: {
    bevel_ratio: [0.06, 0.1],
    inflation_amount: "medium",
    window_inset_depth: "small",
    headlight_shape: "round or rounded-rect",
    proportions_hint:
      "toy-like chibi proportions; simplified segmentation"
  },
  lighting: {
    scheme: "soft_three_point + low-contrast HDRI",
    env_intensity: 1.1,
    key: {
      intensity: 1.0,
      direction: "front-left 35°",
      softness: "soft"
    },
    fill: {
      intensity: 0.2,
      direction: "front-right",
      softness: "very soft"
    },
    kicker: {
      intensity: 0.25,
      direction: "top-right 60°",
      size: "small",
      softness: "semi-soft"
    },
    rim: {
      intensity: 0.05,
      direction: "back-right 40°",
      softness: "soft"
    },
    shadow: {
      opacity: [0.18, 0.26],
      blur: "medium-soft",
      offset: "subtle"
    }
  },
  camera: {
    type: "orthographic",
    isometric: true,
    elevation_deg: 35.264,
    azimuth_deg: 45.0,
    tilt_deg: 0.0,
    ortho_scale: 1.08,
    distance_mode: "fit-object-with-margin"
  },
  render: {
    style_strength: 0.9,
    detail_level: "iconic-medium",
    consistency: {
      seed_mode: "fixed_by_subject",
      seed_hint: 985349612
    },
    background: { mode: "white", hex: "#FFFFFF" }
  },
  post: {
    ao_boost: 0.12,
    contrast: 0.01,
    saturation: -0.02,
    sharpen: 0.05
  },
  output: {
    size_px: 1536,
    padding_ratio: 0.08,
    filetype: "png",
    transparent_background: false
  },
  controls: { guidance_scale: 7.0, steps: 30 },
  templates: {
    text_to_image_prompt:
      "Isometric 3D icon of {subject}, top-down orthographic (35°/45°) in the 'Scapia 3D Icon – Isometric Matte+Gloss' style. White background, centered. Base matte plastic with subtle glossy accents (use 'gloss_accent' on stripes/trim). Minimal details, rounded forms. Notes: {details}.",
    image_to_image_prompt:
      "Reinterpret the attached reference as a single-object isometric top-down 3D icon in the 'Scapia 3D Icon – Isometric Matte+Gloss' style. Keep white background, orthographic camera, base matte with glossy accents, soft shadow."
  },
  reference_image: {
    use: "optional",
    weight: 0.45,
    notes:
      "Attach a silhouette-clear image. Style rules enforce isometric view and finish."
  },
  overrides: {
    palette: {},
    seed: null,
    camera: {},
    lighting: {},
    materials: {},
    notes:
      "Per-generation tweaks go here while keeping the preset stable."
  }
};

/* ---------- helper: call images.edit with graceful fallbacks ---------- */
async function editWithFallbacks(
  client: OpenAI,
  uploadFile: File,
  fullPrompt: string
): Promise<string> {
  // Try 1: with transparent background param (some SDKs/servers accept this)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r1 = await (client.images.edit as any)({
      model: "gpt-image-1",
      prompt: fullPrompt,
      image: [uploadFile],
      size: "1024x1024",
      // Some SDK versions accept this; others return 400 Unknown parameter.
     
      background: "transparent",
      n: 1
    });

    const b64a = (r1.data?.[0] as { b64_json?: string })?.b64_json;
    if (b64a) return b64a;

    const urla = (r1.data?.[0] as { url?: string })?.url;
    if (urla) {
      const f = await fetch(urla);
      const buf = Buffer.from(await f.arrayBuffer());
      return buf.toString("base64");
    }
  } catch (e: unknown) {
    const msg = (e instanceof Error ? e.message : "").toLowerCase();
    if (!msg.includes("unknown parameter") && !msg.includes("invalid parameter")) {
      // Rethrow unexpected errors
      throw e;
    }
  }

  // Try 2: without background param
  const r2 = await client.images.edit({
    model: "gpt-image-1",
    prompt: fullPrompt,
    image: [uploadFile],
    size: "1024x1024",
    n: 1
  });

  let b64 = (r2.data?.[0] as { b64_json?: string })?.b64_json as string | undefined;
  if (!b64) {
    const url = (r2.data?.[0] as { url?: string })?.url;
    if (!url) throw new Error("No image returned by API");
    const f = await fetch(url);
    const buf = Buffer.from(await f.arrayBuffer());
    b64 = buf.toString("base64");
  }
  return b64!;
}

/* ---------- server action ---------- */
export async function iconifyAction(
  _prevState: IconifyState,
  formData: FormData
): Promise<IconifyState> {
  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    return {
      results: [{
        name: "error",
        error: "OpenAI API key not configured. Please check your environment variables."
      }]
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const files = formData.getAll("images") as File[];
  const results: IconifyResult[] = [];

  // Handle case where no files are provided
  if (!files || files.length === 0) {
    return {
      results: [{
        name: "error", 
        error: "No images provided. Please select at least one image to process."
      }]
    };
  }

  for (const f of files) {
    try {
      // Validate file
      if (!f || f.size === 0) {
        results.push({
          name: f?.name || "unknown",
          error: "Invalid or empty file"
        });
        continue;
      }

      // Ensure we pass a real File (Node 18+ provides File via undici)
      const arrayBuffer = await f.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);
      const uploadFile = new File([bytes], f.name || "reference.png", {
        type: f.type || "image/png"
      });

      const fullPrompt = [
        BAKED_PROMPT,
        "",
        "Style JSON (do not change):",
        JSON.stringify(PRESET, null, 2),
        "",
        "Requirements:",
        "- 1024x1024 square",
        "- transparent background (no text/captions)"
      ].join("\n");

      const b64 = await editWithFallbacks(client, uploadFile, fullPrompt);

      results.push({
        name: f.name.replace(/\.[^.]+$/, "") + "-icon.png",
        b64
      });
    } catch (e: unknown) {
      console.error("Error processing file:", f?.name, e);
      results.push({
        name: f?.name?.replace(/\.[^.]+$/, "") + "-icon.png" || "unknown-icon.png",
        error: e instanceof Error ? e.message : "Failed to process image"
      });
    }
  }

  return { results };
}
