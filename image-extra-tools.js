/* Browser-only image crop, rotate, watermark and meme utilities. */
(function () {
  "use strict";

  var tool = document.body.dataset.tool;
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

  function outputExtension(type) {
    return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  }

  function download(blob, filename) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function readImage(file) {
    return new Promise(function (resolve, reject) {
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

  function imageFiles(files, multiple) {
    var images = files.filter(function (file) { return file.type.match(/^image\//); });
    return multiple ? images : images.slice(0, 1);
  }

  function setupInput(callback, multiple) {
    var input = document.getElementById("file-input");
    var dropzone = document.getElementById("dropzone");
    if (!input || !dropzone) return;
    function receive(files) {
      var selected = imageFiles(files, multiple);
      var list = document.getElementById("selected-files");
      if (list) {
        list.innerHTML = "";
        selected.forEach(function (file) {
          var item = document.createElement("li");
          item.innerHTML = "<span></span><span></span>";
          item.children[0].textContent = file.name;
          item.children[1].textContent = formatBytes(file.size);
          list.appendChild(item);
        });
      }
      callback(selected);
    }
    input.addEventListener("change", function () { receive(Array.from(input.files)); });
    ["dragenter", "dragover"].forEach(function (name) {
      dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach(function (name) {
      dropzone.addEventListener(name, function (event) {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    });
    dropzone.addEventListener("drop", function (event) { receive(Array.from(event.dataTransfer.files)); });
  }

  function selectedFormat() {
    var select = document.getElementById("output-format");
    return select ? select.value : "image/jpeg";
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error("The browser could not create an output image."));
        else resolve(blob);
      }, type, quality);
    });
  }

  function showResult(blob, filename, note, preview, append) {
    if (!output) return;
    if (!append) output.innerHTML = "";
    var card = document.createElement("div");
    card.className = "tool-result-card";
    if (preview) {
      var image = document.createElement("img");
      image.className = "tool-preview";
      image.src = URL.createObjectURL(blob);
      image.alt = "Processed image preview";
      card.appendChild(image);
    } else {
      card.appendChild(document.createElement("div"));
    }
    var details = document.createElement("div");
    details.className = "tool-result-details";
    var name = document.createElement("strong");
    name.textContent = filename;
    var meta = document.createElement("span");
    meta.textContent = note + " · " + formatBytes(blob.size);
    details.appendChild(name);
    details.appendChild(meta);
    card.appendChild(details);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = "Download";
    button.addEventListener("click", function () { download(blob, filename); });
    card.appendChild(button);
    output.appendChild(card);
    output.classList.add("has-result");
  }

  function setupCropper() {
    var file;
    var image;
    setupInput(function (selected) {
      document.getElementById("process-button").disabled = true;
      file = selected[0];
      if (!file) {
        setStatus("Choose one image file.", true);
        return;
      }
      readImage(file).then(function (loaded) {
        image = loaded;
        ["crop-x", "crop-y"].forEach(function (id) { document.getElementById(id).value = 0; });
        document.getElementById("crop-width").value = image.naturalWidth;
        document.getElementById("crop-height").value = image.naturalHeight;
        document.getElementById("process-button").disabled = false;
        setStatus(image.naturalWidth + " × " + image.naturalHeight + " px ready to crop.");
      }).catch(function (error) { setStatus(error.message, true); });
    }, false);
    var button = document.getElementById("process-button");
    button.addEventListener("click", async function () {
      if (!image || !file) {
        setStatus("Choose an image first.", true);
        return;
      }
      var x = Number(document.getElementById("crop-x").value);
      var y = Number(document.getElementById("crop-y").value);
      var width = Number(document.getElementById("crop-width").value);
      var height = Number(document.getElementById("crop-height").value);
      if (x < 0 || y < 0 || width < 1 || height < 1 || x + width > image.naturalWidth || y + height > image.naturalHeight) {
        setStatus("Crop area must stay inside the original image.", true);
        return;
      }
      button.disabled = true;
      try {
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(image, x, y, width, height, 0, 0, width, height);
        var blob = await canvasBlob(canvas, selectedFormat(), 0.9);
        var name = file.name.replace(/\.[^.]+$/, "") + "-cropped." + outputExtension(selectedFormat());
        showResult(blob, name, width + " × " + height + " px", true);
        setStatus("Done. Your cropped image stayed on this device.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function transformedCanvas(image, angle, flip) {
    var radians = angle * Math.PI / 180;
    var quarterTurn = angle === 90 || angle === 270;
    var canvas = document.createElement("canvas");
    canvas.width = quarterTurn ? image.naturalHeight : image.naturalWidth;
    canvas.height = quarterTurn ? image.naturalWidth : image.naturalHeight;
    var context = canvas.getContext("2d");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(radians);
    context.scale(flip === "horizontal" ? -1 : 1, flip === "vertical" ? -1 : 1);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    return canvas;
  }

  function setupRotator() {
    var files = [];
    var images = [];
    setupInput(function (selected) {
      document.getElementById("process-button").disabled = true;
      files = selected;
      images = [];
      if (!files.length) {
        setStatus("Choose one or more images.", true);
        return;
      }
      Promise.all(files.map(readImage)).then(function (loaded) {
        images = loaded;
        document.getElementById("process-button").disabled = false;
        setStatus(files.length + " image" + (files.length === 1 ? "" : "s") + " ready.");
      }).catch(function (error) { setStatus(error.message, true); });
    }, true);
    document.getElementById("process-button").addEventListener("click", async function () {
      if (!images.length) {
        setStatus("Choose images first.", true);
        return;
      }
      var button = document.getElementById("process-button");
      button.disabled = true;
      try {
        var angle = Number(document.getElementById("rotate-angle").value);
        var flip = document.getElementById("flip-direction").value;
        var type = selectedFormat();
        for (var i = 0; i < images.length; i++) {
          var blob = await canvasBlob(transformedCanvas(images[i], angle, flip), type, 0.9);
          var name = files[i].name.replace(/\.[^.]+$/, "") + "-rotated." + outputExtension(type);
          showResult(blob, name, angle + " degrees " + (flip === "none" ? "" : "and " + flip + " flip"), true, i > 0);
        }
        setStatus("Done. " + images.length + " image" + (images.length === 1 ? "" : "s") + " processed locally.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupWatermark() {
    var files = [];
    var images = [];
    setupInput(function (selected) {
      document.getElementById("process-button").disabled = true;
      files = selected;
      images = [];
      if (!files.length) {
        setStatus("Choose one or more images.", true);
        return;
      }
      Promise.all(files.map(readImage)).then(function (loaded) {
        images = loaded;
        document.getElementById("process-button").disabled = false;
        setStatus(files.length + " image" + (files.length === 1 ? "" : "s") + " ready.");
      }).catch(function (error) { setStatus(error.message, true); });
    }, true);
    document.getElementById("watermark-opacity").addEventListener("input", function () {
      document.getElementById("watermark-opacity-value").textContent = this.value + "%";
    });
    document.getElementById("process-button").addEventListener("click", async function () {
      if (!images.length) {
        setStatus("Choose images first.", true);
        return;
      }
      var text = document.getElementById("watermark-text").value.trim();
      if (!text) {
        setStatus("Enter watermark text first.", true);
        return;
      }
      var button = document.getElementById("process-button");
      button.disabled = true;
      try {
        var type = selectedFormat();
        var position = document.getElementById("watermark-position").value;
        var opacity = Number(document.getElementById("watermark-opacity").value) / 100;
        var fontSize = Number(document.getElementById("watermark-size").value);
        for (var i = 0; i < images.length; i++) {
          var canvas = document.createElement("canvas");
          canvas.width = images[i].naturalWidth;
          canvas.height = images[i].naturalHeight;
          var context = canvas.getContext("2d");
          context.drawImage(images[i], 0, 0);
          context.font = "600 " + fontSize + "px Arial";
          context.fillStyle = "rgba(255,255,255," + opacity + ")";
          context.strokeStyle = "rgba(0,0,0," + Math.min(opacity + 0.18, 0.8) + ")";
          context.lineWidth = Math.max(1, fontSize / 12);
          var textWidth = context.measureText(text).width;
          var x = position === "left" ? fontSize : position === "right" ? canvas.width - textWidth - fontSize : (canvas.width - textWidth) / 2;
          var y = position === "top" ? fontSize * 2 : position === "bottom" ? canvas.height - fontSize : canvas.height / 2;
          context.strokeText(text, x, y);
          context.fillText(text, x, y);
          var blob = await canvasBlob(canvas, type, 0.9);
          showResult(blob, files[i].name.replace(/\.[^.]+$/, "") + "-watermarked." + outputExtension(type), "Watermark applied", true, i > 0);
        }
        setStatus("Done. " + images.length + " image" + (images.length === 1 ? "" : "s") + " watermarked locally.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupMeme() {
    var file;
    var image;
    setupInput(function (selected) {
      document.getElementById("process-button").disabled = true;
      file = selected[0];
      if (!file) {
        setStatus("Choose one image file.", true);
        return;
      }
      readImage(file).then(function (loaded) {
        image = loaded;
        document.getElementById("process-button").disabled = false;
        setStatus(image.naturalWidth + " × " + image.naturalHeight + " px ready.");
      }).catch(function (error) { setStatus(error.message, true); });
    }, false);
    document.getElementById("process-button").addEventListener("click", async function () {
      if (!image || !file) {
        setStatus("Choose an image first.", true);
        return;
      }
      var button = document.getElementById("process-button");
      button.disabled = true;
      try {
        var canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        var fontSize = Math.max(24, Math.round(canvas.width / 10));
        context.font = "900 " + fontSize + "px Impact, Arial Black, sans-serif";
        context.textAlign = "center";
        context.lineJoin = "round";
        context.strokeStyle = "#000";
        context.fillStyle = "#fff";
        context.lineWidth = Math.max(3, fontSize / 12);
        function caption(id, y) {
          var text = document.getElementById(id).value.trim().toUpperCase();
          if (!text) return;
          context.strokeText(text, canvas.width / 2, y);
          context.fillText(text, canvas.width / 2, y);
        }
        caption("meme-top", fontSize * 1.25);
        caption("meme-bottom", canvas.height - fontSize * 0.45);
        var blob = await canvasBlob(canvas, "image/jpeg", 0.92);
        showResult(blob, file.name.replace(/\.[^.]+$/, "") + "-meme.jpg", "Caption added", true);
        setStatus("Done. Your meme was created locally.");
      } catch (error) {
        setStatus(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

  if (tool === "image-cropper") setupCropper();
  if (tool === "image-rotator") setupRotator();
  if (tool === "image-watermark") setupWatermark();
  if (tool === "meme-generator") setupMeme();
}());
