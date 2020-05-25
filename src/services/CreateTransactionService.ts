import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import CreateCategoryService from './CreateCategoryService';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category: categoryTitle,
  }: Request): Promise<Transaction> {
    // Repositório padrão de categoria
    const categoryRepository = getRepository(Category);

    // Service de categoria
    const categoryService = new CreateCategoryService();

    // Repositório custom de Transação
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const balance = await transactionRepository.getBalance();

    // Verificando se o tipo de transação é de entrada ou saída
    if (type !== 'income' && type !== 'outcome')
      throw new AppError('Invalid type of transaction.');

    // Verificando se há dinheiro para um gasto
    if (type === 'outcome' && value > balance.total)
      throw new AppError(
        'Transfers must have value greater than your balance.',
      );

    const checkIfCategoryExists = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });

    // Verificando se a categoria buscada pelo titulo existe
    // Caso a mesma exista não será criada uma nova e retornará uma nova transação
    // Caso não exista uma nova transação será criada e retornará uma nova transação
    if (!checkIfCategoryExists) {
      const category = await categoryService.execute({ title: categoryTitle });
      const transaction = transactionRepository.create({
        title,
        type,
        value,
        category,
      });
      await transactionRepository.save(transaction);
      return transaction;
    }

    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category: checkIfCategoryExists,
    });
    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
