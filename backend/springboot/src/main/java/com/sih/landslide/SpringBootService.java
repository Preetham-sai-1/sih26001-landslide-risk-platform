package com.sih.landslide;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

public class SpringBootService {

    private static final int PORT = 8080;
    private static final String FASTAPI_BASE = "http://localhost:8000/api/v1";
    private static final HttpClient httpClient = HttpClient.newHttpClient();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        server.createContext("/api/v1/spring/health", new HealthHandler());
        server.createContext("/api/v1/spring/zones", new ProxyHandler("/zones"));
        server.createContext("/api/v1/spring/ml/predict", new ProxyHandler("/ml/predict"));

        server.setExecutor(null);
        System.out.println("Spring Boot / Java Enterprise Gateway Service running on http://localhost:" + PORT);
        server.start();
    }

    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String json = """
                {
                  "service": "sih-landslide-springboot-backend",
                  "status": "UP",
                  "architecture": "React -> Spring Boot -> FastAPI -> ML/GIS Engine",
                  "port": 8080
                }
                """;
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    static class ProxyHandler implements HttpHandler {
        private final String targetPath;

        public ProxyHandler(String targetPath) {
            this.targetPath = targetPath;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String requestPath = exchange.getRequestURI().getPath();
            String query = exchange.getRequestURI().getRawQuery();

            String subPath = requestPath.replace("/api/v1/spring" + targetPath, "");
            String targetUrl = FASTAPI_BASE + targetPath + subPath + (query != null ? "?" + query : "");

            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(targetUrl))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                byte[] bytes = response.body().getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.sendResponseHeaders(response.statusCode(), bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            } catch (Exception e) {
                String fallback = """
                    {
                      "status": "OFFLINE_FALLBACK",
                      "service": "Spring Boot Proxy",
                      "error": "%s"
                    }
                    """.formatted(e.getMessage());
                byte[] bytes = fallback.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.sendResponseHeaders(503, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            }
        }
    }
}
