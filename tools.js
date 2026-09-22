/* Browser-only utilities. Files are processed locally and never uploaded. */
(function () {
  "use strict";

  var state = { files: [], images: [] };
  var tool = document.body.dataset.tool;
  var input = document.getElementById("file-input");
  var dropzone = document.getElementById("dropzone");
  var status = document.getElementById("tool-status");
  var output = document.getElementById("tool-output");

  function setStatus(message, error) {
    if (!status) return;
    status.textContent = message;
    status.className = "tool-status" + (error ? " is-error" : "");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  }

  function extension(type) {
    return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  }

  function readImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type.match(/^image\//)) {
        reject(new Error("Please choose a JPG, PNG, WebP, GIF or other image file."));
        return;
      }
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("This image could not be opened by your browser."));
      };
      image.src = url;
    });
  }

  function canvasFor(image, width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    var context = canvas.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function download(blob, filename) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function clearResults() {
    if (!output) return;
    output.innerHTML = "";
    output.classList.remove("has-result");
  }

  function renderResults(results) {
    output.innerHTML = "";
    var summary = document.createElement("div");
    summary.className = "tool-result-summary";
    var heading = document.createElement("strong");
    heading.textContent = results.length + " file" + (results.length === 1 ? "" : "s") + " ready";
    var count = document.createElement("span");
    count.className = "tool-file-count";
    count.textContent = "Processed on this device";
    summary.appendChild(heading);
    summary.appendChild(count);
    output.appendChild(summary);

    results.forEach(function (result, index) {
      var card = document.createElement("div");
      card.className = "tool-result-card";
      card.style.animationDelay = (index * 60) + "ms";
      if (result.imageUrl) {
        var preview = document.createElement("img");
        preview.src = result.imageUrl;
        preview.alt = "Processed preview for " + result.filename;
        preview.className = "tool-preview";
        card.appendChild(preview);
      } else {
        card.appendChild(document.createElement("div"));
      }
      var details = document.createElement("div");
      details.className = "tool-result-details";
      var name = document.createElement("strong");
      name.textContent = result.filename;
      var note = document.createElement("span");
      note.textContent = result.note + " · " + formatBytes(result.blob.size);
      details.appendChild(name);
      details.appendChild(note);
      card.appendChild(details);
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn";
      button.textContent = "Download";
      button.addEventListener("click", function () { download(result.blob, result.filename); });
      card.appendChild(button);
      output.appendChild(card);
    });
    output.classList.add("has-result");
  }

  function imageBlob(image, type, quality, width, height) {
    var canvas = canvasFor(image, width || image.naturalWidth, height || image.naturalHeight);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("The browser could not create an output image."));
          return;
        }
        resolve({ blob: blob, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
      }, type, quality);
    });
  }

  function selectedType() {
    var select = document.getElementById("output-format");
    return select ? select.value : "image/jpeg";
  }

  function renderSelectedFiles() {
    var list = document.getElementById("selected-files");
    if (!list) return;
    list.innerHTML = "";
    state.files.forEach(function (file) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = file.name;
      var size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      item.appendChild(name);
      item.appendChild(size);
      list.appendChild(item);
    });
  }

  function readFiles(files) {
    state.files = files.filter(function (file) { return file.type.match(/^image\//); });
    state.images = [];
    clearResults();
    if (!state.files.length) {
      setStatus("Choose one or more image files.", true);
      return;
    }
    setStatus("Reading " + state.files.length + " image" + (state.files.length === 1 ? "" : "s") + " locally…");
    Promise.all(state.files.map(readImage)).then(function (images) {
      state.images = images;
      var width = document.getElementById("image-width");
      var height = document.getElementById("image-height");
      if (width && height && images[0]) {
        width.value = images[0].naturalWidth;
        height.value = images[0].naturalHeight;
        width.dataset.ratio = images[0].naturalWidth / images[0].naturalHeight;
      }
      renderSelectedFiles();
      var action = document.getElementById("process-button");
      if (action) action.disabled = false;
      setStatus(state.files.length + " image" + (state.files.length === 1 ? "" : "s") + " ready to process.");
    }).catch(function (error) { setStatus(error.message, true); });
  }

  function processFiles() {
    if (!state.images.length) {
      setStatus("Choose one or more images first.", true);
      return;
    }
    var width = state.images[0].naturalWidth;
    var height = state.images[0].naturalHeight;
    if (tool === "resizer") {
      width = Number(document.getElementById("image-width").value);
      height = Number(document.getElementById("image-height").value);
      if (!width || !height || width > 10000 || height > 10000) {
        setStatus("Enter width and height between 1 and 10,000 pixels.", true);
        return;
      }
    }
    var qualityInput = document.getElementById("quality");
    var quality = qualityInput ? Number(qualityInput.value) / 100 : 0.88;
    var type = selectedType();
    setStatus("Processing " + state.files.length + " image" + (state.files.length === 1 ? "" : "s") + "…");
    Promise.all(state.images.map(function (image, index) {
      return imageBlob(image, type, quality, width, height).then(function (result) {
        var name = (state.files[index].name.replace(/\.[^.]+$/, "") || "image") + "-processed." + extension(type);
        var change = type === "image/jpeg" || type === "image/webp" ? "Original " + formatBytes(state.files[index].size) : "Converted from " + formatBytes(state.files[index].size);
        return { blob: result.blob, imageUrl: result.url, filename: name, note: result.width + " × " + result.height + " px · " + change };
      });
    })).then(function (results) {
      renderResults(results);
      setStatus("Done. Your files stayed on this device.");
    }).catch(function () { setStatus("The images could not be processed. Try smaller files.", true); });
  }

  function renderPdfFiles() {
    var list = document.getElementById("file-list");
    if (!list) return;
    list.innerHTML = "";
    state.files.forEach(function (file, index) {
      var item = document.createElement("li");
      item.draggable = true;
      item.dataset.index = index;
      var name = document.createElement("span");
      name.textContent = (index + 1) + ". " + file.name;
      var size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      item.appendChild(name);
      item.appendChild(size);
      item.addEventListener("dragstart", function () { item.classList.add("is-dragging"); });
      item.addEventListener("dragend", function () { item.classList.remove("is-dragging"); });
      item.addEventListener("dragover", function (event) { event.preventDefault(); });
      item.addEventListener("drop", function (event) {
        event.preventDefault();
        var dragged = document.querySelector(".file-list .is-dragging");
        if (!dragged) return;
        var from = Number(dragged.dataset.index);
        var to = Number(item.dataset.index);
        var moved = state.files.splice(from, 1)[0];
        state.files.splice(to, 0, moved);
        renderPdfFiles();
      });
      list.appendChild(item);
    });
  }

  function loadPdfImages(files) {
    state.files = files.filter(function (file) { return file.type.match(/^image\//); });
    clearResults();
    if (!state.files.length) {
      setStatus("Choose one or more image files.", true);
      return;
    }
    renderPdfFiles();
    document.getElementById("pdf-process-button").disabled = false;
    setStatus(state.files.length + " image" + (state.files.length === 1 ? "" : "s") + " ready. Drag to reorder.");
  }

  function setupDropzone() {
    if (!input || !dropzone) return;
    input.addEventListener("change", function () {
      var files = Array.from(input.files);
      if (tool === "image-to-pdf") loadPdfImages(files);
      else readFiles(files);
    });
    ["dragenter", "dragover"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (eventName) {
      dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    });
    dropzone.addEventListener("drop", function (event) {
      var files = Array.from(event.dataTransfer.files);
      if (tool === "image-to-pdf") loadPdfImages(files);
      else readFiles(files);
    });
  }

  function setupSingle() {
    var action = document.getElementById("process-button");
    if (action) action.addEventListener("click", processFiles);
    var width = document.getElementById("image-width");
    var height = document.getElementById("image-height");
    var lock = document.getElementById("lock-ratio");
    if (width && height) {
      width.addEventListener("input", function () {
        if (lock.checked && width.dataset.ratio) height.value = Math.round(Number(width.value) / Number(width.dataset.ratio));
      });
      height.addEventListener("input", function () {
        if (lock.checked && width.dataset.ratio) width.value = Math.round(Number(height.value) * Number(width.dataset.ratio));
      });
    }
    var quality = document.getElementById("quality");
    var qualityValue = document.getElementById("quality-value");
    if (quality && qualityValue) quality.addEventListener("input", function () { qualityValue.textContent = quality.value + "%"; });
  }

  function jpegBytes(blob) {
    return blob.arrayBuffer().then(function (buffer) { return new Uint8Array(buffer); });
  }

  function buildPdf(images) {
    var objects = [];
    var pageRefs = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push(null);
    images.forEach(function (image, index) {
      var pageNumber = 3 + index * 3;
      var contentNumber = pageNumber + 1;
      var imageNumber = pageNumber + 2;
      var maxWidth = 595, maxHeight = 842;
      var scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      var width = Math.round(image.width * scale);
      var height = Math.round(image.height * scale);
      pageRefs.push(pageNumber + " 0 R");
      objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + width + " " + height + "] /Resources << /XObject << /Im" + index + " " + imageNumber + " 0 R >> >> /Contents " + contentNumber + " 0 R >>");
      var stream = "q\n" + width + " 0 0 " + height + " 0 0 cm\n/Im" + index + " Do\nQ\n";
      objects.push("<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream");
      objects.push({ image: image.bytes, header: "<< /Type /XObject /Subtype /Image /Width " + image.width + " /Height " + image.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + image.bytes.length + " >>\nstream\n", footer: "\nendstream" });
    });
    objects[1] = "<< /Type /Pages /Kids [" + pageRefs.join(" ") + "] /Count " + images.length + " >>";
    var chunks = [new TextEncoder().encode("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n")];
    var offsets = [0];
    var position = chunks[0].length;
    objects.forEach(function (object, index) {
      offsets[index + 1] = position;
      var prefix = new TextEncoder().encode((index + 1) + " 0 obj\n");
      chunks.push(prefix);
      position += prefix.length;
      if (typeof object === "string") {
        var bytes = new TextEncoder().encode(object + "\nendobj\n");
        chunks.push(bytes);
        position += bytes.length;
      } else {
        var header = new TextEncoder().encode(object.header);
        var footer = new TextEncoder().encode(object.footer + "\nendobj\n");
        chunks.push(header, object.image, footer);
        position += header.length + object.image.length + footer.length;
      }
    });
    var xrefOffset = position;
    var xref = "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
    for (var i = 1; i <= objects.length; i++) xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    xref += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF";
    chunks.push(new TextEncoder().encode(xref));
    return new Blob(chunks, { type: "application/pdf" });
  }

  function createPdf() {
    if (!state.files.length) return;
    setStatus("Building your PDF in the browser…");
    Promise.all(state.files.map(function (file) {
      return readImage(file).then(function (image) {
        return imageBlob(image, "image/jpeg", 0.92).then(function (result) {
          return jpegBytes(result.blob).then(function (bytes) {
            return { bytes: bytes, width: result.width, height: result.height };
          });
        });
      });
    })).then(function (images) {
      var blob = buildPdf(images);
      renderResults([{ blob: blob, filename: "images.pdf", note: images.length + " page" + (images.length === 1 ? "" : "s") }]);
      setStatus("Done. Your files stayed on this device.");
    }).catch(function () { setStatus("The PDF could not be created. Try fewer or smaller images.", true); });
  }

  setupDropzone();
  if (tool === "image-to-pdf") {
    var pdfButton = document.getElementById("pdf-process-button");
    if (pdfButton) pdfButton.addEventListener("click", createPdf);
  } else {
    setupSingle();
  }
}());
