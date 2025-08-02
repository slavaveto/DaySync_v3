const { powerMonitor } = require("electron");

function setupPowerMonitor(win) {
    if (!win) return;


    // ✅ Когда компьютер уходит в спящий режим
    powerMonitor.on("suspend", () => {
        // console.log("💤 Компьютер уходит в спящий режим.");
        win.webContents.send("power-status", { status: "suspended", message: "Компьютер ушел в сон" });
    });

    // ✅ Когда компьютер блокируется
    powerMonitor.on("lock-screen", () => {
        // console.log("🔒 Экран заблокирован.");
        win.webContents.send("power-status", { status: "locked", message: "Экран заблокирован" });
    });

    // ✅ Когда компьютер пробуждается
    powerMonitor.on("resume", () => {
        // console.log("🔄 Компьютер проснулся.");
        win.webContents.send("power-status", { status: "resumed", message: "Компьютер проснулся" });
    });

    // ✅ Когда компьютер разблокируется
    powerMonitor.on("unlock-screen", () => {
        // console.log("🔓 Экран разблокирован.");
        win.webContents.send("power-status", { status: "unlocked", message: "Экран разблокирован" });
    });
}

module.exports = { setupPowerMonitor };