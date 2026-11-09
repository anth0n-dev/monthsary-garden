# 🌙 Our Starlit Garden — 20m × 20m 3D Monthsary Surprise

An interactive 3D first-person romantic garden (`20m × 20m`) built with Three.js where your girlfriend can walk around, explore glowing pathways under cherry blossom trees and fireflies, view framed photo memories with captions, and open a love letter at the central gazebo to release floating sky lanterns into the stars.

---

## ✨ How to Customize Photos & Messages

1. **Edit [`public/config.js`](./public/config.js)**:
   - Change `herName`, `yourName`, `monthsaryTitle`, and `welcomeSubtitle`.
   - Update the 6 `memories` items (`title`, `date`, `caption`).
   - Edit `loveLetter` (`heading`, `paragraphs`, `signOff`) for the center gazebo reveal.
2. **Add Your Own Photos**:
   - Place your photos inside `public/photos/` named `1.jpg`, `2.jpg`, `3.jpg`, `4.jpg`, `5.jpg`, `6.jpg` (or update the `image` paths in `public/config.js`).
   - *Note*: Even before you add your own photo files, the garden automatically generates romantic illustrated paintings for each frame so it works right out of the box!
3. **Optional Custom Background Song**:
   - Drop an `.mp3` file into `public/photos/song.mp3` and set `customSongUrl: "photos/song.mp3"` in `public/config.js`.
   - If left blank, the garden plays a built-in dreamy romantic music-box melody using the Web Audio API.

---

## 🚀 How to Run Locally

You can open [`public/index.html`](./public/index.html) directly, or run the local server:

```bash
npm install
npm start
```
Then open **http://localhost:3000** in your browser.

---

## 🌐 How to Deploy on Render

This project is pre-configured for **Render** (either as a **Static Site** for free or as a **Web Service**):

### Option A: Render Static Site (100% Free & Instant)
1. Push this folder to a GitHub repository.
2. On [Render](https://dashboard.render.com/), click **New +** → **Static Site**.
3. Connect your repository and set:
   - **Build Command**: *(leave blank)*
   - **Publish Directory**: `public`
4. Click **Create Static Site**!

### Option B: Render Blueprint / Web Service
- Render will automatically detect [`render.yaml`](./render.yaml) or run `npm install` && `npm start` via [`server.js`](./server.js).

