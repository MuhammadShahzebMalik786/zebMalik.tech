(function () {
  "use strict";
  var input = document.getElementById("pdf-file-input");
  var dropzone = document.getElementById("pdf-dropzone");
  var status = document.getElementById("pdf-status");
  var output = document.getElementById("pdf-pages");
  var file = null;

  function message(text, error) {
    status.textContent = text;
    status.className = "tool-status" + (error ? " is-error" : "");
  }

  function size(bytes) {
    return bytes < 1048576 ? (bytes / 1024).toFixed(1) + " KB" : (bytes / 1048576).toFixed(2) + " MB";
  }

  function choose(selected) {
    if (!selected || selected.type !== "application/pdf") {
      message("Please choose a PDF file.", true);
      return;
    }
    file = selected;
    document.getElementById("pdf-process-button").disabled = false;
    message(file.name + " loaded · " + size(file.size));
  }

  function download(blob, name) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function renderPdf() {
    if (!file) return;
    output.innerHTML = "";
    message("Rendering PDF pages in your browser…");
    file.arrayBuffer().then(function (data) {
      return pdfjsLib.getDocument({ data: data }).promise;
    }).then(function (pdf) {
      var pages = [];
      for (var pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        pages.push(pdf.getPage(pageNumber).then(function (page) {
          var viewport = page.getViewport({ scale: 1.5 });
          var canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          return page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport }).promise.then(function () {
            return { canvas: canvas, page: page.pageNumber };
          });
        }));
      }
      return Promise.all(pages).then(function (rendered) {
        rendered.forEach(function (item) {
          var card = document.createElement("div");
          card.className = "pdf-page";
          var preview = document.createElement("img");
          preview.src = item.canvas.toDataURL("image/png");
          preview.alt = "Page " + item.page + " preview";
          card.appendChild(preview);
          var button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn-out";
          button.textContent = "Download page " + item.page;
          button.addEventListener("click", function () {
            item.canvas.toBlob(function (blob) { download(blob, "page-" + item.page + ".png"); }, "image/png");
          });
          card.appendChild(button);
          output.appendChild(card);
        });
        message(rendered.length + " page" + (rendered.length === 1 ? "" : "s") + " ready. Your file stayed on this device.");
      });
    }).catch(function () {
      message("This PDF could not be rendered. It may be encrypted or unsupported.", true);
    });
  }

  input.addEventListener("change", function () { choose(input.files[0]); });
  dropzone.addEventListener("dragover", function (event) { event.preventDefault(); dropzone.classList.add("is-dragging"); });
  dropzone.addEventListener("dragleave", function () { dropzone.classList.remove("is-dragging"); });
  dropzone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
    choose(event.dataTransfer.files[0]);
  });
  document.getElementById("pdf-process-button").addEventListener("click", renderPdf);
}());
