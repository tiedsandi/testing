// src/layouts/ErrorBoundary.tsx
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import type { ReactElement } from "react";

export default function ErrorBoundary() {
  const error = useRouteError();

  let errorContent: ReactElement;

  if (isRouteErrorResponse(error)) {
    // Error thrown by loader/action with Response object
    if (error.status === 404) {
      errorContent = (
        <>
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Recipe Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The recipe you're looking for doesn't exist or has been deleted.
          </p>
        </>
      );
    } else {
      errorContent = (
        <>
          <h1 className="text-6xl font-bold text-gray-800 mb-4">
            {error.status}
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            {error.statusText}
          </h2>
          <p className="text-gray-600 mb-8">
            {error.data || "An unexpected error occurred."}
          </p>
        </>
      );
    }
  } else if (error instanceof Error) {
    // JavaScript Error
    errorContent = (
      <>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">Oops!</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Something Went Wrong
        </h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <details className="text-left max-w-2xl mx-auto">
          <summary className="cursor-pointer text-sm text-gray-500 mb-2">
            Technical Details
          </summary>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
            {error.stack}
          </pre>
        </details>
      </>
    );
  } else {
    // Unknown error
    errorContent = (
      <>
        <h1 className="text-6xl font-bold text-gray-800 mb-4">Oops!</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          An Unexpected Error Occurred
        </h2>
        <p className="text-gray-600 mb-8">
          We're sorry, but something went wrong. Please try again later.
        </p>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {errorContent}
        <div className="flex gap-4 justify-center mt-8">
          <Link
            to="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            to="/recipes"
            className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
          >
            View All Recipes
          </Link>
        </div>
      </div>
    </div>
  );
}
