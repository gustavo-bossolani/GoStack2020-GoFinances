import { getRepository } from 'typeorm';

import Category from '../models/Category';

interface Request {
  title: string;
}

class CreateCategoryService {
  public async execute({ title }: Request): Promise<Category> {
    const categoryRepo = getRepository(Category);

    const category = categoryRepo.create({
      title,
    });

    const presistedCategory = await categoryRepo.save(category);
    return presistedCategory;
  }
}
export default CreateCategoryService;
