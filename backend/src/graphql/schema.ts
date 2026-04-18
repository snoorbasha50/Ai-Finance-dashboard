export const schema = `
  type Transaction {
    id: String!
    userId: String!
    date: String!
    description: String!
    cleanDescription: String!
    amount: Float!
    type: String!
    category: String!
    source: String!
    month: Int!
    year: Int!
  }

  type CategoryBreakdown {
    category: String!
    amount: Float!
  }

  type Summary {
    totalIncome: Float!
    totalExpense: Float!
    netSavings: Float!
    transactionCount: Int!
    categoryBreakdown: [CategoryBreakdown!]!
  }

  type MonthlyData {
    month: String!
    income: Float!
    expense: Float!
  }

  type TransactionPage {
    data: [Transaction!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  type Query {
    transactions(page: Int, limit: Int, category: String, type: String): TransactionPage!
    summary: Summary!
    monthlyBreakdown: [MonthlyData!]!
  }
`;
