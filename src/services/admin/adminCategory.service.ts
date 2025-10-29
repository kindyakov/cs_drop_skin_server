import { PrismaClient } from '@prisma/client';
import type {
  ICategory,
  ICategoryWithCases,
  ICreateCategoryInput,
  IUpdateCategoryInput,
  IAssignCasesToCategoryInput,
} from '../../types/category.types';
import { slugify } from '../../utils/helpers.util.js';
import { NotFoundError, ValidationError } from '../../utils/errors.util.js';
import { logger } from '../../middleware/logger.middleware.js';

const prisma = new PrismaClient();

/**
 * Получить все категории с полными данными кейсов
 */
export const getAllCategories = async (): Promise<ICategoryWithCases[]> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        cases: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            price: true,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Конвертируем Decimal в number для price
    const formattedCategories = categories.map((category) => ({
      ...category,
      cases: category.cases.map((caseData) => ({
        ...caseData,
        price: caseData.price.toNumber(),
      })),
    }));

    return formattedCategories;
  } catch (error) {
    logger.error('Ошибка получения категорий', { error });
    throw error;
  }
};

/**
 * Получить категорию по ID с кейсами
 */
export const getCategoryById = async (id: string): Promise<ICategoryWithCases> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        cases: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            price: true,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Категория не найдена');
    }

    // Конвертируем Decimal в number для price
    return {
      ...category,
      cases: category.cases.map((caseData) => ({
        ...caseData,
        price: caseData.price.toNumber(),
      })),
    };
  } catch (error) {
    logger.error('Ошибка получения категории', { error, id });
    throw error;
  }
};

/**
 * Получить категорию по SLUG с кейсами
 */
export const getCategoryBySlug = async (slug: string): Promise<ICategoryWithCases> => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        cases: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            price: true,
            isActive: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Категория не найдена');
    }

    // Конвертируем Decimal в number для price
    return {
      ...category,
      cases: category.cases.map((caseData) => ({
        ...caseData,
        price: caseData.price.toNumber(),
      })),
    };
  } catch (error) {
    logger.error('Ошибка получения категории', { error, slug });
    throw error;
  }
};

/**
 * Создать категорию
 */
export const createCategory = async (input: ICreateCategoryInput): Promise<ICategory> => {
  try {
    const slug = slugify(input.name);

    // Проверить уникальность slug
    const existingCategory = await prisma.category.findUnique({ where: { slug } });
    if (existingCategory) {
      throw new ValidationError('Категория с таким названием уже существует');
    }

    const newCategory = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        imageUrl: input.imageUrl,
        order: input.order ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    logger.info('Категория создана', { categoryId: newCategory.id, name: newCategory.name });
    return newCategory;
  } catch (error) {
    logger.error('Ошибка создания категории', { error, input });
    throw error;
  }
};

/**
 * Обновить категорию
 */
export const updateCategory = async (
  id: string,
  input: IUpdateCategoryInput
): Promise<ICategory> => {
  try {
    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      throw new NotFoundError('Категория не найдена');
    }

    let slug = existingCategory.slug;
    if (input.name && input.name !== existingCategory.name) {
      slug = slugify(input.name);
      const slugExists = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });
      if (slugExists) {
        throw new ValidationError('Категория с таким названием уже существует');
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.name ? slug : undefined,
        description: input.description,
        imageUrl: input.imageUrl,
        order: input.order,
        isActive: input.isActive,
      },
    });

    logger.info('Категория обновлена', { categoryId: id });
    return updatedCategory;
  } catch (error) {
    logger.error('Ошибка обновления категории', { error, id, input });
    throw error;
  }
};

/**
 * Удалить категорию (soft delete)
 */
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const existingCategory = await prisma.category.findUnique({ where: { id } });
    if (!existingCategory) {
      throw new NotFoundError('Категория не найдена');
    }

    // Убрать категорию у всех кейсов
    await prisma.$transaction([
      prisma.case.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      }),
      prisma.category.update({
        where: { id },
        data: { isActive: false },
      }),
    ]);

    logger.info('Категория деактивирована', { categoryId: id });
  } catch (error) {
    logger.error('Ошибка удаления категории', { error, id });
    throw error;
  }
};

/**
 * Назначить кейсы категории
 */
export const assignCasesToCategory = async (
  categoryId: string,
  input: IAssignCasesToCategoryInput
): Promise<ICategoryWithCases> => {
  try {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundError('Категория не найдена');
    }

    // Проверить существование всех кейсов
    const cases = await prisma.case.findMany({
      where: { id: { in: input.caseIds } },
    });
    if (cases.length !== input.caseIds.length) {
      throw new NotFoundError('Один или несколько кейсов не найдены');
    }

    // Назначить категорию кейсам
    await prisma.case.updateMany({
      where: { id: { in: input.caseIds } },
      data: { categoryId },
    });

    // Вернуть категорию с кейсами
    const updatedCategory = await getCategoryById(categoryId);

    logger.info('Кейсы назначены категории', {
      categoryId,
      casesCount: input.caseIds.length,
    });

    return updatedCategory;
  } catch (error) {
    logger.error('Ошибка назначения кейсов категории', { error, categoryId, input });
    throw error;
  }
};
