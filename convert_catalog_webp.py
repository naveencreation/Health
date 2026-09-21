"""
convert_catalog_webp.py
=======================
Image Asset Pipeline — Canonical 1:1 WebP Conversion

Principles:
  - DO NOT crop the source image.
  - DO NOT resize the source image.
  - Preserve the EXACT original dimensions (width x height).
  - Produce lossy WebP (quality=90) — visually identical on mobile.
  - Validate that output dimensions === input dimensions.
  - Never modify the PNG originals.
  - Report per-file: PNG size, WebP size, reduction %, PASS/FAIL.
"""

import os
import sys
from PIL import Image

SRC_DIR = "images"
DEST_DIR = os.path.join("assets", "foods")
WEBP_QUALITY = 90  # lossy, ~40-100 KB per 1024x1024, excellent mobile quality

os.makedirs(DEST_DIR, exist_ok=True)


def normalize_name(filename: str) -> str:
    """
    Normalise a PNG filename to a clean snake_case WebP output name.
    Example: 'Chicken Biriyani.png' -> 'chicken_biryani.webp'
    """
    name, _ = os.path.splitext(filename)
    clean = name.lower().strip()
    # Remove parenthetical dialect/language variants
    for suffix in [
        " (kaju)", " (alsi)", " (khubani)", " (anjeer)", " (thayir sadam)",
        " (dal chawal)", " (khajoor)", " (chitranna)", " (litchi)",
        " (chilgoza)", " (pista)", " (ven pongal)", " (kismis)",
        " (chikoo)", " (til)", " (mosambi)", " (akhrot)",
    ]:
        clean = clean.replace(suffix, "")
    # Spelling normalisations
    clean = (
        clean
        .replace("biriyani", "biryani")
        .replace("gragonfruit", "dragonfruit")
        .replace("pomogranet", "pomegranate")
        .replace("green-grapes", "green_grapes")
        .replace("chiaseed", "chia_seeds")
    )
    clean = clean.replace("-", "_").replace(" ", "_")
    return clean + ".webp"


def convert_png_to_webp(src_path: str, dst_path: str) -> dict:
    """
    Convert a single PNG to WebP preserving exact dimensions.
    Returns a result dict with status, sizes, and dimension check.
    """
    src_size = os.path.getsize(src_path)

    with Image.open(src_path) as img:
        orig_w, orig_h = img.size

        # Convert to RGBA to handle any colour mode (L, P, RGB, RGBA)
        img_rgba = img.convert("RGBA")

        # Compose onto white RGB background (WebP lossy handles RGB well)
        background = Image.new("RGB", (orig_w, orig_h), (255, 255, 255))
        background.paste(img_rgba, mask=img_rgba.split()[3])  # use alpha as mask

        # Save WITHOUT any resize or crop
        background.save(dst_path, "WEBP", quality=WEBP_QUALITY, method=6)

    dst_size = os.path.getsize(dst_path)

    # Validate dimensions
    with Image.open(dst_path) as out_img:
        out_w, out_h = out_img.size

    dim_ok = (out_w == orig_w) and (out_h == orig_h)

    return {
        "src_size": src_size,
        "dst_size": dst_size,
        "orig_w": orig_w,
        "orig_h": orig_h,
        "out_w": out_w,
        "out_h": out_h,
        "dim_ok": dim_ok,
        "reduction_pct": round(100 - (dst_size / src_size * 100), 1),
    }


# ─────────────────────────────────────────────
# Main conversion loop
# ─────────────────────────────────────────────

files = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith(".png"))
print(f"Found {len(files)} PNG images in '{SRC_DIR}/'.\n")

total_src_size = 0
total_dst_size = 0
failures = []
name_mapping = {}

for filename in files:
    src_path = os.path.join(SRC_DIR, filename)
    dst_name = normalize_name(filename)
    dst_path = os.path.join(DEST_DIR, dst_name)
    name_mapping[filename] = dst_name

    try:
        result = convert_png_to_webp(src_path, dst_path)
    except Exception as e:
        print(f"  ERROR: {filename} — {e}")
        failures.append(filename)
        continue

    total_src_size += result["src_size"]
    total_dst_size += result["dst_size"]

    dim_status = "PASS" if result["dim_ok"] else "FAIL ⚠"
    if not result["dim_ok"]:
        failures.append(filename)

    print(f"{filename}")
    print(f"  Output:     {dst_name}")
    print(f"  Original:   {result['orig_w']}x{result['orig_h']}")
    print(f"  PNG size:   {result['src_size'] / 1024:.1f} KB")
    print(f"  WebP size:  {result['dst_size'] / 1024:.1f} KB")
    print(f"  Reduction:  {result['reduction_pct']}%")
    print(f"  Dimensions: {dim_status}")
    print()

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────

converted_count = len(files) - len(failures)
overall_reduction = round(100 - (total_dst_size / total_src_size * 100), 1) if total_src_size else 0

print("=" * 50)
print("SUMMARY")
print("=" * 50)
print(f"Total PNG images:       {len(files)}")
print(f"Successfully converted: {converted_count}")
print(f"Failures:               {len(failures)}")
print(f"All dimensions OK:      {'YES' if not failures else 'NO — check above'}")
print(f"Original total size:    {total_src_size / (1024*1024):.2f} MB")
print(f"WebP total size:        {total_dst_size / (1024*1024):.2f} MB")
print(f"Overall reduction:      {overall_reduction}%")

if failures:
    print("\nFailed files:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("\nAll images converted successfully with dimensions preserved.")

