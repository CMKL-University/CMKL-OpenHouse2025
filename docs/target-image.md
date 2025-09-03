# Target Image for Testing

Your CMKL University AR app is now configured to work with this target image:

## Print or Display This Image:

**Target Image URL:** 
https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png

### How to Use:

1. **On Computer:** Open the URL above in a new tab, make it fullscreen
2. **On Phone:** Save the image to your photos, display it fullscreen
3. **Print:** Print the image on paper (any size works)

### Testing Steps:

1. Start your local server: `python -m http.server 8000`
2. Open: `http://localhost:8000`
3. Enter your first and last name
4. Allow camera access
5. Point your camera at the target image
6. You should see:
   - Green rotating "CMKL University Welcome!" box
   - Gold sphere (Engineering Key) with 🔑
   - Red cylinder (Science Key) with 🔬  
   - Purple octahedron (Innovation Key) with 💡

### What Happens When You Point Camera at Image:

✅ **Target Detected Message**: "AR Target Detected! Explore the scene!"

✅ **3D Objects Appear**: All CMKL elements float above the image

✅ **Interactive**: Click any object to collect keys or get info

✅ **Data Saved**: All interactions tracked and exportable as JSON

The AR elements are now properly sized and positioned to work well with the card image!