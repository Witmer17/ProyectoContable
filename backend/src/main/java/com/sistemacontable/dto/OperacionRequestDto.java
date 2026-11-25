package com.sistemacontable.dto;

import java.util.Map;

public class OperacionRequestDto {
    private String operacion;
    private Map<String, Object> datos;

    public OperacionRequestDto() {}

    public OperacionRequestDto(String operacion, Map<String, Object> datos) {
        this.operacion = operacion;
        this.datos = datos;
    }

    public String getOperacion() { return operacion; }
    public void setOperacion(String operacion) { this.operacion = operacion; }

    public Map<String, Object> getDatos() { return datos; }
    public void setDatos(Map<String, Object> datos) { this.datos = datos; }
}
