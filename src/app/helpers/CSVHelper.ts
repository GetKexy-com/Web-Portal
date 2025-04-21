export class ExportToCsv {
  static download(name: string, data: string) {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    if (navigator["msSaveBlob"]) {
      // IE 10+
      navigator["msSaveBlob"](blob, name);
    } else {
      ExportToCsv._downloadOnHtml5(name, blob);
    }
  }

  private static _downloadOnHtml5(name: string, blob) {
    const link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", name);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
