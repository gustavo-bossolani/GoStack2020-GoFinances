import { getCustomRepository, getRepository, In } from 'typeorm';

import fs from 'fs';
import csvParser from 'csv-parse';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  path: string;
  mimetype: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ path, mimetype }: Request): Promise<Transaction[]> {
    if (mimetype !== 'text/csv') {
      throw new Error('Invalid file extensios.');
    }

    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const readCSVStream = fs.createReadStream(path);
    const parseStream = csvParser({
      from_line: 2,
    });
    const parseCSV = readCSVStream.pipe(parseStream);

    const csvTransactions: Array<CSVTransaction> = [];
    const csvCategories: Array<string> = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      csvTransactions.push({ title, type, value, category });
      csvCategories.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: { title: In(csvCategories) },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = csvCategories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = await categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    // todas as categorias juntas importadas no arquivo
    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      csvTransactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(async category => {
          await categoriesRepository.findOne({
            where: { title: category.title },
          });
        }),
      })),
    );

    await transactionRepository.save(createdTransactions);

    // Deletando o arquivo
    await fs.promises.unlink(path);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
