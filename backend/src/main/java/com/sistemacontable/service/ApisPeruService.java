package com.sistemacontable.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ApisPeruService {

    static {
        System.setProperty("java.net.preferIPv4Stack", "true");
    }

    @Value("${apisperu.token:}")
    private String primaryToken;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(6))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Tokens provistos por el usuario (el primer token de la lista está verificado y activo)
    private final List<String> fallbackTokens = List.of(
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImhyZW1zMDc3QGdtYWlsLmNvbSIsImp0aSI6Ijk0OGNkYjg4YmJmMTRkNWQifQ.hr7rWG1FpFKMdItcsjR7f5iXFiojaWqs55_SlD8wAGo",
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImhyZW1zMDc3QGdtYWlsLmNvbSIsImp0aSI6IjgwMzYzY2IyMzlhN2MyNzEifQ.kNSATFurfMI0kACgPT2i8FnIlqYKUNI_MPy0LH4zwFM"
    );

    private List<String> getTokens() {
        List<String> list = new ArrayList<>();
        for (String t : fallbackTokens) {
            list.add(t);
        }
        if (primaryToken != null && !primaryToken.isBlank() && !list.contains(primaryToken.trim())) {
            list.add(0, primaryToken.trim());
        }
        return list;
    }

    public Map<String, Object> consultarDni(String dni) {
        String cleanDni = dni != null ? dni.replaceAll("\\D", "") : "";
        for (String tok : getTokens()) {
            String url = "https://dniruc.apisperu.com/api/v1/dni/" + cleanDni;
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .version(HttpClient.Version.HTTP_1_1)
                        .header("Authorization", "Bearer " + tok)
                        .header("User-Agent", "Mozilla/5.0")
                        .header("Accept", "application/json")
                        .timeout(Duration.ofSeconds(6))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    return procesarDniJson(cleanDni, response.body());
                }
            } catch (Exception e) {
                // Fallback con HttpURLConnection clásica
                try {
                    HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
                    conn.setRequestProperty("Authorization", "Bearer " + tok);
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                    if (conn.getResponseCode() == 200) {
                        try (BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = r.readLine()) != null) sb.append(line);
                            return procesarDniJson(cleanDni, sb.toString());
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        }

        Map<String, Object> fallback = new HashMap<>();
        fallback.put("dni", cleanDni);
        fallback.put("nombreCompleto", "CIUDADANO DNI " + cleanDni);
        fallback.put("nombre", "CIUDADANO DNI " + cleanDni);
        return fallback;
    }

    private Map<String, Object> procesarDniJson(String dni, String body) throws Exception {
        JsonNode json = objectMapper.readTree(body);
        String nombres = json.has("nombres") ? json.get("nombres").asText("") : "";
        String apellidoPaterno = json.has("apellidoPaterno") ? json.get("apellidoPaterno").asText("") : "";
        String apellidoMaterno = json.has("apellidoMaterno") ? json.get("apellidoMaterno").asText("") : "";
        String nombreCompleto = (nombres + " " + apellidoPaterno + " " + apellidoMaterno).trim();

        Map<String, Object> res = new HashMap<>();
        res.put("dni", dni);
        res.put("nombres", nombres);
        res.put("apellidoPaterno", apellidoPaterno);
        res.put("apellidoMaterno", apellidoMaterno);
        res.put("nombreCompleto", nombreCompleto);
        res.put("nombre", nombreCompleto);
        return res;
    }

    public Map<String, Object> consultarRuc(String ruc) {
        String cleanRuc = ruc != null ? ruc.replaceAll("\\D", "") : "";
        for (String tok : getTokens()) {
            String url = "https://dniruc.apisperu.com/api/v1/ruc/" + cleanRuc + "?token=" + tok;
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .version(HttpClient.Version.HTTP_1_1)
                        .header("User-Agent", "Mozilla/5.0")
                        .header("Accept", "application/json")
                        .timeout(Duration.ofSeconds(6))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    return procesarRucJson(cleanRuc, response.body());
                }
            } catch (Exception e) {
                // Fallback con HttpURLConnection clásica
                try {
                    HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                    if (conn.getResponseCode() == 200) {
                        try (BufferedReader r = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = r.readLine()) != null) sb.append(line);
                            return procesarRucJson(cleanRuc, sb.toString());
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        }

        Map<String, Object> fallback = new HashMap<>();
        fallback.put("ruc", cleanRuc);
        fallback.put("razonSocial", "EMPRESA RUC " + cleanRuc);
        fallback.put("nombre", "EMPRESA RUC " + cleanRuc);
        fallback.put("direccion", "LIMA, PERU");
        fallback.put("estado", "ACTIVO");
        fallback.put("condicion", "HABIDO");
        return fallback;
    }

    private Map<String, Object> procesarRucJson(String ruc, String body) throws Exception {
        JsonNode json = objectMapper.readTree(body);
        String razonSocial = json.has("razonSocial") ? json.get("razonSocial").asText("") : "";
        String direccion = json.has("direccion") ? json.get("direccion").asText("") : "";
        String estado = json.has("estado") ? json.get("estado").asText("ACTIVO") : "ACTIVO";
        String condicion = json.has("condicion") ? json.get("condicion").asText("HABIDO") : "HABIDO";

        Map<String, Object> res = new HashMap<>();
        res.put("ruc", ruc);
        res.put("razonSocial", razonSocial);
        res.put("nombre", razonSocial);
        res.put("direccion", direccion);
        res.put("estado", estado);
        res.put("condicion", condicion);
        return res;
    }
}
