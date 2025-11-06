// config.js
(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const restName = urlParams.get("rest");
  const tafelRaw = urlParams.get("tafel");
  const pincode = urlParams.get("pincode");

  window.AppConfig = {
    restName: restName,
    tafelRaw: tafelRaw,
    tafelId: tafelRaw ? `Tafel-${tafelRaw}` : null,
    pincode: pincode,
    configReady: false // 标记是否加载完成
  };

  if (!restName || !tafelRaw) {
    console.warn("⚠️ Missing ?rest or ?tafel in URL");
    return;
  }

  // ✅ 等 Firebase 加载完成后读取 /config
  document.addEventListener("DOMContentLoaded", () => {
    if (!firebase?.database) {
      console.error("Firebase not initialized when config.js ran.");
      return;
    }

    const configRef = firebase.database().ref(`/${restName}/config`);
    configRef.once("value")
      .then(snapshot => {
        const config = snapshot.val();
        if (!config) {
          console.warn("No config found for restaurant:", restName);
          return;
        }

        // ✅ 添加你需要的字段
        AppConfig.pythonAuth = config.pythonAuth || "";
        AppConfig.restNaam = config.restNaam || "";
        AppConfig.titleImage = config.titleImage || "";
        AppConfig.serverAccessKey = config.server_access || ""; // e.g. "Time9changeit"

        // ✅ 设置加载完成标志
        AppConfig.configReady = true;

        console.log("✅ AppConfig loaded:", AppConfig);
      })
      .catch(error => {
        console.error("❌ Failed to load config:", error);
      });
  });
})();
