diff --git a/app.js b/app.js
new file mode 100644
index 0000000000000000000000000000000000000000..bec95ca639f53abfc454687bfa87c92c966564ee
--- /dev/null
+++ b/app.js
@@ -0,0 +1,124 @@
+import { FFmpeg } from "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/ffmpeg.js";
+import { fetchFile, toBlobURL } from "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js";
+
+const imageInput = document.getElementById("imageInput");
+const audioInput = document.getElementById("audioInput");
+const generateBtn = document.getElementById("generateBtn");
+const status = document.getElementById("status");
+const progress = document.getElementById("progress");
+const downloadLink = document.getElementById("downloadLink");
+const previewImage = document.getElementById("previewImage");
+
+const ffmpeg = new FFmpeg();
+let ffmpegLoaded = false;
+let outputUrl = null;
+
+function setStatus(text) {
+  status.textContent = text;
+}
+
+function updateGenerateState() {
+  generateBtn.disabled = !(imageInput.files?.[0] && audioInput.files?.[0]);
+}
+
+function updatePreview() {
+  const file = imageInput.files?.[0];
+  if (!file) {
+    previewImage.removeAttribute("src");
+    return;
+  }
+  previewImage.src = URL.createObjectURL(file);
+}
+
+async function loadFFmpeg() {
+  if (ffmpegLoaded) return;
+
+  setStatus("FFmpeg コアを読み込み中...");
+  progress.hidden = false;
+  progress.value = 0;
+
+  ffmpeg.on("progress", ({ progress: ratio }) => {
+    progress.value = ratio;
+  });
+
+  const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
+  await ffmpeg.load({
+    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
+    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
+  });
+
+  ffmpegLoaded = true;
+  progress.hidden = true;
+}
+
+async function generateVideo() {
+  const imageFile = imageInput.files?.[0];
+  const audioFile = audioInput.files?.[0];
+  if (!imageFile || !audioFile) return;
+
+  generateBtn.disabled = true;
+  downloadLink.hidden = true;
+  progress.hidden = false;
+  progress.value = 0;
+
+  if (outputUrl) {
+    URL.revokeObjectURL(outputUrl);
+    outputUrl = null;
+  }
+
+  try {
+    await loadFFmpeg();
+
+    setStatus("入力ファイルを書き込み中...");
+    await ffmpeg.writeFile("image", await fetchFile(imageFile));
+    await ffmpeg.writeFile("audio.mp3", await fetchFile(audioFile));
+
+    setStatus("MP4 を生成中...");
+    await ffmpeg.exec([
+      "-loop",
+      "1",
+      "-i",
+      "image",
+      "-i",
+      "audio.mp3",
+      "-filter_complex",
+      "[1:a]showfreqs=s=1280x720:mode=bar:ascale=lin:colors=0x00ffff@0.3,format=rgba[spec];[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,format=rgba[bg];[bg][spec]overlay=0:0:shortest=1,format=yuv420p[v]",
+      "-map",
+      "[v]",
+      "-map",
+      "1:a",
+      "-c:v",
+      "libx264",
+      "-preset",
+      "veryfast",
+      "-c:a",
+      "aac",
+      "-shortest",
+      "output.mp4",
+    ]);
+
+    const data = await ffmpeg.readFile("output.mp4");
+    const blob = new Blob([data.buffer], { type: "video/mp4" });
+    outputUrl = URL.createObjectURL(blob);
+
+    downloadLink.href = outputUrl;
+    downloadLink.hidden = false;
+    setStatus("生成が完了しました。MP4 をダウンロードできます。");
+  } catch (error) {
+    console.error(error);
+    setStatus("生成に失敗しました。ブラウザコンソールを確認してください。");
+  } finally {
+    progress.hidden = true;
+    progress.value = 0;
+    updateGenerateState();
+  }
+}
+
+imageInput.addEventListener("change", () => {
+  updatePreview();
+  updateGenerateState();
+});
+audioInput.addEventListener("change", updateGenerateState);
+generateBtn.addEventListener("click", generateVideo);
+
+updateGenerateState();
