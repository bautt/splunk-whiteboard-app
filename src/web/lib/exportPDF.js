// PDF export using the canvas Excalidraw renders into.
// Falls back to PNG-via-Excalidraw if html2canvas misbehaves on the live DOM.

import jsPDF from 'jspdf';

export async function exportCanvasToPDF(blob, fileName = 'whiteboard.pdf') {
    const dataUrl = await blobToDataURL(blob);
    const img = await loadImage(dataUrl);
    const orientation = img.width >= img.height ? 'l' : 'p';

    const pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [img.width, img.height],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
    pdf.save(fileName);
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
