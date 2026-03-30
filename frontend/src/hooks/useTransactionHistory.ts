import { useState, useEffect, useCallback, useRef } from 'react';

export type TransactionType = 'create' | 'mint' | 'burn' | 'other';

export interface TransactionHistoryItem {
  id: string;
  type: TransactionType;
  token: string;
  amount: string;
  date: string;
  status: 'success' | 'failed';
  hash: string;
}

interface UseTransactionHistoryOptions {
  assetCodes?: string[];
  issuer?: string;
  contractIds?: string[];
  pageSize?: number;
}

export function useTransactionHistory(
  publicKey: string | undefined,
  options: UseTransactionHistoryOptions = {}
) {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const cacheRef = useRef<{ [key: string]: TransactionHistoryItem[] }>({});
  const debounceRef = useRef<number | null>(null);

  const pageSize = options.pageSize || 10;

  const fetchTransactions = useCallback(
    async (reset = false) => {
      if (!publicKey) return;
      setLoading(true);
      setError(null);
      try {
        const cacheKey = `${publicKey}-${page}`;
        if (cacheRef.current[cacheKey]) {
          setTransactions((prev: TransactionHistoryItem[]) =>
            reset ? cacheRef.current[cacheKey] : [...prev, ...cacheRef.current[cacheKey]]
          );
          setHasMore(cacheRef.current[cacheKey].length === pageSize);
          setLoading(false);
          return;
        }
        const url = `https://horizon.stellar.org/accounts/${publicKey}/operations?order=desc&limit=${pageSize}&cursor=`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch transactions');
        const data = await resp.json();
        const items: TransactionHistoryItem[] = (data._embedded?.records || [])
          .map((op: any) => parseOperation(op, options))
          .filter((item: TransactionHistoryItem | null) => item !== null);
        cacheRef.current[cacheKey] = items;
        setTransactions((prev: TransactionHistoryItem[]) => (reset ? items : [...prev, ...items]));
        setHasMore(items.length === pageSize);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [publicKey, page, pageSize, options]
  );

  // Debounce on publicKey change
  useEffect(() => {
    if (!publicKey) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setTransactions([]);
      fetchTransactions(true);
    }, 400);
    // eslint-disable-next-line
  }, [publicKey]);

  // Fetch on page change
  useEffect(() => {
    if (page === 1) return;
    fetchTransactions();
    // eslint-disable-next-line
  }, [page]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p: number) => p + 1);
  }, [loading, hasMore]);

  return { transactions, loading, error, hasMore, loadMore };
}

function parseOperation(op: any, options: UseTransactionHistoryOptions): TransactionHistoryItem | null {
  // Filter by operation type and asset/issuer/contract if provided
  // Token creation: manage_data or create_account or custom contract
  // Mint: payment or custom contract
  // Burn: payment with negative amount or custom contract
  // This logic may need to be adapted for your token factory specifics
  let type: TransactionType = 'other';
  let token = '';
  let amount = '';
  if (op.type === 'manage_data' && op.name && op.name.toLowerCase().includes('token')) {
    type = 'create';
    token = op.name;
  } else if (op.type === 'payment' && op.asset_code) {
    if (Number(op.amount) > 0) {
      type = 'mint';
      token = op.asset_code;
      amount = op.amount;
    } else if (Number(op.amount) < 0) {
      type = 'burn';
      token = op.asset_code;
      amount = op.amount;
    }
  } else if (op.type === 'change_trust' && op.asset_code) {
    type = 'create';
    token = op.asset_code;
  }
  // Optionally filter by assetCodes, issuer, contractIds
  if (options.assetCodes && token && !options.assetCodes.includes(token)) return null;
  if (options.issuer && op.asset_issuer && op.asset_issuer !== options.issuer) return null;
  // Add more contractId logic if needed
  if (type === 'other') return null;
  return {
    id: op.id,
    type,
    token,
    amount: amount || op.amount || '',
    date: op.created_at,
    status: op.transaction_successful ? 'success' : 'failed',
    hash: op.transaction_hash,
  };
}
