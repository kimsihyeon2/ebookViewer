import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 성능 측정을 위한 웹 바이탈 보고
reportWebVitals();

// 서비스 워커 등록 부분 주석 처리
// serviceWorkerRegistration.register({
//   onUpdate: (registration) => {
//     const waitingServiceWorker = registration.waiting;
//     if (waitingServiceWorker) {
//       waitingServiceWorker.addEventListener("statechange", event => {
//         if (event.target.state === "activated") {
//           alert('New version available. Please refresh the page to update.');
//         }
//       });
//       waitingServiceWorker.postMessage({ type: "SKIP_WAITING" });
//     }
//   },
//   onSuccess: (registration) => {
//     console.log('Service Worker registration successful with scope: ', registration.scope);
//   },
// });

// 에러 핸들링
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

// 비동기 에러 핸들링
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});