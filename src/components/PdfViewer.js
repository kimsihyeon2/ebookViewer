import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { useSwipeable } from 'react-swipeable';
import { useMediaQuery } from 'react-responsive';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useBooks } from '../contexts/BookContext';
import { useUser } from '../contexts/UserContext';
import './PdfViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const PdfViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBookInfo, loading: bookLoading, error: bookError } = useBooks();
  const { user } = useUser();
  const [book, setBook] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const isMobile = useMediaQuery({ maxWidth: 767 });

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        setError(null);
        const bookData = await getBookInfo(id);
        setBook(bookData);
        if (bookData.isPremium && !user.isPremium && !user.isAdmin) {
          navigate('/upgrade');
        }
      } catch (err) {
        console.error('Error fetching book:', err);
        setError('책 정보를 불러오는 데 실패했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id, getBookInfo, user, navigate]);

  useEffect(() => {
    if (book) {
      console.log('Current book:', book);
      console.log('Requesting file from:', book.file);
    }
  }, [book]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const newScale = containerRef.current.offsetWidth / 600;
        setScale(Math.min(newScale, 1.5));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setError(null);
  };

  const onLoadProgress = ({ loaded, total }) => {
    setLoadingProgress(Math.round((loaded / total) * 100));
  };

  const onDocumentLoadError = (error) => {
    console.error('Error while loading document:', error);
    console.error('Document source:', book?.file);
    setError('PDF 파일을 불러오는 데 실패했습니다. 다시 시도해주세요.');
  };

  const changePage = (offset) => {
    setPageNumber((prevPageNumber) => {
      const newPageNumber = prevPageNumber + offset;
      return newPageNumber > 0 && newPageNumber <= numPages ? newPageNumber : prevPageNumber;
    });
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => changePage(1),
    onSwipedRight: () => changePage(-1),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const rotate = (angle) => {
    setRotation((prevRotation) => (prevRotation + angle) % 360);
  };

  const documentOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
  }), []);

  if (loading || bookLoading) return <div className="text-center mt-8">책 정보를 불러오는 중입니다...</div>;
  if (error || bookError) return <div className="text-center mt-8 text-red-500">{error || bookError}</div>;
  if (!book) return <div className="text-center mt-8">책을 찾을 수 없습니다.</div>;

  return (
    <div className="pdf-viewer max-w-full mx-auto mt-4 p-4 bg-white rounded-lg shadow-xl" ref={containerRef} {...handlers}>
      <h2 className="text-xl font-bold mb-4">{book.title}</h2>
      {loadingProgress < 100 && (
        <div className="text-center my-4">
          PDF 로딩 중... {loadingProgress}%
        </div>
      )}
      <Document
        file={book.file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        onLoadProgress={onLoadProgress}
        options={documentOptions}
      >
        {numPages > 0 && (
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            scale={scale}
            rotate={rotation}
            width={containerRef.current?.offsetWidth}
          />
        )}
      </Document>
      {numPages > 0 && (
        <div className="controls mt-4">
          <div className="flex flex-wrap justify-center items-center mb-2 space-x-2 space-y-2">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="control-button bg-blue-500 text-white py-1 px-3 rounded text-sm disabled:opacity-50"
            >
              이전
            </button>
            <p className="text-sm">
              Page {pageNumber} of {numPages}
            </p>
            <button
              onClick={() => changePage(1)}
              disabled={pageNumber >= numPages}
              className="control-button bg-blue-500 text-white py-1 px-3 rounded text-sm disabled:opacity-50"
            >
              다음
            </button>
            <button onClick={() => setScale(scale + 0.1)} className="control-button bg-green-500 text-white py-1 px-2 rounded text-sm">
              확대
            </button>
            <button onClick={() => setScale(scale - 0.1)} className="control-button bg-green-500 text-white py-1 px-2 rounded text-sm">
              축소
            </button>
            <button onClick={() => rotate(90)} className="control-button bg-yellow-500 text-white py-1 px-2 rounded text-sm">
              회전
            </button>
          </div>
        </div>
      )}
      {isMobile && <p className="text-center mt-2 text-sm text-gray-600">페이지를 좌우로 스와이프하여 넘길 수 있습니다.</p>}
    </div>
  );
};

export default PdfViewer;
