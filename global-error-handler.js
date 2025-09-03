// Global Email Validation Error Handler
// Include this script in all HTML pages to handle email validation errors

(function() {
    'use strict';
    
    // Check for stored email validation errors and handle them
    function handleStoredEmailValidationError() {
        const storedError = sessionStorage.getItem('emailValidationError');
        if (storedError) {
            sessionStorage.removeItem('emailValidationError');
            
            // If we're not on index.html, redirect there
            const currentPath = window.location.pathname;
            if (!currentPath.endsWith('index.html') && !currentPath.endsWith('/') && currentPath !== '/') {
                window.location.href = 'index.html';
                return;
            }
            
            // If we're on index.html, show the error after a brief delay
            setTimeout(() => {
                if (typeof handleEmailValidationError === 'function') {
                    handleEmailValidationError(storedError);
                } else {
                    // Fallback if the main function isn't available
                    alert('Email Error: ' + storedError);
                }
            }, 1000);
        }
    }
    
    // Store email validation error for cross-page handling
    window.storeEmailValidationError = function(errorMessage) {
        sessionStorage.setItem('emailValidationError', errorMessage);
    };
    
    // Check for errors when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleStoredEmailValidationError);
    } else {
        handleStoredEmailValidationError();
    }
})();
