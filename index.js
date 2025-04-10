require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ytpl = require('ytpl');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const archiver = require('archiver');
const util = require('util');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CORS_ORIGIN || 'https://yt-audio-down-frontend-laxo.vercel.app';
const tempFolder = path.join(__dirname, 'temp');
const execPromise = util.promisify(exec);

if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

app.post('/get-playlist-info', async (req, res) => {
  const { playlistUrl } = req.body;
  if (!playlistUrl) return res.status(400).json({ error: 'Playlist URL is required' });

  try {
    const playlist = await ytpl(playlistUrl, { pages: 1 });
    res.json({
      title: playlist.title,
      totalItems: playlist.items.length,
      author: playlist.author?.name || "Unknown",
      titles: playlist.items.map(item => item.title),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch playlist info' });
  }
});

app.post('/download-playlist', async (req, res) => {
  const { playlistUrl } = req.body;
  if (!playlistUrl) return res.status(400).json({ error: 'Playlist URL is required' });

  const sessionId = uuidv4();
  const sessionPath = path.join(tempFolder, sessionId);
  fs.mkdirSync(sessionPath);

  try {
    const playlist = await ytpl(playlistUrl, { pages: Infinity });
    console.log(`Downloading ${playlist.items.length} videos`);

    for (const item of playlist.items) {
      const title = item.title.replace(/[\/:*?"<>|]/g, '_');
      const outputPath = path.join(sessionPath, `${title}.mp3`);

      const cmd = `yt-dlp -x --audio-format mp3 -o "${outputPath}" "${item.shortUrl}"`;
      try {
        console.log('⏬ Downloading:', item.title);
        await execPromise(cmd);
        console.log('✅ Done:', item.title);
      } catch (error) {
        console.warn(`⚠️ Failed to download "${item.title}":`, error.message);
        continue;
      }
    }

    const files = fs.readdirSync(sessionPath).filter(file => file.endsWith('.mp3'));
    if (files.length === 0) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      return res.status(500).json({ error: 'No audio files were downloaded.' });
    }

    const zipPath = path.join(tempFolder, `${sessionId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(sessionPath, false);
    await archive.finalize();

    output.on('close', () => {
      res.download(zipPath, `${playlist.title}.zip`, err => {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        fs.unlinkSync(zipPath);
      });
    });

    output.on('error', err => {
      console.error('Zip stream error:', err);
      res.status(500).send('Failed to zip files.');
    });

  } catch (err) {
    console.error(err);
    fs.rmSync(sessionPath, { recursive: true, force: true });
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));