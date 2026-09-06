package com.sih.landslide.dto;

import java.time.Instant;
import java.util.UUID;

public class ApiResponseDTO<T> {

    private boolean success;
    private T data;
    private ApiErrorDetails error;
    private String timestamp = Instant.now().toString();
    private String requestId = UUID.randomUUID().toString();

    public ApiResponseDTO() {}

    public static <T> ApiResponseDTO<T> ok(T data) {
        ApiResponseDTO<T> resp = new ApiResponseDTO<>();
        resp.setSuccess(true);
        resp.setData(data);
        return resp;
    }

    public static <T> ApiResponseDTO<T> fail(String code, String message) {
        ApiResponseDTO<T> resp = new ApiResponseDTO<>();
        resp.setSuccess(false);
        resp.setError(new ApiErrorDetails(code, message));
        return resp;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public T getData() { return data; }
    public void setData(T data) { this.data = data; }

    public ApiErrorDetails getError() { return error; }
    public void setError(ApiErrorDetails error) { this.error = error; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public static class ApiErrorDetails {
        private String code;
        private String message;

        public ApiErrorDetails() {}
        public ApiErrorDetails(String code, String message) {
            this.code = code;
            this.message = message;
        }

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}
