/* Browser-only PDF, QR, JSON and text utilities. Nothing is uploaded. */
(function () {
  "use strict";

  var tool = document.body.dataset.tool;
  var status = document.getElementById("tool-status");

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

  function download(blob, filename) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function showResult(result) {
    var output = document.getElementById("tool-output");
    if (!output) return;
    output.innerHTML = "";
    var card = document.createElement("div");
    card.className = "tool-result-card";
    card.style.gridTemplateColumns = "1fr auto";
    var details = document.createElement("div");
    details.className = "tool-result-details";
    var name = document.createElement("strong");
    name.textContent = result.filename;
    var note = document.createElement("span");
    note.textContent = result.note + " · " + formatBytes(result.blob.size);
    details.appendChild(name);
    details.appendChild(note);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = "Download";
    button.addEventListener("click", function () { download(result.blob, result.filename); });
    card.appendChild(details);
    card.appendChild(button);
    output.appendChild(card);
    output.classList.add("has-result");
  }

  function clearOutput() {
    var output = document.getElementById("tool-output");
    if (output) {
      output.innerHTML = "";
      output.classList.remove("has-result");
    }
  }

  function requirePdfLib() {
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      throw new Error("The PDF library could not load. Refresh the page and try again.");
    }
    return window.PDFLib.PDFDocument;
  }

  function renderFiles(files, listId) {
    var list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = "";
    files.forEach(function (file, index) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      name.textContent = (index + 1) + ". " + file.name;
      var size = document.createElement("span");
      size.textContent = formatBytes(file.size);
      item.appendChild(name);
      item.appendChild(size);
      list.appendChild(item);
    });
  }

  function setupFileInput(inputId, listId, buttonId, multiple, callback) {
    var input = document.getElementById(inputId);
    var button = document.getElementById(buttonId);
    if (!input || !button) return;
    input.addEventListener("change", function () {
      var files = Array.from(input.files).filter(function (file) {
        return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      });
      renderFiles(files, listId);
      button.disabled = !files.length;
      clearOutput();
      callback(files, button);
    });
    var dropzone = document.querySelector("label[for='" + inputId + "']");
    if (dropzone) {
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
        var files = Array.from(event.dataTransfer.files).filter(function (file) {
          return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        });
        renderFiles(files, listId);
        button.disabled = !files.length;
        clearOutput();
        callback(files, button);
      });
    }
  }

  function setupMerge() {
    var files = [];
    setupFileInput("pdf-file-input", "selected-files", "process-button", true, function (selected) {
      files = selected;
      setStatus(files.length ? files.length + " PDF" + (files.length === 1 ? "" : "s") + " ready to merge." : "Choose PDF files.", !files.length);
    });
    var button = document.getElementById("process-button");
    if (!button) return;
    button.addEventListener("click", async function () {
      if (!files.length) return;
      button.disabled = true;
      setStatus("Merging your PDFs in the browser…");
      try {
        var PDFDocument = requirePdfLib();
        var merged = await PDFDocument.create();
        for (var i = 0; i < files.length; i++) {
          var source = await PDFDocument.load(await files[i].arrayBuffer());
          var pages = await merged.copyPages(source, source.getPageIndices());
          pages.forEach(function (page) { merged.addPage(page); });
        }
        var bytes = await merged.save({ useObjectStreams: true });
        showResult({ blob: new Blob([bytes], { type: "application/pdf" }), filename: "merged.pdf", note: merged.getPageCount() + " pages combined" });
        setStatus("Done. The merged PDF was created locally.");
      } catch (error) {
        setStatus(error.message || "The PDFs could not be merged.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function parsePageRanges(value, count) {
    var pages = [];
    value.split(",").forEach(function (part) {
      var range = part.trim();
      if (!range) return;
      var pieces = range.split("-");
      var start = Number(pieces[0]);
      var end = pieces.length > 1 ? Number(pieces[1]) : start;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > count) {
        throw new Error("Use page numbers between 1 and " + count + ", such as 1-3,5.");
      }
      for (var page = start; page <= end; page++) {
        if (pages.indexOf(page) === -1) pages.push(page);
      }
    });
    if (!pages.length) throw new Error("Enter at least one page number.");
    return pages;
  }

  function setupSplit() {
    var files = [];
    setupFileInput("pdf-file-input", "selected-files", "process-button", false, function (selected) {
      files = selected.slice(0, 1);
      if (!files.length) {
        setStatus("Choose one PDF file.", true);
        return;
      }
      files[0].arrayBuffer().then(function (buffer) {
        return requirePdfLib().load(buffer);
      }).then(function (pdf) {
        document.getElementById("page-count").textContent = pdf.getPageCount() + " pages available";
        setStatus("PDF ready. Choose the pages to extract.");
      }).catch(function () { setStatus("This PDF could not be opened.", true); });
    });
    var button = document.getElementById("process-button");
    if (!button) return;
    button.addEventListener("click", async function () {
      if (!files.length) return;
      button.disabled = true;
      try {
        var PDFDocument = requirePdfLib();
        var source = await PDFDocument.load(await files[0].arrayBuffer());
        var selectedPages = parsePageRanges(document.getElementById("page-range").value, source.getPageCount());
        var output = await PDFDocument.create();
        var copied = await output.copyPages(source, selectedPages.map(function (page) { return page - 1; }));
        copied.forEach(function (page) { output.addPage(page); });
        var bytes = await output.save({ useObjectStreams: true });
        showResult({ blob: new Blob([bytes], { type: "application/pdf" }), filename: files[0].name.replace(/\.pdf$/i, "") + "-split.pdf", note: selectedPages.length + " page" + (selectedPages.length === 1 ? "" : "s") + " extracted" });
        setStatus("Done. The selected pages were saved locally.");
      } catch (error) {
        setStatus(error.message || "The PDF could not be split.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupCompressPdf() {
    var files = [];
    setupFileInput("pdf-file-input", "selected-files", "process-button", false, function (selected) {
      files = selected.slice(0, 1);
      setStatus(files.length ? "PDF ready to optimize locally." : "Choose one PDF file.", !files.length);
    });
    var button = document.getElementById("process-button");
    if (!button) return;
    button.addEventListener("click", async function () {
      if (!files.length) return;
      button.disabled = true;
      setStatus("Optimizing the PDF in the browser…");
      try {
        var PDFDocument = requirePdfLib();
        var originalSize = files[0].size;
        var pdf = await PDFDocument.load(await files[0].arrayBuffer());
        var bytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
        var blob = new Blob([bytes], { type: "application/pdf" });
        var change = blob.size < originalSize ? formatBytes(originalSize - blob.size) + " smaller" : "saved with optimized object streams";
        showResult({ blob: blob, filename: files[0].name.replace(/\.pdf$/i, "") + "-optimized.pdf", note: formatBytes(originalSize) + " → " + formatBytes(blob.size) + " · " + change });
        setStatus("Done. The optimized PDF was created locally.");
      } catch (error) {
        setStatus(error.message || "The PDF could not be optimized.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupOrganizer() {
    var input = document.getElementById("pdf-file-input");
    var button = document.getElementById("process-button");
    var list = document.getElementById("organizer-pages");
    var files = [];
    var source = null;
    var pageOrder = [];
    if (!input || !button || !list) return;

    function renderPages() {
      list.innerHTML = "";
      pageOrder.forEach(function (page, position) {
        var item = document.createElement("li");
        item.className = "organizer-page";
        var title = document.createElement("strong");
        title.textContent = "Page " + (page.index + 1);
        var note = document.createElement("span");
        note.textContent = "Output page " + (position + 1) + " · rotated " + page.rotation + "°";
        var actions = document.createElement("div");
        actions.className = "organizer-actions";
        [["up", "Up"], ["down", "Down"], ["left", "Rotate left"], ["right", "Rotate right"], ["delete", "Delete"]].forEach(function (entry) {
          var action = document.createElement("button");
          action.type = "button";
          action.className = "btn btn-out";
          action.dataset.action = entry[0];
          action.dataset.position = position;
          action.textContent = entry[1];
          actions.appendChild(action);
        });
        item.appendChild(title);
        item.appendChild(note);
        item.appendChild(actions);
        list.appendChild(item);
      });
      button.disabled = !source || !pageOrder.length;
    }

    async function loadFile(selected) {
      files = selected.slice(0, 1);
      source = null;
      pageOrder = [];
      renderPages();
      if (!files.length) {
        setStatus("Choose one PDF file.", true);
        return;
      }
      try {
        var PDFDocument = requirePdfLib();
        source = await PDFDocument.load(await files[0].arrayBuffer());
        pageOrder = source.getPageIndices().map(function (index) {
          return { index: index, rotation: 0 };
        });
        renderPages();
        setStatus(source.getPageCount() + " pages ready. Reorder, rotate or delete pages.");
      } catch (error) {
        setStatus("This PDF could not be opened.", true);
      }
    }

    input.addEventListener("change", function () {
      var selected = Array.from(input.files).filter(function (file) {
        return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      });
      renderFiles(selected, "selected-files");
      loadFile(selected);
    });
    var dropzone = document.querySelector("label[for='pdf-file-input']");
    if (dropzone) {
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
        var selected = Array.from(event.dataTransfer.files).filter(function (file) {
          return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        });
        renderFiles(selected, "selected-files");
        loadFile(selected);
      });
    }
    list.addEventListener("click", function (event) {
      var action = event.target.dataset.action;
      if (!action) return;
      var position = Number(event.target.dataset.position);
      var item = pageOrder[position];
      if (action === "up" && position > 0) {
        pageOrder[position] = pageOrder[position - 1];
        pageOrder[position - 1] = item;
      } else if (action === "down" && position < pageOrder.length - 1) {
        pageOrder[position] = pageOrder[position + 1];
        pageOrder[position + 1] = item;
      } else if (action === "left" || action === "right") {
        item.rotation = (item.rotation + (action === "right" ? 90 : 270)) % 360;
      } else if (action === "delete") {
        pageOrder.splice(position, 1);
      }
      renderPages();
    });
    button.addEventListener("click", async function () {
      if (!source || !pageOrder.length) return;
      button.disabled = true;
      setStatus("Rebuilding your organized PDF locally…");
      try {
        var PDFDocument = requirePdfLib();
        var output = await PDFDocument.create();
        for (var i = 0; i < pageOrder.length; i++) {
          var copied = await output.copyPages(source, [pageOrder[i].index]);
          copied[0].setRotation(PDFLib.degrees(pageOrder[i].rotation));
          output.addPage(copied[0]);
        }
        var bytes = await output.save({ useObjectStreams: true });
        showResult({ blob: new Blob([bytes], { type: "application/pdf" }), filename: files[0].name.replace(/\.pdf$/i, "") + "-organized.pdf", note: pageOrder.length + " page" + (pageOrder.length === 1 ? "" : "s") + " arranged" });
        setStatus("Done. The organized PDF was created locally.");
      } catch (error) {
        setStatus(error.message || "The PDF could not be organized.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupWatermark() {
    var files = [];
    setupFileInput("pdf-file-input", "selected-files", "process-button", false, function (selected) {
      files = selected.slice(0, 1);
      setStatus(files.length ? "PDF ready. Choose a watermark." : "Choose one PDF file.", !files.length);
    });
    var button = document.getElementById("process-button");
    if (!button) return;
    button.addEventListener("click", async function () {
      if (!files.length) return;
      var text = document.getElementById("watermark-text").value.trim();
      if (!text) {
        setStatus("Enter watermark text first.", true);
        return;
      }
      button.disabled = true;
      setStatus("Adding the watermark in your browser…");
      try {
        var PDFDocument = requirePdfLib();
        var pdf = await PDFDocument.load(await files[0].arrayBuffer());
        var font = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
        var size = Number(document.getElementById("watermark-size").value);
        var opacityValue = Number(document.getElementById("watermark-opacity").value) / 100;
        pdf.getPages().forEach(function (page) {
          var width = page.getWidth();
          var height = page.getHeight();
          var textWidth = font.widthOfTextAtSize(text, size);
          page.drawText(text, {
            x: Math.max(20, (width - textWidth) / 2),
            y: Math.max(20, height / 2),
            size: size,
            font: font,
            color: PDFLib.rgb(0.45, 0.45, 0.45),
            opacity: opacityValue,
            rotate: PDFLib.degrees(45)
          });
        });
        var bytes = await pdf.save({ useObjectStreams: true });
        showResult({ blob: new Blob([bytes], { type: "application/pdf" }), filename: files[0].name.replace(/\.pdf$/i, "") + "-watermarked.pdf", note: pdf.getPageCount() + " pages stamped" });
        setStatus("Done. The watermark was added locally.");
      } catch (error) {
        setStatus(error.message || "The watermark could not be added.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupPageNumbers() {
    var files = [];
    setupFileInput("pdf-file-input", "selected-files", "process-button", false, function (selected) {
      files = selected.slice(0, 1);
      setStatus(files.length ? "PDF ready. Choose a numbering style." : "Choose one PDF file.", !files.length);
    });
    var button = document.getElementById("process-button");
    if (!button) return;
    button.addEventListener("click", async function () {
      if (!files.length) return;
      button.disabled = true;
      setStatus("Adding page numbers in your browser…");
      try {
        var PDFDocument = requirePdfLib();
        var pdf = await PDFDocument.load(await files[0].arrayBuffer());
        var font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
        var start = Math.max(1, Number(document.getElementById("page-start").value) || 1);
        var style = document.getElementById("page-style").value;
        pdf.getPages().forEach(function (page, index) {
          var number = start + index;
          var label = style === "of" ? "Page " + number + " of " + (start + pdf.getPageCount() - 1) : String(number);
          var size = 10;
          var width = page.getWidth();
          var textWidth = font.widthOfTextAtSize(label, size);
          page.drawText(label, {
            x: (width - textWidth) / 2,
            y: 18,
            size: size,
            font: font,
            color: PDFLib.rgb(0.25, 0.25, 0.25)
          });
        });
        var bytes = await pdf.save({ useObjectStreams: true });
        showResult({ blob: new Blob([bytes], { type: "application/pdf" }), filename: files[0].name.replace(/\.pdf$/i, "") + "-numbered.pdf", note: pdf.getPageCount() + " pages numbered" });
        setStatus("Done. Page numbers were added locally.");
      } catch (error) {
        setStatus(error.message || "Page numbers could not be added.", true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupExtractText() {
    var input = document.getElementById("pdf-file-input");
    var button = document.getElementById("extract-text-button");
    var ocrButton = document.getElementById("run-ocr-button");
    var result = document.getElementById("text-result");
    var files = [];
    var pdf = null;
    var pages = [];
    if (!input || !button || !result || !window.pdfjsLib) return;

    function setResult(text) {
      result.textContent = text || "No selectable text was found. This PDF may contain scanned images.";
      result.classList.add("is-ready");
    }

    async function loadDocument(selected) {
      files = selected.slice(0, 1);
      pages = [];
      pdf = null;
      button.disabled = true;
      ocrButton.disabled = true;
      result.textContent = "Extracted text will appear here.";
      result.classList.remove("is-ready");
      if (!files.length) {
        setStatus("Choose one PDF file.", true);
        return;
      }
      try {
        setStatus("Reading the PDF text layer locally…");
        pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await files[0].arrayBuffer()) }).promise;
        for (var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          var page = await pdf.getPage(pageNumber);
          var content = await page.getTextContent();
          var text = content.items.map(function (item) { return item.str; }).join(" ").replace(/\s+/g, " ").trim();
          pages.push({ number: pageNumber, text: text });
        }
        var extracted = pages.filter(function (page) { return page.text; }).map(function (page) {
          return "[Page " + page.number + "]\n" + page.text;
        }).join("\n\n");
        setResult(extracted);
        var scanned = pages.filter(function (page) { return !page.text; }).length;
        if (scanned) {
          ocrButton.disabled = false;
          setStatus("Text extracted. " + scanned + " page" + (scanned === 1 ? "" : "s") + " appear to be scanned; OCR is available.");
        } else {
          setStatus("Text extracted from all " + pages.length + " page" + (pages.length === 1 ? "" : "s") + ".");
        }
        button.disabled = false;
      } catch (error) {
        setStatus("This PDF could not be read. Try another file.", true);
      } finally {
        if (!pdf) button.disabled = true;
      }
    }

    input.addEventListener("change", function () {
      var selected = Array.from(input.files).filter(function (file) {
        return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      });
      renderFiles(selected, "selected-files");
      loadDocument(selected);
    });
    var dropzone = document.querySelector("label[for='pdf-file-input']");
    if (dropzone) {
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
        var selected = Array.from(event.dataTransfer.files).filter(function (file) {
          return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        });
        renderFiles(selected, "selected-files");
        loadDocument(selected);
      });
    }
    button.addEventListener("click", function () {
      if (!result.classList.contains("is-ready")) return;
      download(new Blob([result.textContent], { type: "text/plain;charset=utf-8" }), "extracted-text.txt");
      setStatus("Text downloaded locally.");
    });
    ocrButton.addEventListener("click", async function () {
      if (!pdf || !window.Tesseract) {
        setStatus("OCR could not load. Refresh the page and try again.", true);
        return;
      }
      ocrButton.disabled = true;
      button.disabled = true;
      try {
        var scanned = pages.filter(function (page) { return !page.text; });
        var worker = await window.Tesseract.createWorker("eng");
        var ocrText = [];
        for (var i = 0; i < scanned.length; i++) {
          setStatus("Running local OCR on page " + scanned[i].number + " of " + pdf.numPages + "…");
          var pdfPage = await pdf.getPage(scanned[i].number);
          var viewport = pdfPage.getViewport({ scale: 1.8 });
          var canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise;
          var recognition = await worker.recognize(canvas);
          ocrText.push("[Page " + scanned[i].number + " · OCR]\n" + recognition.data.text.trim());
        }
        await worker.terminate();
        var directText = pages.filter(function (page) { return page.text; }).map(function (page) {
          return "[Page " + page.number + "]\n" + page.text;
        });
        setResult(directText.concat(ocrText).join("\n\n"));
        setStatus("Done. Direct text and OCR results were combined locally.");
      } catch (error) {
        setStatus("OCR could not finish. Try fewer or lower-resolution pages.", true);
      } finally {
        ocrButton.disabled = false;
        button.disabled = false;
      }
    });
  }

  function setupQr() {
    var input = document.getElementById("qr-text");
    var sizeInput = document.getElementById("qr-size");
    var button = document.getElementById("generate-qr");
    var output = document.getElementById("qr-output");
    if (!input || !button || !output) return;
    button.addEventListener("click", async function () {
      var text = input.value.trim();
      if (!text) {
        setStatus("Enter a link or message first.", true);
        return;
      }
      if (typeof window.qrcode !== "function") {
        setStatus("The QR library could not load. Refresh the page and try again.", true);
        return;
      }
      try {
        var qr = window.qrcode(0, "M");
        qr.addData(text);
        qr.make();
        var dataUrl = qr.createDataURL(8, 12);
        var image = document.createElement("img");
        image.src = dataUrl;
        image.alt = "Generated QR code";
        image.width = Number(sizeInput.value) || 320;
        image.height = image.width;
        output.innerHTML = "";
        output.appendChild(image);
        var downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "btn";
        downloadButton.textContent = "Download PNG";
        downloadButton.addEventListener("click", function () {
          fetch(dataUrl).then(function (response) { return response.blob(); }).then(function (blob) { download(blob, "qr-code.png"); });
        });
        output.appendChild(downloadButton);
        output.classList.add("has-result");
        setStatus("Done. Your QR code was generated locally.");
      } catch (error) {
        setStatus("This text is too long for a QR code. Try a shorter message.", true);
      }
    });
  }

  function setupJson() {
    var input = document.getElementById("json-input");
    var result = document.getElementById("json-result");
    var indent = document.getElementById("json-indent");
    if (!input || !result) return;
    function transform(minify) {
      try {
        var value = JSON.parse(input.value);
        result.textContent = JSON.stringify(value, null, minify ? 0 : Number(indent.value));
        result.classList.add("is-ready");
        setStatus(minify ? "Valid JSON minified locally." : "Valid JSON formatted locally.");
        return result.textContent;
      } catch (error) {
        result.textContent = "Invalid JSON: " + error.message;
        result.classList.remove("is-ready");
        setStatus("The JSON is not valid. Check the highlighted error message.", true);
        return null;
      }
    }
    document.getElementById("format-json").addEventListener("click", function () { transform(false); });
    document.getElementById("minify-json").addEventListener("click", function () { transform(true); });
    document.getElementById("copy-json").addEventListener("click", function () {
      var text = result.classList.contains("is-ready") ? result.textContent : transform(false);
      if (!text) return;
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { setStatus("Formatted JSON copied to your clipboard."); });
      else setStatus("Select the formatted JSON and copy it manually.");
    });
    document.getElementById("download-json").addEventListener("click", function () {
      var text = result.classList.contains("is-ready") ? result.textContent : transform(false);
      if (text) download(new Blob([text], { type: "application/json" }), "formatted.json");
    });
  }

  function setupWordCounter() {
    var input = document.getElementById("word-input");
    if (!input) return;
    function update() {
      var text = input.value;
      var words = text.trim() ? text.trim().split(/\s+/).length : 0;
      document.getElementById("word-count").textContent = words.toLocaleString();
      document.getElementById("character-count").textContent = text.length.toLocaleString();
      document.getElementById("character-no-space-count").textContent = text.replace(/\s/g, "").length.toLocaleString();
      document.getElementById("line-count").textContent = text ? text.split(/\r?\n/).length.toLocaleString() : "0";
      document.getElementById("reading-time").textContent = words ? Math.max(1, Math.ceil(words / 200)) + " min" : "0 min";
    }
    input.addEventListener("input", update);
    update();
  }

  if (tool === "merge-pdf") setupMerge();
  if (tool === "split-pdf") setupSplit();
  if (tool === "compress-pdf") setupCompressPdf();
  if (tool === "pdf-organizer") setupOrganizer();
  if (tool === "watermark-pdf") setupWatermark();
  if (tool === "pdf-page-numbers") setupPageNumbers();
  if (tool === "extract-text") setupExtractText();
  if (tool === "qr-code-generator") setupQr();
  if (tool === "json-formatter") setupJson();
  if (tool === "word-counter") setupWordCounter();
}());
