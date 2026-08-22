import re

content = open("src/app/page.tsx", "r").read()

old_block = """        // Monad diamond etched on the egg
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(t * 0.25);
        ctx.globalAlpha = 0.5 * k;
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
        const d = R * 0.42;
        ctx.beginPath();
        ctx.moveTo(0, -d); ctx.lineTo(d, 0); ctx.lineTo(0, d); ctx.lineTo(-d, 0);
        ctx.closePath(); ctx.stroke();
        ctx.restore();"""

new_block = """        // Actual Monad Logo
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(t * 0.25);
        ctx.globalAlpha = 0.8 * k;
        const logoR = R * 0.45;
        
        // Purple circle background
        ctx.beginPath();
        ctx.arc(0, 0, logoR, 0, Math.PI * 2);
        ctx.fillStyle = "#836EF9";
        ctx.fill();
        
        // White rounded rectangle (rotated 45 degrees)
        ctx.rotate(Math.PI / 4);
        const rectSize = logoR * 0.86;
        const rx = logoR * 0.23;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-rectSize / 2, -rectSize / 2, rectSize, rectSize, rx);
        } else {
          ctx.rect(-rectSize / 2, -rectSize / 2, rectSize, rectSize);
        }
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = logoR * 0.3;
        ctx.stroke();
        
        ctx.restore();"""

if old_block in content:
    content = content.replace(old_block, new_block)
    open("src/app/page.tsx", "w").write(content)
    print("Patched intro Monad logo")
else:
    print("Could not find intro Monad logo block")
