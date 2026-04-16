(() => {
  const DB_NAME = "bp_resume_demo_db";
  const DB_VERSION = 1;

  const UPLOAD_STATE_PREFIX = "bp_resume_upload_state:";
  const DOWNLOAD_STATE_PREFIX = "bp_resume_download_state:";

  const UI = {
    log: document.getElementById("log"),

    uploadFile: document.getElementById("uploadFile"),
    chunkSize: document.getElementById("chunkSize"),
    uploadMode: document.getElementById("uploadMode"),
    uploadChunkUrl: document.getElementById("uploadChunkUrl"),
    uploadStartBtn: document.getElementById("uploadStartBtn"),
    uploadPauseBtn: document.getElementById("uploadPauseBtn"),
    uploadClearBtn: document.getElementById("uploadClearBtn"),
    uploadBar: document.getElementById("uploadBar"),
    uploadStatus: document.getElementById("uploadStatus"),

    downloadFileId: document.getElementById("downloadFileId"),
    downloadChunkSize: document.getElementById("downloadChunkSize"),
    downloadMode: document.getElementById("downloadMode"),
    downloadUrlTemplate: document.getElementById("downloadUrlTemplate"),
    downloadFileSize: document.getElementById("downloadFileSize"),
    downloadStartBtn: document.getElementById("downloadStartBtn"),
    downloadPauseBtn: document.getElementById("downloadPauseBtn"),
    downloadClearBtn: document.getElementById("downloadClearBtn"),
    downloadSaveBtn: document.getElementById("downloadSaveBtn"),
    downloadBar: document.getElementById("downloadBar"),
    downloadStatus: document.getElementById("downloadStatus"),
  };

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return String(bytes);
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function logLine(msg) {
    const time = new Date().toLocaleTimeString();
    UI.log.textContent += `[${time}] ${msg}\n`;
    UI.log.scrollTop = UI.log.scrollHeight;
  }

  function setBar(barEl, percent) {
    const p = Math.max(0, Math.min(100, percent));
    barEl.style.width = `${p}%`;
  }

  function fileIdFromFile(file) {
    // 仅用于 demo：稳定且跨刷新可复现。
    // 真正项目通常建议服务端返回 fileId，或用哈希避免文件名特殊字符问题。
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  function stateKey(prefix, fileId) {
    return `${prefix}${fileId}`;
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function removeKeyPrefix(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  }

  const dbPromise = openDb();

  async function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "fileId" });
        }
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks", { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function chunkKey(kind, fileId, chunkIndex) {
    return `${kind}:${fileId}:${chunkIndex}`;
  }

  async function putMeta(fileId, meta) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({ fileId, ...meta });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getMeta(fileId) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("meta", "readonly");
      const req = tx.objectStore("meta").get(fileId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function putChunk(kind, fileId, chunkIndex, blob) {
    const db = await dbPromise;
    const key = chunkKey(kind, fileId, chunkIndex);
    return new Promise((resolve, reject) => {
      const tx = db.transaction("chunks", "readwrite");
      tx.objectStore("chunks").put({ key, kind, fileId, chunkIndex, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getChunk(kind, fileId, chunkIndex) {
    const db = await dbPromise;
    const key = chunkKey(kind, fileId, chunkIndex);
    return new Promise((resolve, reject) => {
      const tx = db.transaction("chunks", "readonly");
      const req = tx.objectStore("chunks").get(key);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteChunks(kind, fileId) {
    const db = await dbPromise;
    const prefix = `${kind}:${fileId}:`;
    const startKey = prefix;
    const endKey = prefix + "\uffff";

    return new Promise((resolve, reject) => {
      const tx = db.transaction("chunks", "readwrite");
      const store = tx.objectStore("chunks");
      let count = 0;

      const range = IDBKeyRange.bound(startKey, endKey);
      const cursorReq = store.openCursor(range);

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return;
        count++;
        store.delete(cursor.primaryKey);
        cursor.continue();
      };

      tx.oncomplete = () => {
        logLine(`清理 IndexedDB chunk 完成：kind=${kind} fileId=${fileId} count≈${count}`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  function getTotalChunks(totalSize, chunkSize) {
    return Math.max(1, Math.ceil(totalSize / chunkSize));
  }

  function chunkRangeByIndex(chunkIndex, chunkSize, totalSize) {
    const start = chunkIndex * chunkSize;
    const endExclusive = Math.min(totalSize, start + chunkSize);
    const endInclusive = endExclusive - 1;
    return { start, endInclusive, size: endInclusive - start + 1 };
  }

  async function headContentLength(url) {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) throw new Error(`HEAD failed: ${res.status}`);
    const len = res.headers.get("Content-Length");
    if (!len) throw new Error("Missing Content-Length");
    return Number(len);
  }

  function buildDownloadUrl(template, fileId) {
    return template.replaceAll("{{fileId}}", encodeURIComponent(fileId));
  }

  // ========== Upload (mock/server) ==========
  let uploadAbort = null;
  let uploadPaused = false;
  let uploadRunning = false;

  UI.uploadPauseBtn.addEventListener("click", () => {
    uploadPaused = true;
    if (uploadAbort) uploadAbort.abort();
    logLine("已请求暂停上传（将尽快停止）");
  });

  UI.uploadClearBtn.addEventListener("click", async () => {
    uploadPaused = true;
    if (uploadAbort) uploadAbort.abort();
    removeKeyPrefix(UPLOAD_STATE_PREFIX);
    UI.uploadBar.style.width = "0%";
    UI.uploadStatus.textContent = "已清除上传续传状态";
    logLine("已清除 localStorage 上传续传状态（mock/server）");

    // 可选：清理 mock 的 IndexedDB（如果输入了 fileId）
    const fileId = UI.downloadFileId.value.trim();
    if (fileId) {
      try {
        await deleteChunks("upload", fileId);
      } catch (e) {
        logLine(`清理 mock upload chunks 失败：${e?.message || e}`);
      }
    }
  });

  UI.uploadFile.addEventListener("change", async () => {
    const file = UI.uploadFile.files && UI.uploadFile.files[0];
    if (!file) return;
    const fileId = fileIdFromFile(file);
    UI.downloadFileId.value = fileId;
    logLine(`选择文件：${file.name}（fileId=${fileId}）`);
  });

  UI.uploadStartBtn.addEventListener("click", async () => {
    const file = UI.uploadFile.files && UI.uploadFile.files[0];
    if (!file) {
      alert("请先选择文件");
      return;
    }
    if (uploadRunning) return;

    uploadPaused = false;
    uploadRunning = true;
    try {
      await resumeUpload(file);
    } finally {
      uploadRunning = false;
    }
  });

  async function resumeUpload(file) {
    const uploadMode = UI.uploadMode.value; // "mock" | "server"
    const chunkSize = Number(UI.chunkSize.value);
    if (!chunkSize || chunkSize < 262144) {
      alert("分片大小太小了");
      return;
    }

    const fileId = fileIdFromFile(file);
    const totalSize = file.size;
    const totalChunks = getTotalChunks(totalSize, chunkSize);

    const stateKeyStr = stateKey(UPLOAD_STATE_PREFIX, fileId);
    let state = loadJson(stateKeyStr, null);
    if (!state || state.totalChunks !== totalChunks || state.chunkSize !== chunkSize || state.totalSize !== totalSize) {
      state = {
        fileId,
        fileName: file.name,
        totalSize,
        chunkSize,
        totalChunks,
        uploaded: {}, // chunkIndex -> true
        updatedAt: Date.now(),
      };
      saveJson(stateKeyStr, state);
      logLine(`初始化上传状态：totalChunks=${totalChunks} chunkSize=${chunkSize}`);
    }

    // 计算已上传字节（用于断点续传进度展示）
    let uploadedBytes = 0;
    for (let i = 0; i < state.totalChunks; i++) {
      if (state.uploaded[i]) uploadedBytes += chunkRangeByIndex(i, state.chunkSize, state.totalSize).size;
    }

    UI.uploadStatus.textContent = `上传中：已上传 ${formatBytes(uploadedBytes)}/${formatBytes(state.totalSize)}`;
    setBar(UI.uploadBar, (uploadedBytes / state.totalSize) * 100);

    if (uploadMode === "mock") {
      // 写入 mock 的文件元信息（用于 mock 下载）
      await putMeta(fileId, {
        fileName: file.name,
        totalSize: state.totalSize,
        chunkSize: state.chunkSize,
        totalChunks: state.totalChunks,
        lastModified: file.lastModified,
      });
    }

    logLine(`开始上传/续传：mode=${uploadMode}, fileId=${fileId}`);
    for (let chunkIndex = 0; chunkIndex < state.totalChunks; chunkIndex++) {
      if (uploadPaused) break;
      if (state.uploaded[chunkIndex]) continue;

      const { start, endInclusive, size } = chunkRangeByIndex(chunkIndex, state.chunkSize, state.totalSize);
      logLine(`上传分片：#${chunkIndex + 1}/${state.totalChunks} bytes=[${start}-${endInclusive}] size=${formatBytes(size)}`);

      if (uploadMode === "mock") {
        const blob = file.slice(start, endInclusive + 1);
        await putChunk("upload", fileId, chunkIndex, blob);
      } else {
        // 服务器模式：示例接口约定（你可以按自己的后端调整前端字段/URL）
        const uploadUrl = UI.uploadChunkUrl.value.trim();
        if (!uploadUrl) throw new Error("请填写 uploadChunkUrl");

        uploadAbort = new AbortController();
        try {
          const fd = new FormData();
          fd.append("fileId", fileId);
          fd.append("fileName", file.name);
          fd.append("chunkIndex", String(chunkIndex));
          fd.append("start", String(start));
          fd.append("end", String(endInclusive));
          fd.append("totalSize", String(state.totalSize));
          fd.append("totalChunks", String(state.totalChunks));

          const chunkBlob = file.slice(start, endInclusive + 1);
          fd.append("chunk", chunkBlob, file.name + ".part");

          const res = await fetch(uploadUrl, {
            method: "POST",
            body: fd,
            signal: uploadAbort.signal,
          });
          if (!res.ok) throw new Error(`upload chunk failed: ${res.status}`);
        } catch (e) {
          // 暂停时 AbortController 会触发 AbortError；把它当作“正常暂停”
          if (e && e.name === "AbortError") {
            logLine("上传已暂停（server fetch 被中止）");
            break;
          }
          throw e;
        } finally {
          uploadAbort = null;
        }
      }

      state.uploaded[chunkIndex] = true;
      state.updatedAt = Date.now();
      saveJson(stateKeyStr, state);

      uploadedBytes += size;
      UI.uploadStatus.textContent = `上传中：已上传 ${formatBytes(uploadedBytes)}/${formatBytes(state.totalSize)}`;
      setBar(UI.uploadBar, (uploadedBytes / state.totalSize) * 100);
    }

    if (uploadPaused) {
      UI.uploadStatus.textContent = `已暂停：已上传 ${formatBytes(uploadedBytes)}/${formatBytes(state.totalSize)}`;
      logLine("上传已暂停（下次点击继续会从未完成分片继续）");
      return;
    }

    UI.uploadStatus.textContent = `上传完成：${formatBytes(state.totalSize)}`;
    setBar(UI.uploadBar, 100);
    logLine("上传完成。现在可以切到下载模块进行“下载续传”。");

    // 自动填入 fileId，方便下载
    UI.downloadFileId.value = fileId;
  }

  // ========== Download (mock/server) ==========
  let downloadAbort = null;
  let downloadPaused = false;
  let downloadRunning = false;

  UI.downloadPauseBtn.addEventListener("click", () => {
    downloadPaused = true;
    if (downloadAbort) downloadAbort.abort();
    logLine("已请求暂停下载（将尽快停止）");
  });

  UI.downloadClearBtn.addEventListener("click", async () => {
    downloadPaused = true;
    if (downloadAbort) downloadAbort.abort();
    const fileId = UI.downloadFileId.value.trim();
    if (!fileId) {
      removeKeyPrefix(DOWNLOAD_STATE_PREFIX);
      logLine("已清除 localStorage 下载续传状态");
      return;
    }

    localStorage.removeItem(stateKey(DOWNLOAD_STATE_PREFIX, fileId));
    UI.downloadBar.style.width = "0%";
    UI.downloadStatus.textContent = "已清除下载续传状态";
    UI.downloadSaveBtn.disabled = true;

    try {
      await deleteChunks("download", fileId);
    } catch (e) {
      logLine(`清理 download chunks 失败：${e?.message || e}`);
    }
    logLine(`已清除下载状态：fileId=${fileId}`);
  });

  UI.downloadSaveBtn.addEventListener("click", async () => {
    const fileId = UI.downloadFileId.value.trim();
    if (!fileId) return;

    const state = loadJson(stateKey(DOWNLOAD_STATE_PREFIX, fileId), null);
    if (!state || !state.done) {
      alert("下载未完成，无法保存");
      return;
    }

    UI.downloadSaveBtn.disabled = true;
    UI.downloadStatus.textContent = "正在拼装下载结果...";

    try {
      const blobs = [];
      for (let i = 0; i < state.totalChunks; i++) {
        const blob = await getChunk("download", fileId, i);
        if (!blob) throw new Error(`missing chunk ${i}`);
        blobs.push(blob);
      }
      const finalBlob = new Blob(blobs);
      const url = URL.createObjectURL(finalBlob);

      const meta = await getMeta(fileId);
      const fileName = meta?.fileName ? meta.fileName : `download_${Date.now()}`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      UI.downloadStatus.textContent = "保存完成（浏览器下载中）";
      logLine("保存下载结果完成");
    } catch (e) {
      UI.downloadStatus.textContent = "保存失败";
      logLine(`保存失败：${e?.message || e}`);
      UI.downloadSaveBtn.disabled = false;
    }
  });

  UI.downloadStartBtn.addEventListener("click", async () => {
    const fileId = UI.downloadFileId.value.trim();
    if (!fileId) {
      alert("请填写 fileId（mock 模式可在上传后自动生成）");
      return;
    }
    if (downloadRunning) return;

    downloadPaused = false;
    downloadRunning = true;
    try {
      await resumeDownload(fileId);
    } finally {
      downloadRunning = false;
    }
  });

  async function resumeDownload(fileId) {
    const downloadMode = UI.downloadMode.value; // "mock" | "server"
    const chunkSize = Number(UI.downloadChunkSize.value);
    if (!chunkSize || chunkSize < 262144) {
      alert("分片大小太小了");
      return;
    }

    let totalSize = Number(UI.downloadFileSize.value || 0);
    let fileName = "";

    if (downloadMode === "mock") {
      const meta = await getMeta(fileId);
      if (!meta) {
        alert("mock 模式下找不到该 fileId 的已上传内容（请先完成 mock 上传）。");
        return;
      }
      fileName = meta.fileName || "";
      totalSize = meta.totalSize;
      // 为了保证 mock 分片可复用，这里强制把下载分片大小对齐到上传分片大小
      if (meta.chunkSize && meta.chunkSize !== chunkSize) {
        logLine(`mock 下载：检测到上传 chunkSize=${meta.chunkSize}，将自动调整当前 chunkSize。`);
        UI.downloadChunkSize.value = String(meta.chunkSize);
      }
    } else {
      const urlTemplate = UI.downloadUrlTemplate.value.trim();
      if (!urlTemplate) throw new Error("请填写 downloadUrlTemplate");
      fileName = fileName || `download_${fileId.slice(0, 10)}`;
      if (!totalSize) {
        // 尝试 HEAD 获取长度（如果失败需要你手填）
        try {
          const u = buildDownloadUrl(urlTemplate, fileId);
          totalSize = await headContentLength(u);
          UI.downloadFileSize.value = String(totalSize);
        } catch (e) {
          throw new Error(`无法从 server 获取文件大小，请在 UI 中填写 downloadFileSize。错误：${e?.message || e}`);
        }
      }
    }

    const effectiveChunkSize = downloadMode === "mock" ? (await getMeta(fileId))?.chunkSize || chunkSize : chunkSize;
    const totalChunks = getTotalChunks(totalSize, effectiveChunkSize);

    const dStateKey = stateKey(DOWNLOAD_STATE_PREFIX, fileId);
    let state = loadJson(dStateKey, null);
    if (!state || state.totalChunks !== totalChunks || state.chunkSize !== effectiveChunkSize || state.totalSize !== totalSize) {
      state = {
        fileId,
        fileName,
        totalSize,
        chunkSize: effectiveChunkSize,
        totalChunks,
        downloaded: {},
        done: false,
        updatedAt: Date.now(),
      };
      saveJson(dStateKey, state);
    }

    // 进度初始化
    let downloadedBytes = 0;
    for (let i = 0; i < state.totalChunks; i++) {
      if (state.downloaded[i]) downloadedBytes += chunkRangeByIndex(i, state.chunkSize, state.totalSize).size;
    }

    UI.downloadSaveBtn.disabled = true;
    setBar(UI.downloadBar, (downloadedBytes / state.totalSize) * 100);
    UI.downloadStatus.textContent = `下载中：已下载 ${formatBytes(downloadedBytes)}/${formatBytes(state.totalSize)}`;

    logLine(`开始下载/续传：mode=${downloadMode}, fileId=${fileId}, totalChunks=${state.totalChunks}`);

    for (let chunkIndex = 0; chunkIndex < state.totalChunks; chunkIndex++) {
      if (downloadPaused) break;
      if (state.downloaded[chunkIndex]) continue;

      const { start, endInclusive, size } = chunkRangeByIndex(chunkIndex, state.chunkSize, state.totalSize);
      logLine(`下载分片：#${chunkIndex + 1}/${state.totalChunks} bytes=[${start}-${endInclusive}] size=${formatBytes(size)}`);

      if (downloadMode === "mock") {
        const blob = await getChunk("upload", fileId, chunkIndex);
        if (!blob) throw new Error(`mock chunk missing: ${chunkIndex}`);
        await putChunk("download", fileId, chunkIndex, blob);
      } else {
        // server 模式：按 Range 下载
        const urlTemplate = UI.downloadUrlTemplate.value.trim();
        const url = buildDownloadUrl(urlTemplate, fileId);
        downloadAbort = new AbortController();
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: { Range: `bytes=${start}-${endInclusive}` },
            signal: downloadAbort.signal,
          });

          if (!(res.status === 206 || res.status === 200)) {
            throw new Error(`Range request failed: status=${res.status}`);
          }

          // 理想情况：206 Partial Content 返回正好是 requested range
          // 如果后端错误返回 200（整文件），则这里会截取 requested 部分。
          let blob = await res.blob();
          if (res.status === 200 && blob.size !== size) {
            // 粗暴截取：用于 demo
            const wholeArray = new Uint8Array(await blob.arrayBuffer());
            const slice = wholeArray.slice(0); // noop to keep readable
            const part = slice.slice(0, size);
            blob = new Blob([part]);
            logLine("server 返回了 200（整文件）。这里做了简化处理（demo）。");
          }

          await putChunk("download", fileId, chunkIndex, blob);
        } catch (e) {
          // 暂停时 AbortController 会触发 AbortError；把它当作“正常暂停”
          if (e && e.name === "AbortError") {
            logLine("下载已暂停（server fetch 被中止）");
            break;
          }
          throw e;
        } finally {
          downloadAbort = null;
        }
      }

      state.downloaded[chunkIndex] = true;
      state.updatedAt = Date.now();
      saveJson(dStateKey, state);

      downloadedBytes += size;
      setBar(UI.downloadBar, (downloadedBytes / state.totalSize) * 100);
      UI.downloadStatus.textContent = `下载中：已下载 ${formatBytes(downloadedBytes)}/${formatBytes(state.totalSize)}`;
    }

    if (downloadPaused) {
      UI.downloadStatus.textContent = `已暂停：已下载 ${formatBytes(downloadedBytes)}/${formatBytes(state.totalSize)}`;
      logLine("下载已暂停（下次点击继续会从未完成分片继续）");
      return;
    }

    const isDone = Object.keys(state.downloaded).length >= state.totalChunks;
    if (!isDone) {
      logLine("下载循环结束，但未确认全部分片都存在（可能是中途异常/暂停）。");
    }

    state.done = true;
    state.updatedAt = Date.now();
    saveJson(dStateKey, state);

    UI.downloadBar.style.width = "100%";
    UI.downloadStatus.textContent = `下载完成：${formatBytes(state.totalSize)}`;
    UI.downloadSaveBtn.disabled = false;
    logLine("下载完成。可以点击“保存下载结果为文件”。");
  }

  // 初始化 UI 状态
  UI.uploadBar.style.width = "0%";
  UI.downloadBar.style.width = "0%";
  UI.uploadStatus.textContent = "未开始";
  UI.downloadStatus.textContent = "未开始";
})();

