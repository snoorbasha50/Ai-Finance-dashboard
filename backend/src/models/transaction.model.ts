import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'credit' | 'debit';
export type TransactionSource = 'upload' | 'kafka' | 'manual';
export type TransactionCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Utilities'
  | 'Healthcare'
  | 'Income'
  | 'Investment'
  | 'Education'
  | 'Other';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  id: string;
  date: Date;
  description: string;
  cleanDescription: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  source: TransactionSource;
  month: number;
  year: number;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    id: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    cleanDescription: { type: String, default: '' },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: {
      type: String,
      enum: [
        'Food & Dining',
        'Transport',
        'Shopping',
        'Entertainment',
        'Utilities',
        'Healthcare',
        'Income',
        'Investment',
        'Education',
        'Other',
      ],
      default: 'Other',
    },
    source: {
      type: String,
      enum: ['upload', 'kafka', 'manual'],
      default: 'manual',
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, month: 1, year: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
