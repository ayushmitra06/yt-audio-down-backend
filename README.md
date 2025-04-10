# 🎵 YouTube Playlist to MP3 Downloader

![image](https://github.com/user-attachments/assets/f8780ab6-d06f-4045-b1b0-0afc08ad8978)

A web application to convert entire YouTube playlists into downloadable MP3 files in a ZIP format.

## 🔗 Live Demo

- **Frontend:** [yt-audio-down-frontend-laxo.vercel.app](https://yt-audio-down-frontend-laxo.vercel.app)  
- **Backend:** [yt-audio-down-backend.onrender.com](https://yt-audio-down-backend.onrender.com)

---

## 📦 Features

- Fetch YouTube playlist info (title, number of videos, etc.)
- Download all audio as `.mp3` from the playlist
- Automatically compress and serve as a `.zip` file
- Responsive UI with real-time feedback

---

## ⚙️ Tech Stack

- **Frontend:** React.js, Custom CSS
- **Backend:** Node.js, Express.js
- **Tools:** `ytpl`, `ytdl-core`, `fluent-ffmpeg`, `ffmpeg-static`, `archiver`

---

## 🚀 How to Run Locally

### Backend
```bash
git clone https://github.com/your-username/yt-audio-down-backend.git
cd yt-audio-down-backend
npm install
touch .env
# Add your .env variables:
# PORT=5000
# CORS_ORIGIN=http://localhost:3000
node index.js
```

### Frontend
```bash
git clone https://github.com/your-username/yt-audio-down-frontend.git
cd yt-audio-down-frontend
npm install
npm start
```

---

## 📁 Environment Variables

**Backend `.env`:**
```env
PORT=5000
CORS_ORIGIN=https://yt-audio-down-frontend-laxo.vercel.app
```

---

## ❗ Notes

- Conversion may take time depending on playlist size.
- Avoid rate limits by keeping delays between downloads.



