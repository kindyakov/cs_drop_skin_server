import { Request, Response, NextFunction } from 'express';
import { adminSkinsService } from '../../services/admin/adminSkins.service.js';
import {
  type SkinFilters,
  type FilteredSkinsResult,
  type AvailableFilters,
  type SkinsStats,
} from '../../services/admin/adminSkins.service.js';
import { AppError } from '../../utils/errors.util.js';
import { successResponse } from '../../utils/response.util.js';
import { logger } from '../../middleware/logger.middleware.js';

/**
 * Контроллер для работы со скинами в админке
 * Обрабатывает HTTP запросы к эндпоинтам скинов
 */
class AdminSkinsController {
  /**
   * Получить отфильтрованный список скинов с пагинацией
   * @route GET /api/v1/admin/skins
   */
  public async getFilteredSkins(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      // Валидация и преобразование query параметров
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 50));

      const sortByValue = req.query.sortBy as string;
      const allowedSortBy: Array<'name' | 'rarity' | 'weapon' | 'category'> = [
        'name',
        'rarity',
        'weapon',
        'category',
      ];
      const sortBy = allowedSortBy.includes(
        sortByValue as 'name' | 'rarity' | 'weapon' | 'category'
      )
        ? (sortByValue as 'name' | 'rarity' | 'weapon' | 'category')
        : 'name';

      const sortOrderValue = req.query.sortOrder as string;
      const sortOrder = sortOrderValue === 'desc' ? 'desc' : 'asc';

      const stattrak =
        req.query.stattrak === 'true' ? true : req.query.stattrak === 'false' ? false : undefined;

      const souvenir =
        req.query.souvenir === 'true' ? true : req.query.souvenir === 'false' ? false : undefined;

      // Формирование объекта фильтров
      const filters: SkinFilters = {
        search: req.query.search as string,
        weaponId: req.query.weaponId as string,
        categoryId: req.query.categoryId as string,
        rarityId: req.query.rarityId as string,
        patternId: req.query.patternId as string,
        wearId: req.query.wearId as string,
        stattrak,
        souvenir,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      // Вызов сервиса
      const result: FilteredSkinsResult = adminSkinsService.getFilteredSkins(filters);

      // Формирование ответа
      return successResponse(res, {
        skins: result.skins,
        pagination: result.pagination,
        appliedFilters: filters,
      });
    } catch (error) {
      logger.error('Ошибка при получении отфильтрованных скинов', {
        error: error instanceof Error ? error.message : String(error),
        query: req.query,
      });
      next(error);
    }
  }

  /**
   * Получить скин по ID
   * @route GET /api/v1/admin/skins/:id
   */
  public async getSkinById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        throw new AppError('ID is required', 400);
      }

      const skinId = String(id);
      logger.debug('Начало обработки запроса на получение скина по ID', { id: skinId });

      // Вызов сервиса
      const skin = adminSkinsService.getSkinById(skinId);

      if (!skin) {
        throw new AppError(`Skin with id "${skinId}" not found`, 404);
      }

      logger.debug('Скин успешно найден', { id: skinId, name: skin.name });

      return successResponse(res, { skin });
    } catch (error) {
      logger.error('Ошибка при получении скина по ID', {
        error: error instanceof Error ? error.message : String(error),
        id: req.params.id,
      });
      next(error);
    }
  }

  /**
   * Получить доступные фильтры для скинов
   * @route GET /api/v1/admin/skins/filters
   */
  public async getAvailableFilters(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const filters: AvailableFilters = adminSkinsService.getAvailableFilters();

      return successResponse(res, filters);
    } catch (error) {
      logger.error('Ошибка при получении доступных фильтров', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }

  /**
   * Получить статистику по скинам
   * @route GET /api/v1/admin/skins/stats
   */
  public async getSkinsStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const stats: SkinsStats = adminSkinsService.getSkinsStats();

      return successResponse(res, stats);
    } catch (error) {
      logger.error('Ошибка при получении статистики скинов', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }

  /**
   * Запустить ручную синхронизацию скинов из API
   * @route POST /api/v1/admin/skins/sync
   */
  public async syncSkinsFromApi(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      logger.info('Запуск ручной синхронизации скинов из API');

      // Вызов сервиса
      const result = await adminSkinsService.syncSkinsFromApi();

      logger.info('Синхронизация скинов успешно завершена', {
        lastSync: result.lastSync,
        totalSkins: result.totalSkins,
        duration: result.duration,
      });

      return successResponse(
        res,
        {
          lastSync: result.lastSync,
          totalSkins: result.totalSkins,
          duration: result.duration,
        },
        'Скины успешно синхронизированы'
      );
    } catch (error) {
      logger.error('Ошибка при синхронизации скинов', {
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
}

// Экспортируем singleton инстанс контроллера
export const adminSkinsController = new AdminSkinsController();
