import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastContainer } from './components/Toast';
import { ExampleComponent } from './examples/ExampleComponent';
import './components/ErrorBoundary.css';

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <div className="app">
          <h1>Error Handling Test App</h1>
          <ExampleComponent />
        </div>
        <ToastContainer />
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
