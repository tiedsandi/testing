package apperror

import (
	"net/http"
)

// AppError adalah custom error dengan status code
type AppError struct {
	StatusCode int    `json:"-"`
	Message    string `json:"message"`
	Code       string `json:"code"`
}

func (e *AppError) Error() string {
	return e.Message
}

// Constructor functions untuk berbagai jenis error

func NewBadRequestError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusBadRequest,
		Message:    message,
		Code:       "BAD_REQUEST",
	}
}

func NewNotFoundError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusNotFound,
		Message:    message,
		Code:       "NOT_FOUND",
	}
}

func NewInternalError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusInternalServerError,
		Message:    message,
		Code:       "INTERNAL_ERROR",
	}
}

func NewGoneError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusGone, // 410
		Message:    message,
		Code:       "GONE",
	}
}

func NewValidationError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusUnprocessableEntity, // 422
		Message:    message,
		Code:       "VALIDATION_ERROR",
	}
}

// ErrorResponse adalah struktur response error yang konsisten
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Code    string `json:"code"`
}

func NewErrorResponse(err error) ErrorResponse {
	if appErr, ok := err.(*AppError); ok {
		return ErrorResponse{
			Success: false,
			Error:   appErr.Message,
			Code:    appErr.Code,
		}
	}

	// Generic error
	return ErrorResponse{
		Success: false,
		Error:   err.Error(),
		Code:    "INTERNAL_ERROR",
	}
}

// GetStatusCode mendapatkan status code dari error
func GetStatusCode(err error) int {
	if appErr, ok := err.(*AppError); ok {
		return appErr.StatusCode
	}
	return http.StatusInternalServerError
}

// HandleError helper untuk handle error di handler
func HandleError(err error) (int, ErrorResponse) {
	statusCode := GetStatusCode(err)
	errResp := NewErrorResponse(err)
	return statusCode, errResp
}
