'use client';

import { useState } from 'react';

interface HotelSearchResult {
  sabre_id: string | null;
  paragon_id: string | null;
  property_name_kor: string | null;
  property_name_eng: string | null;
}

interface ApiResponse {
  success: boolean;
  data?: HotelSearchResult[];
  error?: string;
  count?: number;
}

export default function HotelSearchTest() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searching_hotel_name: searchTerm
        }),
      });

      const data: ApiResponse = await response.json();

      if (!data.success) {
        setError(data.error || '검색 실패');
        return;
      }

      setResults(data.data || []);
      setCount(data.count || 0);

    } catch (err) {
      console.error('Search error:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">호텔 검색 API 테스트</h1>
      
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="호텔명을 입력하세요 (한글/영문)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {count > 0 && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg">
          총 {count}개의 호텔을 찾았습니다.
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((hotel, index) => (
            <div
              key={`${hotel.sabre_id}-${hotel.paragon_id}-${index}`}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {hotel.property_name_kor || '한글명 없음'}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {hotel.property_name_eng || '영문명 없음'}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  <p><strong>Sabre ID:</strong> {hotel.sabre_id || 'N/A'}</p>
                  <p><strong>Paragon ID:</strong> {hotel.paragon_id || 'N/A'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && count === 0 && searchTerm && !error && (
        <div className="p-4 bg-gray-100 border border-gray-300 text-gray-600 rounded-lg">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  );
}