require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ytpl = require('ytpl');
process.env.YTDL_NO_UPDATE = '1';
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const archiver = require('archiver');
const util = require('util');
const { v4: uuidv4 } = require('uuid');

ffmpeg.setFfmpegPath(ffmpegPath);
const sleep = util.promisify(setTimeout);

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CORS_ORIGIN || 'https://yt-audio-down-frontend-laxo.vercel.app';

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Temp folder setup
const tempFolder = path.join(__dirname, 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder);

// Test FFmpeg
app.get('/test-ffmpeg', (req, res) => {
  res.send(`FFmpeg Path: ${ffmpegPath} | Exists: ${fs.existsSync(ffmpegPath)}`);
});

// Get playlist info
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

// Download playlist
app.post('/download-playlist', async (req, res) => {
  const { playlistUrl } = req.body;
  if (!playlistUrl) return res.status(400).json({ error: 'Playlist URL is required' });

  const sessionId = uuidv4();
  const sessionPath = path.join(tempFolder, sessionId);
  fs.mkdirSync(sessionPath);

  try {
    const playlist = await ytpl(playlistUrl, { pages: Infinity });
    console.log(`📥 Downloading ${playlist.items.length} videos`);

    for (const item of playlist.items) {
      const title = item.title.replace(/[\/\\?%*:|"<>]/g, '_');
      const outputPath = path.join(sessionPath, `${title}.mp3`);
      console.log('⏬ Processing:', item.title);

      const audioStream = ytdl(item.url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36',
          },
        },
      });

      try {
        await new Promise((resolve, reject) => {
          ffmpeg(audioStream)
            .audioBitrate(128)
            .save(outputPath)
            .on('end', () => {
              console.log('✅ Saved:', outputPath);
              resolve();
            })
            .on('error', (err) => {
              console.error('❌ FFmpeg Error:', err);
              reject(err);
            });
        });
      } catch (err) {
        if (err.message.includes('429')) {
          console.warn('⚠️ Rate limited. Skipping:', item.title);
          continue;
        }
        throw err;
      }

      await sleep(7000);
      console.log('✅ Done:', item.title);
    }

    const filesInSession = fs.readdirSync(sessionPath);
    console.log(`📂 Files in session folder:`, filesInSession);

    const zipPath = path.join(tempFolder, `${sessionId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(sessionPath, false);
    archive.finalize();

    output.on('close', () => {
      console.log('📦 ZIP finalized, starting download');
      res.download(zipPath, `${playlist.title}.zip`, err => {
        if (err) console.error('❌ Download error:', err);
        fs.rmSync(sessionPath, { recursive: true, force: true });
        fs.unlinkSync(zipPath);
      });
    });

    output.on('error', err => {
      console.error('❌ Zip stream error:', err);
      res.status(500).send('Failed to zip files.');
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
