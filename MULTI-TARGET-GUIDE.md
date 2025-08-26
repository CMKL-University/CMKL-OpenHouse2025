# CMKL University Multi-Target AR Experience

## 🎯 Multi-Target System Overview

Your CMKL AR app now supports **2 different target images** for an engaging openhouse experience!

### Target Images to Print/Display:

**🎯 Both targets are from this URL:**
https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/band-example/

The system uses a multi-target `.mind` file that contains 2 different target images.

## 🏢 Two Campus Locations:

### Target 1: **Engineering Building** 
- **3D Model**: Animated bear character representing the Engineering department
- **Key to Collect**: 🏗️ "Engineering Access Key" 
- **Interactive Elements**:
  - Click the building model for engineering info
  - Click green info box for building details
  - Collect the golden engineering key

### Target 2: **Science Laboratory**
- **3D Model**: Animated raccoon character representing the Science department  
- **Key to Collect**: 🔬 "Science Lab Key"
- **Interactive Elements**:
  - Click the lab model for science info  
  - Click blue info octahedron for lab details
  - Collect the red science key

## 🎮 Game Flow:

1. **Start the app** - Camera opens immediately (no login required)
2. **Find Target 1** - Point camera at first image → Engineering Building appears
3. **Collect Key 1** - Click the 🏗️ Engineering key to collect it
4. **Find Target 2** - Point camera at second image → Science Lab appears  
5. **Collect Key 2** - Click the 🔬 Science key to collect it
6. **Completion** - Congratulations message when both keys collected!

## 📱 UI Elements:

- **Top Left**: Instructions and target counter (Targets found: X/2)
- **Top Right**: Collected keys list with progress (Progress: X/2)
- **Center**: AR content when target is detected
- **Messages**: Pop-up messages for interactions and achievements

## 🎉 Success Requirements:

Users must collect **both keys** to complete the CMKL openhouse experience:
- ✅ Engineering Access Key
- ✅ Science Lab Key  

## 🔧 Technical Features:

- **Multi-target tracking**: Supports 2 different target images simultaneously
- **Persistent progress**: Keys remain collected between sessions
- **Target detection**: Automatic messages when targets are found
- **Completion tracking**: Records when user finds all facilities
- **Auto-save**: Progress saved every 30 seconds

## 🚀 Testing:

```bash
npx serve .
```

Open: `http://localhost:3000`

Point your camera at both target images to collect all 2 keys for the complete CMKL openhouse experience!