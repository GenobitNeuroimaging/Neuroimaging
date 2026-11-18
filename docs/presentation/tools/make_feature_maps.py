"""Generate the feature maps shown on the CNN slide.

Applies three fixed 3x3 filters to a real OASIS slice (assets/generated/dementia_md.jpg)
and max-pools the edge magnitude twice, to show what the first and deeper layers of a
CNN compute. Run from the repository root:

    python docs/presentation/tools/make_feature_maps.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

GEN = Path(__file__).resolve().parents[1] / "assets" / "generated"
img = np.asarray(Image.open(GEN / "dementia_md.jpg").convert("L"), dtype=np.float32) / 255.0

KERNELS = {
    "fm_vert": np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], np.float32),   # vertical edges
    "fm_horz": np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], np.float32),   # horizontal edges
    "fm_dark": -np.ones((3, 3), np.float32) / 9.0,                           # dark regions (fluid)
    "fm_diag1": np.array([[0, 1, 2], [-1, 0, 1], [-2, -1, 0]], np.float32),  # diagonal edges /
    "fm_diag2": np.array([[2, 1, 0], [1, 0, -1], [0, -1, -2]], np.float32),  # diagonal edges \
    "fm_lap": np.array([[0, -1, 0], [-1, 4, -1], [0, -1, 0]], np.float32),   # fine detail (Laplacian)
    "fm_emb": np.array([[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], np.float32),    # relief
    "fm_blur": np.array([[1, 2, 1], [2, 4, 2], [1, 2, 1]], np.float32) / 16, # smoothing
}


def conv(x, k):
    p = np.pad(x, 1, mode="edge")
    out = np.zeros_like(x)
    for dy in range(3):
        for dx in range(3):
            out += k[dy, dx] * p[dy:dy + x.shape[0], dx:dx + x.shape[1]]
    return out


def save(a, name, lo=None, hi=None):
    lo = a.min() if lo is None else lo
    hi = a.max() if hi is None else hi
    u8 = (np.clip((a - lo) / (hi - lo + 1e-8), 0, 1) * 255).astype(np.uint8)
    Image.fromarray(u8).save(GEN / f"{name}.png", optimize=True)


def pool(a, s=4):
    h, w = a.shape[0] // s * s, a.shape[1] // s * s
    return a[:h, :w].reshape(h // s, s, w // s, s).max(axis=(1, 3))


brain = np.zeros_like(img, dtype=bool)          # inside the skull: fill each row between its brightest edges
for y, row in enumerate(img > 0.25):
    xs = np.flatnonzero(row)
    if xs.size > 1:
        brain[y, xs[0] + 8:xs[-1] - 8] = True
maps = {}
for name, k in KERNELS.items():
    r = conv(img, k)
    if name == "fm_dark":
        r = np.where(brain, r, r.min())          # only fluid inside the head counts as "dark"
        maps[name] = r
        save(r, name, np.percentile(r, 50), r.max())
    elif name in ("fm_blur", "fm_emb"):
        maps[name] = r
        save(r, name, np.percentile(r, 1), np.percentile(r, 99.5))
    else:
        r = np.maximum(r, 0)                     # ReLU
        maps[name] = r
        save(r, name, 0, np.percentile(r, 99.5))

mag = np.hypot(conv(img, KERNELS["fm_vert"]), conv(img, KERNELS["fm_horz"]))
p1 = pool(mag, 4)
p2 = pool(p1, 4)
save(p1, "fm_pool1", 0, np.percentile(p1, 99))
save(p2, "fm_pool2", 0, np.percentile(p2, 99))
print("wrote", sorted(p.name for p in GEN.glob("fm_*.png")))
