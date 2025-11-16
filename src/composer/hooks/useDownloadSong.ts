// This source code is taken from Firefox Send (https://github.com/mozilla/send) and slightly modified.
// https://gist.github.com/thomaskonrad/37772256a86d9f5b0472b3c2440cffee

import JSZip from "jszip";

export default async function saveFile(plaintext: ArrayBuffer, fileName: string, fileType: string) {
  return new Promise<void>((resolve, reject) => {
    const dataView = new DataView(plaintext);
    const blob = new Blob([dataView], { type: fileType });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(downloadUrl);
    setTimeout(resolve, 100);
  });
}

export async function uploadZipFile(file: File) {
  if (file.type === "application/zip"){
    const zip = await (new JSZip()).loadAsync(file /* = file blob */);
    return Object.keys(zip.files).map(async (filename) => {
      const blob = await zip.files[filename].async('blob');
    });
    // this.removeFile(file)
    // void(0)
  }
}