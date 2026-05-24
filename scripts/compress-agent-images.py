"""
Compression des avatars agents Élio avant commit.

Usage :
    python scripts/compress-agent-images.py

Dépose tes PNG ChatGPT dans apps/client/public/elio/agents/
puis lance ce script AVANT de faire git add.

Les images ChatGPT font ~1.3-1.5 Mo — ce script les ramène à ~150 Ko
(max 400px de large, PNG optimisé, transparence conservée).
"""

from PIL import Image
import os

AGENTS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..", "apps", "client", "public", "elio", "agents"
)
MAX_WIDTH = 400

def compress(path):
    orig_kb = os.path.getsize(path) // 1024
    img = Image.open(path)
    w, h = img.size
    if w > MAX_WIDTH:
        ratio = MAX_WIDTH / w
        img = img.resize((MAX_WIDTH, int(h * ratio)), Image.LANCZOS)
    img.save(path, "PNG", optimize=True)
    new_kb = os.path.getsize(path) // 1024
    print(f"  {os.path.basename(path)}: {orig_kb} KB -> {new_kb} KB")

def main():
    folder = os.path.abspath(AGENTS_DIR)
    files = [f for f in os.listdir(folder) if f.endswith(".png")]
    if not files:
        print("Aucun PNG trouvé dans", folder)
        return
    print(f"Compression de {len(files)} image(s) dans {folder}\n")
    for fname in sorted(files):
        compress(os.path.join(folder, fname))
    print("\nTerminé. Tu peux faire git add + git commit.")

if __name__ == "__main__":
    main()
