/**
 * WhatsApp 配置修复脚本
 *
 * 用途：自动检查和修复 Firebase 中的 WhatsApp 配置
 *
 * 使用方法：
 *   node fix-whatsapp-config.js
 *
 * 或者在 Firebase 控制台手动设置：
 *   路径: /Sanjou/config
 *   字段:
 *     - whatsappBerichtAan: true
 *     - whatsappRecipients: ["31612345678", "31687654321"]
 */

const admin = require('firebase-admin');
const readline = require('readline');

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔧 WhatsApp 配置修复工具\n');
  console.log('=' .repeat(60));

  // 1. 检查 Firebase 服务账号文件
  console.log('\n📋 第一步：初始化 Firebase');
  console.log('─'.repeat(60));

  const serviceAccountPath = await question('请输入 Firebase 服务账号 JSON 文件路径 (或按 Enter 跳过): ');

  if (!serviceAccountPath.trim()) {
    console.log('\n⚠️  已跳过自动修复。');
    console.log('\n📝 请手动在 Firebase 控制台完成以下设置：\n');
    printManualInstructions();
    rl.close();
    return;
  }

  try {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://cislink-default-rtdb.europe-west1.firebasedatabase.app'
    });

    console.log('✅ Firebase 初始化成功');
  } catch (error) {
    console.error('❌ Firebase 初始化失败:', error.message);
    console.log('\n请检查文件路径是否正确，或选择手动配置。\n');
    printManualInstructions();
    rl.close();
    return;
  }

  // 2. 获取餐厅名称
  console.log('\n📍 第二步：设置餐厅信息');
  console.log('─'.repeat(60));

  const restName = await question('请输入餐厅名称 (默认: Sanjou): ') || 'Sanjou';
  console.log(`✅ 餐厅: ${restName}`);

  // 3. 读取当前配置
  console.log('\n🔍 第三步：读取当前配置');
  console.log('─'.repeat(60));

  const db = admin.database();
  const configRef = db.ref(`/${restName}/config`);

  let currentConfig = {};
  try {
    const snapshot = await configRef.once('value');
    currentConfig = snapshot.val() || {};
    console.log('✅ 当前配置:', JSON.stringify(currentConfig, null, 2));
  } catch (error) {
    console.error('❌ 读取配置失败:', error.message);
  }

  // 4. 检查问题
  console.log('\n🩺 第四步：诊断配置问题');
  console.log('─'.repeat(60));

  const issues = [];

  if (currentConfig.whatsappBerichtAan !== true) {
    issues.push('❌ whatsappBerichtAan 未设置为 true (当前: ' + currentConfig.whatsappBerichtAan + ')');
  } else {
    console.log('✅ whatsappBerichtAan 已启用');
  }

  if (!currentConfig.whatsappRecipients || currentConfig.whatsappRecipients.length === 0) {
    issues.push('❌ whatsappRecipients 为空或未设置');
  } else {
    console.log('✅ whatsappRecipients:', currentConfig.whatsappRecipients);
  }

  if (!currentConfig.WebHook) {
    issues.push('⚠️  WebHook URL 未设置 (可能影响订单推送)');
  } else {
    console.log('✅ WebHook:', currentConfig.WebHook);
  }

  if (issues.length === 0) {
    console.log('\n✅ 配置检查通过！没有发现问题。');
    rl.close();
    process.exit(0);
  }

  console.log('\n⚠️  发现以下问题:');
  issues.forEach(issue => console.log('   ' + issue));

  // 5. 询问是否修复
  console.log('\n🛠️  第五步：应用修复');
  console.log('─'.repeat(60));

  const shouldFix = await question('\n是否自动修复这些问题？ (y/n): ');

  if (shouldFix.toLowerCase() !== 'y') {
    console.log('\n❌ 已取消修复。\n');
    printManualInstructions();
    rl.close();
    return;
  }

  // 6. 收集新配置
  const newConfig = { ...currentConfig };

  // 修复 whatsappBerichtAan
  if (currentConfig.whatsappBerichtAan !== true) {
    newConfig.whatsappBerichtAan = true;
    console.log('✅ 已设置 whatsappBerichtAan = true');
  }

  // 修复 whatsappRecipients
  if (!currentConfig.whatsappRecipients || currentConfig.whatsappRecipients.length === 0) {
    console.log('\n请输入 WhatsApp 接收人手机号 (多个号码用逗号分隔):');
    console.log('格式: 31612345678,31687654321 (不要加 + 号和空格)');

    const phonesInput = await question('手机号: ');
    const phones = phonesInput.split(',').map(p => p.trim()).filter(p => p);

    if (phones.length > 0) {
      newConfig.whatsappRecipients = phones;
      console.log('✅ 已设置 whatsappRecipients:', phones);
    } else {
      console.log('⚠️  未输入有效手机号，跳过此项');
    }
  }

  // 7. 应用更新
  console.log('\n💾 第六步：保存配置到 Firebase');
  console.log('─'.repeat(60));

  try {
    await configRef.update(newConfig);
    console.log('✅ 配置已成功更新！');

    console.log('\n📋 新配置:');
    console.log(JSON.stringify(newConfig, null, 2));

    console.log('\n🎉 修复完成！');
    console.log('\n📱 下一步测试:');
    console.log('   1. 打开诊断工具: http://localhost:8080/whatsapp-diagnostic.html?rest=Sanjou&tafel=1');
    console.log('   2. 点击 "模拟完整订单流程" 按钮');
    console.log('   3. 或者直接创建一个真实订单测试\n');

  } catch (error) {
    console.error('❌ 保存配置失败:', error.message);
  }

  rl.close();
  process.exit(0);
}

function printManualInstructions() {
  console.log('═'.repeat(60));
  console.log('📝 手动配置指南');
  console.log('═'.repeat(60));
  console.log('\n1️⃣  打开 Firebase 控制台:');
  console.log('   https://console.firebase.google.com/');
  console.log('\n2️⃣  选择项目: cislink');
  console.log('\n3️⃣  进入 Realtime Database');
  console.log('\n4️⃣  导航到路径: /Sanjou/config');
  console.log('\n5️⃣  修改以下字段:');
  console.log('   • whatsappBerichtAan: true');
  console.log('   • whatsappRecipients: ["31612345678", "31687654321"]');
  console.log('     (请替换为实际的手机号，格式: 国家码+号码，不带+号)');
  console.log('\n6️⃣  保存更改');
  console.log('\n7️⃣  使用诊断工具测试:');
  console.log('   打开: public/whatsapp-diagnostic.html?rest=Sanjou&tafel=1\n');
  console.log('═'.repeat(60));
}

// 运行主函数
main().catch(error => {
  console.error('❌ 程序执行错误:', error);
  rl.close();
  process.exit(1);
});
