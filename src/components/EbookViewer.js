import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const EbookViewer = () => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);

  const pdfUrl = "/sample.pdf"; // PDF 파일을 public 폴더에 저장하고 이렇게 참조합니다.

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    setError(`PDF 파일을 로드하는 중 오류가 발생했습니다: ${error.message}`);
    setLoading(false);
  }, []);

  const onLoadProgress = useCallback(({ loaded, total }) => {
    setLoadingProgress(Math.round((loaded / total) * 100));
  }, []);

  const changePage = useCallback((offset) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return newPageNumber > 0 && newPageNumber <= numPages ? newPageNumber : prevPageNumber;
    });
  }, [numPages]);

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const documentOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h1 className="text-2xl font-bold mb-4">PDF eBook 뷰어</h1>
      {loading && (
        <div className="text-center mt-4">
          Loading PDF... {loadingProgress}%
        </div>
      )}
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        onLoadProgress={onLoadProgress}
        options={documentOptions}
        className="flex justify-center"
      >
        {!loading && (
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false}
            className="border"
          />
        )}
      </Document>
      {!loading && (
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            이전
          </button>
          <p>
            Page {pageNumber} of {numPages}
          </p>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default EbookViewer;
