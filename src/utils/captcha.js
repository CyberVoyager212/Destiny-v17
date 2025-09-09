const { createCanvas } = require("canvas");

function generateCaptcha() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let text = "";
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function generateCaptchaImage(text) {
  const canvas = createCanvas(150, 50);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 150, 50);
  ctx.font = "30px Arial";
  ctx.fillStyle = "#000000";
  ctx.fillText(text, 20, 35);
  return canvas.toBuffer();
}

module.exports = { generateCaptcha, generateCaptchaImage };
