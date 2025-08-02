const { nativeImage } = require('electron');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// Свои сокращения месяцев
const months = [
    '', 'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
];

async function dockIconHandler(iconPath, count, overdueCount, topOffsetPx = 45, bottomOffsetPx = 55) {
    // Загрузить базовую иконку
    const img    = await loadImage(iconPath);
    const width  = img.width;
    const height = img.height;

    // Подготовить canvas того же размера
    const canvas = createCanvas(width, height);
    const ctx    = canvas.getContext('2d');

    // Нарисовать саму иконку
    ctx.drawImage(img, 0, 0, width, height);

    // Определить текст: месяц и число
    const today     = new Date();
    const monthText = months[today.getMonth() + 1];
    const dayText   = String(today.getDate());

    // Настроить шрифты и выравнивание
    ctx.fillStyle    = 'white';
    ctx.textAlign    = 'center';

    // Месяц сверху
    const monthFontSize = Math.floor(width * 0.2);
    ctx.font         = `bold ${monthFontSize}px Montserrat`;
    ctx.textBaseline = 'top';
    ctx.fillText(monthText, width / 2, topOffsetPx);

    // Число снизу
    const dayFontSize = Math.floor(width * 0.45);
    ctx.font         = `500 ${dayFontSize}px Montserrat`;
    ctx.textBaseline = 'bottom';

    if (count > 0 && overdueCount > 0) {
        ctx.fillStyle = '#ff0000';
    } else if (count > 0) {
        ctx.fillStyle = '#ffa200';
    } else {
        ctx.fillStyle = '#000000';
    }

    ctx.fillText(dayText, width / 2, height - bottomOffsetPx);

    // Вернуть NativeImage
    const buffer = canvas.toBuffer('image/png');
    return nativeImage.createFromBuffer(buffer);
}

module.exports = { dockIconHandler };