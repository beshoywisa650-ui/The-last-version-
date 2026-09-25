import struct
import zlib
import os

def create_png(width, height, get_pixel, output_path):
    # PNG signature
    png_bytes = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    # width (4), height (4), bit_depth (1), color_type (1, 6=RGBA), compression (1), filter (1), interlace (1)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png_bytes += struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc
    
    # Scanlines with filter byte 0
    raw_scanlines = bytearray()
    for y in range(height):
        raw_scanlines.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel(x, y, width, height)
            raw_scanlines.extend((r, g, b, a))
            
    # IDAT chunk
    compressed = zlib.compress(bytes(raw_scanlines), level=9)
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png_bytes += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc
    
    # IEND chunk
    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png_bytes += struct.pack('>I', 0) + b'IEND' + iend_crc
    
    with open(output_path, 'wb') as f:
        f.write(png_bytes)
    print(f"Created {output_path} ({width}x{height})")

def render_sheet_analyzer_icon(x, y, w, h, maskable=False):
    # Normalized coordinates 0.0 to 1.0
    nx = x / float(w)
    ny = y / float(h)
    
    # Rounded rectangle corners
    corner_radius = 0.22 if not maskable else 0.0
    # Center distance
    dx = max(0, abs(nx - 0.5) - (0.5 - corner_radius))
    dy = max(0, abs(ny - 0.5) - (0.5 - corner_radius))
    corner_dist = (dx * dx + dy * dy) ** 0.5
    
    if corner_dist > corner_radius and not maskable:
        return (0, 0, 0, 0) # transparent outside rounded squircle
        
    # Background gradient: #0A3D62 (10, 61, 98) to #122B3D (18, 43, 61)
    grad = (nx * 0.4 + ny * 0.6)
    bg_r = int(10 * (1 - grad) + 18 * grad)
    bg_g = int(61 * (1 - grad) + 43 * grad)
    bg_b = int(98 * (1 - grad) + 61 * grad)
    
    # Spreadsheet panel backdrop
    # Margin 15% to 85%
    pw_start, pw_end = 0.16, 0.84
    ph_start, ph_end = 0.16, 0.84
    in_panel = (pw_start <= nx <= pw_end) and (ph_start <= ny <= ph_end)
    
    r, g, b = bg_r, bg_g, bg_b
    
    if in_panel:
        # Subtle panel background
        r = min(255, int(r * 0.9 + 255 * 0.10))
        g = min(255, int(g * 0.9 + 255 * 0.10))
        b = min(255, int(b * 0.9 + 255 * 0.10))
        
        # Header bar line
        if abs(ny - 0.32) < 0.008:
            r, g, b = 255, 255, 255
            
        # Vertical grid line 1
        if abs(nx - 0.38) < 0.005 and ny > 0.32:
            r, g, b = 200, 230, 255
        # Vertical grid line 2
        if abs(nx - 0.62) < 0.005 and ny > 0.32:
            r, g, b = 200, 230, 255

    # Three Chart Bars
    # Bar 1 (Sky Blue #38BDF8: 56, 189, 248) -> x: [0.23, 0.35], y: [0.55, 0.80]
    if 0.23 <= nx <= 0.35 and 0.55 <= ny <= 0.80:
        r, g, b = 56, 189, 248
    # Bar 2 (Emerald #34D399: 52, 211, 153) -> x: [0.44, 0.56], y: [0.42, 0.80]
    elif 0.44 <= nx <= 0.56 and 0.42 <= ny <= 0.80:
        r, g, b = 52, 211, 153
    # Bar 3 (Amber #FBBF24: 251, 191, 36) -> x: [0.65, 0.77], y: [0.30, 0.80]
    elif 0.65 <= nx <= 0.77 and 0.30 <= ny <= 0.80:
        r, g, b = 251, 191, 36
        
    # Header Accent Dots
    # Dot 1: nx 0.23, ny 0.24
    if ((nx - 0.23)**2 + (ny - 0.24)**2)**0.5 < 0.02:
        r, g, b = 56, 189, 248
    elif ((nx - 0.29)**2 + (ny - 0.24)**2)**0.5 < 0.02:
        r, g, b = 52, 211, 153
    elif ((nx - 0.35)**2 + (ny - 0.24)**2)**0.5 < 0.02:
        r, g, b = 251, 191, 36

    # Spark trend curve: y approx 0.52 - 0.28 * (nx - 0.28) / 0.45
    if 0.28 <= nx <= 0.73:
        target_y = 0.52 - 0.26 * ((nx - 0.28) / 0.45)
        if abs(ny - target_y) < 0.012:
            r, g, b = 255, 255, 255

    return (r, g, b, 255)

os.makedirs('public', exist_ok=True)
create_png(64, 64, lambda x, y, w, h: render_sheet_analyzer_icon(x, y, w, h, False), 'public/favicon.png')
create_png(180, 180, lambda x, y, w, h: render_sheet_analyzer_icon(x, y, w, h, False), 'public/apple-touch-icon.png')
create_png(192, 192, lambda x, y, w, h: render_sheet_analyzer_icon(x, y, w, h, False), 'public/pwa-192x192.png')
create_png(512, 512, lambda x, y, w, h: render_sheet_analyzer_icon(x, y, w, h, False), 'public/pwa-512x512.png')
create_png(512, 512, lambda x, y, w, h: render_sheet_analyzer_icon(x, y, w, h, True), 'public/pwa-maskable-512x512.png')
