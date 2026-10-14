import struct
import zlib
import math

def create_png(width, height, get_pixel_func):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
            
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))
    
    # IDAT
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))
    
    # IEND
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))
    
    return bytes(png)

def icon_pixel(x, y, w, h):
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    dist = math.sqrt(nx * nx + ny * ny)
    
    # Outer circle / squircle
    radius = 0.88
    if dist > radius:
        if dist > radius + 0.08:
            return (0, 0, 0, 0)
        alpha = int(255 * (1 - (dist - radius) / 0.08))
    else:
        alpha = 255
        
    # Calming gradient: Indigo to Teal
    t = (ny + 1) / 2
    r_bg = int(16 * (1 - t) + 13 * t)
    g_bg = int(185 * (1 - t) + 148 * t)
    b_bg = int(129 * (1 - t) + 136 * t)
    
    # Modern dark zen palette: Violet to Emerald
    # Top: #6366f1 (99, 102, 241), Bottom: #059669 (5, 150, 105)
    r_bg = int(99 * (1 - t) + 5 * t)
    g_bg = int(102 * (1 - t) + 150 * t)
    b_bg = int(241 * (1 - t) + 105 * t)

    # Symbol: Peaceful Hand Stop / Zen Palm in the center
    # Center circle for mindfulness (zen ring)
    ring_dist = abs(dist - 0.45)
    if ring_dist < 0.08:
        # Zen circle highlight
        return (255, 255, 255, alpha)

    # In center: Calm "D" or Stop Palm
    # Let's draw a clean palm / peaceful shield symbol
    # Center dot
    if dist < 0.18:
        return (255, 255, 255, alpha)

    # Small satellite dots (peace aura)
    if abs(ny) < 0.12 and abs(abs(nx) - 0.45) < 0.12:
        return (255, 255, 255, alpha)

    return (r_bg, g_bg, b_bg, alpha)

for size in [16, 48, 128]:
    data = create_png(size, size, icon_pixel)
    with open(f"icons/icon{size}.png", "wb") as f:
        f.write(data)
    print(f"Generated icons/icon{size}.png")
