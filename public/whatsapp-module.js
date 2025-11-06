window.sendWhatsAppMessage = async function (recipientNumbers, messageText) {
  const endpoint = "https://europe-west1-diditaxi-klantenservice.cloudfunctions.net/sendWhatsAppMessage";

  // 支持单个号码或数组
  const recipients = Array.isArray(recipientNumbers) ? recipientNumbers : [recipientNumbers];
  const results = [];

  for (const recipientNumber of recipients) {
    try {
      // ✅ 确保号码是字符串格式
      const recipientStr = String(recipientNumber);
      console.log(`🔍 云端 WhatsApp 发送请求:`, { recipientNumber: recipientStr, messageLength: messageText.length });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ recipientNumber: recipientStr, messageText })
      });

      console.log(`📡 云端 WhatsApp 响应 (${recipientNumber}):`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log(`📦 云端 WhatsApp 返回数据 (${recipientNumber}):`, result);

      if (!response.ok) {
        console.error("❌ WhatsApp 发送失败:", result);
        results.push({
          to: recipientNumber,
          success: false,
          error: result.error || "发送失败"
        });
      } else {
        console.log("✅ WhatsApp 通知发送成功:", result);
        results.push({
          to: recipientNumber,
          success: true,
          error: null
        });
      }
    } catch (error) {
      console.error(`❌ WhatsApp 通知异常 (${recipientNumber}):`, error.message);
      results.push({
        to: recipientNumber,
        success: false,
        error: error.message
      });
    }
  }

  console.log(`📊 云端 WhatsApp 最终结果:`, results);
  return { success: results.every(r => r.success), results };
}

window.buildWhatsAppMessageText = function (Bestelling, tafelNr, invoiceNumber, orderLineCount) {
  try {
    if (typeof Bestelling === "string") {
      Bestelling = JSON.parse(Bestelling);
    }

    if (!Array.isArray(Bestelling)) {
      console.warn("⚠️ Bestelling 格式不对，无法生成 WhatsApp 消息");
      return "❌ Ongeldige bestelgegevens.";
    }

    let message = `📩 Nieuwe bestelling (*Tafel ${tafelNr}*, *#${invoiceNumber}*)\n\n`;
    let totalPrice = 0;

    Bestelling.forEach(item => {
      const quantity = parseFloat(item[2]) || 0;
      const price = parseFloat(item[3]) || 0;
      const name = item[5] || "Onbekend";
      const lineTotal = quantity * price;
      totalPrice += lineTotal;

      message += `▶ ${quantity}x ${name} (€${price.toFixed(2)})\n\n`;
    });

    message += `🧾 Totaal items: ${orderLineCount}\n`;
    message += `💰 *Totaal bedrag: €${totalPrice.toFixed(2)}*`;

    return message;
  } catch (error) {
    console.error("❌ Fout bij bouwen van WhatsApp bericht:", error);
    return "❌ Fout bij het genereren van de bestelnotificatie.";
  }
};

// 专门用于服务请求的简洁消息构建函数
window.buildServiceRequestMessage = function (Bestelling, tafelNr) {
  try {
    if (typeof Bestelling === "string") {
      Bestelling = JSON.parse(Bestelling);
    }

    if (!Array.isArray(Bestelling)) {
      console.warn("⚠️ Bestelling 格式不对，无法生成服务请求消息");
      return "❌ Ongeldige bestelgegevens.";
    }

    // 服务请求SKU列表
    const SERVICE_REQUEST_SKUS = ['295', '288'];

    // 只提取服务请求项目
    const serviceRequests = Bestelling.filter(item => {
      const sku = String(item?.[1] || '').trim();
      return SERVICE_REQUEST_SKUS.includes(sku);
    });

    if (serviceRequests.length === 0) {
      return `🔔 *Service verzoek* - Tafel ${tafelNr}`;
    }

    // 构建简洁的服务请求消息
    let message = `🔔 *Service verzoek*\n\n`;
    message += `📍 *Tafel ${tafelNr}*\n\n`;

    serviceRequests.forEach(item => {
      // 尝试多种方式获取描述
      let description = item.description || item[5] || item.name || "Service verzoek";

      // 如果描述包含 + 符号，只取第一部分（去掉选项和备注）
      if (typeof description === 'string') {
        description = description.split('+')[0].trim();
      }

      message += `▶ ${description}\n`;
    });

    return message;
  } catch (error) {
    console.error("❌ Fout bij bouwen van service verzoek bericht:", error);
    return `🔔 Service verzoek - Tafel ${tafelNr}`;
  }
};

window.sendWhatsAppTemplate = async function (recipientNumber, templateData) {
  const endpoint = "https://whatsapp-food-order-template-15705369993.europe-west1.run.app/send-template";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipientNumber,
        templateData
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ WhatsApp 模板发送失败:", result);
      return { success: false, error: result.error || "发送失败" };
    }

    console.log("✅ WhatsApp 模板发送成功:", result);
    return { success: true };
  } catch (error) {
    console.error("❌ WhatsApp 模板请求异常:", error.message);
    return { success: false, error: error.message };
  }
};


window.sendOrderViaLocalWWeb = async function (phoneList, message) {
  const phones = Array.isArray(phoneList) ? phoneList : [phoneList];
  const results = [];

  for (const phone of phones) {
    try {
      // ✅ 确保 phone 是字符串格式（API 要求字符串）
      const phoneStr = String(phone);
      console.log(`🔍 本地 WhatsApp 发送请求:`, { phone: phoneStr, messageLength: message.length });

      const response = await fetch("https://whatsapp.cislink.nl/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: phoneStr,
          message: message
        })
      });

      console.log(`📡 本地 WhatsApp 响应 (${phone}):`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log(`📦 本地 WhatsApp 返回数据 (${phone}):`, result);
      if (result.results) {
        console.log(`   📋 results 数组详情:`, JSON.stringify(result.results, null, 2));
      }

      // ✅ 优先检查 results 数组中的实际状态（无论 HTTP 状态码）
      let actualSuccess = false;
      let actualError = null;

      if (Array.isArray(result.results) && result.results.length > 0) {
        // 有 results 数组：检查是否有成功的项
        const successItem = result.results.find(r => r.success === true);
        if (successItem) {
          actualSuccess = true;
          console.log(`✅ 本地 WhatsApp 实际发送成功 (${phone}):`, successItem);
        } else {
          // 所有项都失败，获取错误信息
          const failedItem = result.results[0];
          actualError = failedItem?.error || failedItem?.message || 'Unknown error';
          console.warn(`❌ 本地 WhatsApp 实际发送失败 (${phone}):`, failedItem);
        }
      } else {
        // 没有 results 数组：直接使用 result.success
        actualSuccess = result.success === true;
        actualError = result.error || null;
      }

      results.push({
        to: phone,
        success: actualSuccess,
        error: actualError
      });
    } catch (error) {
      console.error(`❌ 本地 WhatsApp 请求异常 (${phone}):`, error);
      results.push({
        to: phone,
        success: false,
        error: error.message
      });
    }
  }

  console.log(`📊 本地 WhatsApp 最终结果:`, results);
  return { success: results.every(r => r.success), results };
};
