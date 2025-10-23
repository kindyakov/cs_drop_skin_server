/**
 * CLI скрипт для ручной синхронизации скинов
 *
 * Использование:
 *   npx tsx sync-skins.ts
 *   npm run sync-skins
 */

import { manualSyncItems } from './src/jobs/syncItems.job.js';
import { csApiService } from './src/services/csApi.service.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('🎮 Интерфейс синхронизации скинов CS\n');

  try {
    switch (command) {
      case 'info':
      case '--info':
      case '-i':
        // Показать информацию о кэше
        console.log('📊 Проверка информации о кэше...\n');
        const info = await csApiService.getCacheInfo();

        console.log('Информации о кэше:');
        console.log('─'.repeat(50));
        console.log(`Статус: ${info.cacheExists ? '✅ Существует' : '❌ Не найдено'}`);
        console.log(`Общее количество скинов: ${info.totalSkins.toLocaleString()}`);

        if (info.lastSync) {
          const lastSyncDate = new Date(info.lastSync);
          const hoursAgo = ((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60)).toFixed(1);
          console.log(`Последняя синхронизация: ${lastSyncDate.toLocaleString()}`);
          console.log(`Последняя синхронизация: ${hoursAgo} часов назад`);
        } else {
          console.log('Последняя синхронизация: Никогда');
        }
        console.log('─'.repeat(50));
        break;

      case 'sync':
      case '--sync':
      case '-s':
      default:
        // Выполнить синхронизацию
        console.log('🔄 Запуск синхронизации...\n');
        await manualSyncItems();
        console.log('\n✅ Синхронизация успешно завершена!');

        // Показать обновленную информацию
        const updatedInfo = await csApiService.getCacheInfo();
        console.log(
          `\n📊 Общее количество скинов в кэше: ${updatedInfo.totalSkins.toLocaleString()}`
        );
        break;

      case 'help':
      case '--help':
      case '-h':
        // Показать справку
        console.log('Использование: npx tsx sync-skins.ts [command]');
        console.log('\nCommands:');
        console.log('  sync, -s, --sync      Синхронизировать скины из API (по умолчанию)');
        console.log('  info, -i, --info      Показывать информацию о кэше');
        console.log('  help, -h, --help      Отобразить это справочное сообщение');
        console.log('\nExamples:');
        console.log('  npx tsx sync-skins.ts           # Запустить синхронизацию');
        console.log('  npx tsx sync-skins.ts sync      # Запустить синхронизацию');
        console.log('  npx tsx sync-skins.ts info      # Показывать информацию о кэше');
        break;
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
